// PayPay 動的QRコード決済（店頭）のためのユーティリティ。
// 当システム内では camelCase・円単位のシンプルな形に正規化して扱う。
//
// 【2026-08: 公式Node SDK直呼び → Xserver中継経由に変更】
// PayPay本番APIは「PayPay for Businessに登録した固定IPからのみ」呼び出しを許可する
// （サンドボックスにはこの制限が無い）。VercelはIPを固定できないため、本番キーに切り替えると
// Vercelからの直接呼び出しは必ず UNAUTHORIZED(08100016) で失敗する。したがって店頭QRも
// EC決済と同じく、固定IPを持つXserver上の中継スクリプト（xserver-relay/paypay-relay.php）を
// 経由して呼び出す。HTTP部分の実装は src/lib/paypayRelay.ts に共通化してある。
//
// この変更により、Vercel側にPayPayの認証情報（PAYPAY_API_KEY / PAYPAY_API_SECRET /
// PAYPAY_MERCHANT_ID / PAYPAY_ENVIRONMENT）を置く必要は無くなった。サンドボックスと本番の
// 切り替えはXserver側 config.php の PAYPAY_ENV で行う。

import { assertRelaySuccess, callRelay } from '@/lib/paypayRelay';
import {
  getPaymentStatus,
  refundPayment,
  type PayPayWebPaymentStatus,
} from '@/lib/paypayWebClient';

/** PayPay Dynamic QR Code の決済ステータス（GetCodePaymentDetailsが返す値） */
export type PayPayQrStatus = PayPayWebPaymentStatus;

interface PayPayQrCodeCreateData {
  codeId?: string;
  url?: string;
  deeplink?: string;
  expiryDate?: number;
  merchantPaymentId?: string;
}

/**
 * 店頭用の金額付き動的QRコードを発行する（PayPay QRCodeCreate）。
 * merchantPaymentId には呼び出し側で inStoreCharge の _id を渡す想定。
 * 店頭決済のため redirectUrl は渡さない（中継側は redirectUrl が無い場合、
 * redirectUrl / redirectType を含めずにPayPayを呼ぶ）。
 */
export async function createDynamicQr({
  merchantPaymentId,
  amountJpy,
  orderDescription,
  orderItems,
}: {
  merchantPaymentId: string;
  amountJpy: number;
  orderDescription?: string;
  // 明細（商品名・数量・単価）。指定するとお客様のPayPayアプリの支払い明細に商品名が表示される。
  // 品名が長すぎるとPayPayに弾かれるため、30文字への丸めは中継スクリプト側で行っている。
  orderItems?: Array<{ name: string; quantity: number; unitPriceJpy: number }>;
}): Promise<{ codeId: string; url: string; deeplink: string; expiryDate?: number }> {
  const response = await callRelay<PayPayQrCodeCreateData>('create', 'POST', {
    body: {
      merchantPaymentId,
      amount: Math.round(amountJpy),
      orderDescription,
      orderItems,
    },
  });

  assertRelaySuccess(response.resultInfo, 'QRコード作成');

  const data = response.data;
  if (!data?.codeId || !data.url) {
    throw new Error('PayPay QRコード作成: レスポンスにcodeIdまたはurlが含まれていません');
  }

  return {
    codeId: data.codeId,
    url: data.url,
    deeplink: data.deeplink || '',
    expiryDate: data.expiryDate,
  };
}

/**
 * 動的QRコードの決済状況を取得する（PayPay GetCodePaymentDetails）。
 * QRがまだ読み取られていない場合に `DYNAMIC_QR_PAYMENT_NOT_FOUND` を未決済（CREATED）として扱う
 * 挙動も含め、EC決済（src/lib/paypayWebClient.ts）と同一のAPI・同一の扱いのため委譲する。
 */
export async function getQrPaymentStatus(
  merchantPaymentId: string
): Promise<{ status: PayPayQrStatus; amountJpy?: number; paymentId?: string }> {
  return getPaymentStatus(merchantPaymentId);
}

/**
 * 未決済の動的QRコードを削除する（PayPay QRCodeDelete）。
 * 支払い済み（DYNAMIC_QR_ALREADY_PAID）の場合も含め、失敗しても呼び出し側でベストエフォート扱いにできるようthrowする。
 */
export async function cancelDynamicQr(codeId: string): Promise<void> {
  const response = await callRelay<null>('delete', 'POST', {
    body: { codeId },
  });

  assertRelaySuccess(response.resultInfo, 'QRコード削除');
}

/**
 * 支払い済みのQR決済を返金する（PayPay PaymentRefund）。
 * PayPayは返金専用のID発行APIを持たないため、merchantRefundId（呼び出し側で生成したUUID）を
 * そのまま当システム内の返金IDとして扱う。EC決済と同一のAPIのため委譲する。
 */
export async function refundQrPayment({
  merchantRefundId,
  paymentId,
  amountJpy,
}: {
  merchantRefundId: string;
  paymentId: string;
  amountJpy: number;
}): Promise<{ refundId: string; status?: string }> {
  return refundPayment({ merchantRefundId, paymentId, amountJpy });
}
