// PayPay 動的QRコード決済（店頭）のためのユーティリティ。
// 公式SDK（@paypayopa/paypayopa-sdk-node）をラップし、当システム内では camelCase・円単位の
// シンプルな形に正規化して扱う。
//
// 注意: `PAYPAY_API_KEY` などの環境変数は「実際にPayPay APIを呼び出す瞬間」まで参照しない
// （src/lib/mailer.ts の遅延初期化パターンを踏襲）。こうすることで、環境変数未設定の環境でも
// ビルドや他のAPI・画面の動作に影響を与えない。
//
// SDKの型定義（dist/index.d.ts）は各メソッドの payload/戻り値が `any` のため、
// このファイルでは PayPay の公式APIドキュメント（Dynamic QR Code）に基づいて
// レスポンス形状をローカルに型付けしている。実際のフィールド名が異なっていた場合は
// 呼び出し側でエラーとして検知できるよう、必須フィールドの欠落はthrowする。

import PAYPAY from '@paypayopa/paypayopa-sdk-node';

/** PayPay Dynamic QR Code の決済ステータス（GetCodePaymentDetailsが返す値） */
export type PayPayQrStatus =
  | 'CREATED'
  | 'AUTHORIZED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED'
  | 'EXPIRED';

interface PayPayResultInfo {
  code: string;
  message?: string;
  codeId?: string;
}

// PayPay SDKの各メソッドは `{ STATUS, BODY: { resultInfo, data } }` 形式で返す
// （SDK README: `const body = response.BODY; console.log(body.resultInfo.code)`）
interface PayPaySdkResponse<T> {
  STATUS: number;
  BODY: {
    resultInfo: PayPayResultInfo;
    data: T | null;
  };
}

interface PayPayMoney {
  amount?: number;
  currency?: string;
}

interface PayPayQrCodeCreateData {
  codeId?: string;
  url?: string;
  deeplink?: string;
  expiryDate?: number;
  merchantPaymentId?: string;
}

interface PayPayCodePaymentDetailsData {
  status?: string;
  paymentId?: string;
  merchantPaymentId?: string;
  amount?: PayPayMoney;
}

interface PayPayRefundData {
  status?: string;
  merchantRefundId?: string;
  paymentId?: string;
}

let isConfigured = false;

/**
 * SDKの Configure() を初回利用時にだけ実行する。
 * 必須の環境変数が未設定の場合は明確なエラーを投げる（呼び出し元でハンドリングすること）。
 */
function ensureConfigured(): void {
  if (isConfigured) return;

  const apiKey = process.env.PAYPAY_API_KEY;
  const apiSecret = process.env.PAYPAY_API_SECRET;
  const merchantId = process.env.PAYPAY_MERCHANT_ID;

  if (!apiKey || !apiSecret || !merchantId) {
    throw new Error(
      'PayPay API設定（PAYPAY_API_KEY / PAYPAY_API_SECRET / PAYPAY_MERCHANT_ID）が未設定のため、PayPay決済は利用できません'
    );
  }

  const isProduction = process.env.PAYPAY_ENVIRONMENT === 'production';

  PAYPAY.Configure({
    clientId: apiKey,
    clientSecret: apiSecret,
    merchantId,
    productionMode: isProduction,
    env: isProduction ? 'PROD' : 'STAGING',
  });

  isConfigured = true;
}

function assertSuccess(resultInfo: PayPayResultInfo, action: string): void {
  if (resultInfo.code !== 'SUCCESS') {
    throw new Error(`PayPay ${action}に失敗しました: ${resultInfo.message || resultInfo.code}`);
  }
}

/**
 * 店頭用の金額付き動的QRコードを発行する（PayPay QRCodeCreate）。
 * merchantPaymentId には呼び出し側で inStoreCharge の _id を渡す想定。
 * 店頭決済のため redirectUrl / redirectType は指定しない。
 */
export async function createDynamicQr({
  merchantPaymentId,
  amountJpy,
  orderDescription,
}: {
  merchantPaymentId: string;
  amountJpy: number;
  orderDescription?: string;
}): Promise<{ codeId: string; url: string; deeplink: string; expiryDate?: number }> {
  ensureConfigured();

  const response = (await PAYPAY.QRCodeCreate({
    merchantPaymentId,
    amount: {
      amount: Math.round(amountJpy),
      currency: 'JPY',
    },
    codeType: 'ORDER_QR',
    orderDescription,
    isAuthorization: false,
  })) as PayPaySdkResponse<PayPayQrCodeCreateData>;

  assertSuccess(response.BODY.resultInfo, 'QRコード作成');

  const data = response.BODY.data;
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
 * QRがまだ読み取られていない場合、SDKが `DYNAMIC_QR_PAYMENT_NOT_FOUND` 系のエラーを
 * 返す実装もあるため、その場合は例外にせず未決済（CREATED）として扱う。
 */
export async function getQrPaymentStatus(
  merchantPaymentId: string
): Promise<{ status: PayPayQrStatus; amountJpy?: number; paymentId?: string }> {
  ensureConfigured();

  const response = (await PAYPAY.GetCodePaymentDetails([
    merchantPaymentId,
  ])) as PayPaySdkResponse<PayPayCodePaymentDetailsData>;

  const resultCode = response.BODY.resultInfo.code;
  if (resultCode !== 'SUCCESS') {
    // 決済がまだ発生していない（=誰も支払っていない）ケースをpending扱いにする
    if (resultCode === 'DYNAMIC_QR_PAYMENT_NOT_FOUND') {
      return { status: 'CREATED' };
    }
    throw new Error(`PayPay決済状況の取得に失敗しました: ${response.BODY.resultInfo.message || resultCode}`);
  }

  const data = response.BODY.data;
  const status = (data?.status as PayPayQrStatus | undefined) || 'CREATED';

  return {
    status,
    amountJpy: data?.amount?.amount,
    paymentId: data?.paymentId,
  };
}

/**
 * 未決済の動的QRコードを削除する（PayPay QRCodeDelete）。
 * 支払い済み（DYNAMIC_QR_ALREADY_PAID）の場合も含め、失敗しても呼び出し側でベストエフォート扱いにできるようthrowする。
 */
export async function cancelDynamicQr(codeId: string): Promise<void> {
  ensureConfigured();

  const response = (await PAYPAY.QRCodeDelete([codeId])) as PayPaySdkResponse<null>;
  assertSuccess(response.BODY.resultInfo, 'QRコード削除');
}

/**
 * 支払い済みのQR決済を返金する（PayPay PaymentRefund）。
 * PayPayは返金専用のID発行APIを持たないため、merchantRefundId（呼び出し側で生成したUUID）を
 * そのまま当システム内の返金IDとして扱う。
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
  ensureConfigured();

  const response = (await PAYPAY.PaymentRefund({
    merchantRefundId,
    paymentId,
    amount: {
      amount: Math.round(amountJpy),
      currency: 'JPY',
    },
  })) as PayPaySdkResponse<PayPayRefundData>;

  assertSuccess(response.BODY.resultInfo, '返金');

  return {
    refundId: merchantRefundId,
    status: response.BODY.data?.status,
  };
}
