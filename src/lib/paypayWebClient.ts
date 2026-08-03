// PayPay ウェブ決済（EC）のクライアント。
//
// PayPay本番APIは固定IPからのみ許可されるため、Vercel（本アプリ）からPayPayを直接呼ばず、
// 固定IPを持つXserver上の中継スクリプト（xserver-relay/paypay-relay.php）経由で呼び出す。
// HTTP部分の実装は店頭QR決済（src/lib/paypay.ts）と共通で、src/lib/paypayRelay.ts にある。
//
// removable設計の要: 環境変数 PAYPAY_RELAY_URL / PAYPAY_RELAY_SECRET が揃っていない場合は
// 「PayPay決済は未設定」として明確にthrowする（呼び出し元のAPIルートはこれを検知して
// 503を返し、他の決済手段には一切影響させない）。isPaypayConfigured() で事前判定できる。

import {
  assertRelaySuccess,
  callRelay,
  isPaypayRelayConfigured,
  type PayPayMoney,
} from '@/lib/paypayRelay';

/** PayPay Web決済（Dynamic QR + redirectType: WEB_LINK）の決済ステータス（GetCodePaymentDetailsが返す値） */
export type PayPayWebPaymentStatus =
  | 'CREATED'
  | 'AUTHORIZED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED'
  | 'EXPIRED';

interface CreateWebPaymentData {
  codeId?: string;
  url?: string;
  deeplink?: string;
  expiryDate?: number;
  merchantPaymentId?: string;
}

interface PaymentStatusData {
  status?: string;
  paymentId?: string;
  merchantPaymentId?: string;
  amount?: PayPayMoney;
}

interface RefundData {
  status?: string;
  merchantRefundId?: string;
  paymentId?: string;
}

/**
 * PayPayウェブ決済が利用できる状態か（Xserver中継のURL・共有シークレットが両方設定されているか）を返す。
 * removable設計の要: これがfalseの間はAPIルート側で503を返し、チェックアウトのPayPay選択肢も
 * NEXT_PUBLIC_PAYPAY_ENABLED フラグ側で隠す。
 */
export function isPaypayConfigured(): boolean {
  return isPaypayRelayConfigured();
}

/**
 * PayPayウェブ決済用の支払いURLを発行する（PayPay QRCodeCreate + redirectType: WEB_LINK）。
 * merchantPaymentId には呼び出し側で注文番号（orderNumber）を渡す想定。
 */
export async function createWebPayment({
  merchantPaymentId,
  amountJpy,
  orderDescription,
  orderItems,
  redirectUrl,
}: {
  merchantPaymentId: string;
  amountJpy: number;
  orderDescription?: string;
  orderItems?: Array<{ name: string; quantity: number; unitPriceJpy: number }>;
  redirectUrl: string;
}): Promise<{ paymentUrl: string; codeId: string; deeplink: string; expiryDate?: number }> {
  const response = await callRelay<CreateWebPaymentData>('create', 'POST', {
    body: {
      merchantPaymentId,
      amount: Math.round(amountJpy),
      orderDescription,
      orderItems,
      redirectUrl,
    },
  });

  assertRelaySuccess(response.resultInfo, 'ウェブ決済作成');

  const data = response.data;
  if (!data?.url || !data.codeId) {
    throw new Error('PayPayウェブ決済作成: レスポンスにurlまたはcodeIdが含まれていません');
  }

  return {
    paymentUrl: data.url,
    codeId: data.codeId,
    deeplink: data.deeplink || '',
    expiryDate: data.expiryDate,
  };
}

/**
 * PayPayウェブ決済の決済状況を取得する（PayPay GetCodePaymentDetails）。
 * 決済がまだ行われていない場合、PayPayが `DYNAMIC_QR_PAYMENT_NOT_FOUND` 系のエラーを
 * 返すことがあるため、その場合は例外にせず未決済（CREATED）として扱う
 * （店頭QR決済 src/lib/paypay.ts の既存方針を踏襲）。
 */
export async function getPaymentStatus(
  merchantPaymentId: string
): Promise<{ status: PayPayWebPaymentStatus; amountJpy?: number; paymentId?: string }> {
  const response = await callRelay<PaymentStatusData>('status', 'GET', {
    query: { merchantPaymentId },
  });

  const resultCode = response.resultInfo?.code;
  if (resultCode !== 'SUCCESS') {
    if (resultCode === 'DYNAMIC_QR_PAYMENT_NOT_FOUND') {
      return { status: 'CREATED' };
    }
    throw new Error(`PayPay決済状況の取得に失敗しました: ${response.resultInfo?.message || resultCode}`);
  }

  const data = response.data;
  const status = (data?.status as PayPayWebPaymentStatus | undefined) || 'CREATED';

  return {
    status,
    amountJpy: data?.amount?.amount,
    paymentId: data?.paymentId,
  };
}

/**
 * 支払い済みのPayPayウェブ決済を返金する（PayPay PaymentRefund）。
 * PayPayは返金専用のID発行APIを持たないため、merchantRefundId（呼び出し側で生成したUUID）を
 * そのまま当システム内の返金IDとして扱う（店頭QR決済 src/lib/paypay.ts と同じ方針）。
 */
export async function refundPayment({
  merchantRefundId,
  paymentId,
  amountJpy,
}: {
  merchantRefundId: string;
  paymentId: string;
  amountJpy: number;
}): Promise<{ refundId: string; status?: string }> {
  const response = await callRelay<RefundData>('refund', 'POST', {
    body: {
      merchantRefundId,
      paymentId,
      amount: Math.round(amountJpy),
    },
  });

  assertRelaySuccess(response.resultInfo, '返金');

  return {
    refundId: merchantRefundId,
    status: response.data?.status,
  };
}
