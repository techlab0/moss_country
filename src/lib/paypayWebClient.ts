// PayPay ウェブ決済（EC）のための中継クライアント。
//
// PayPay本番APIは固定IPからのみ許可されるため、Vercel（本アプリ）からPayPayを直接呼ばず、
// 固定IPを持つXserver上の中継スクリプト（xserver-relay/paypay-relay.php）を
// 共有シークレット（X-Relay-Secretヘッダー）経由で呼び出す。PayPayのAPIキー・シークレット・
// 加盟店IDはXserver側にのみ置き、Vercel側（このファイル・環境変数）は一切保持しない。
//
// removable設計の要: 環境変数 PAYPAY_RELAY_URL / PAYPAY_RELAY_SECRET が揃っていない場合は
// 「PayPay決済は未設定」として明確にthrowする（呼び出し元のAPIルートはこれを検知して
// 503を返し、他の決済手段には一切影響させない）。isPaypayConfigured() で事前判定できる。

interface PayPayResultInfo {
  code: string;
  message?: string;
  codeId?: string;
}

// 中継スクリプト（paypay-relay.php）はPayPay APIのレスポンスJSON（{resultInfo, data}）を
// そのまま横流しする。中継自体のエラー（403認証エラー・400バリデーション等）は
// resultInfoを含まない { error: string } 形なので、callRelay側で区別する。
interface PayPayRelayResponse<T> {
  resultInfo: PayPayResultInfo;
  data?: T | null;
}

interface PayPayMoney {
  amount?: number;
  currency?: string;
}

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

function getRelayConfig(): { url: string; secret: string } | null {
  const url = process.env.PAYPAY_RELAY_URL;
  const secret = process.env.PAYPAY_RELAY_SECRET;
  if (!url || !secret) {
    return null;
  }
  return { url, secret };
}

/**
 * PayPayウェブ決済が利用できる状態か（Xserver中継のURL・共有シークレットが両方設定されているか）を返す。
 * removable設計の要: これがfalseの間はAPIルート側で503を返し、チェックアウトのPayPay選択肢も
 * NEXT_PUBLIC_PAYPAY_ENABLED フラグ側で隠す。
 */
export function isPaypayConfigured(): boolean {
  return getRelayConfig() !== null;
}

function requireRelayConfig(): { url: string; secret: string } {
  const config = getRelayConfig();
  if (!config) {
    throw new Error('PayPay決済は未設定です（PAYPAY_RELAY_URL / PAYPAY_RELAY_SECRET が必要です）');
  }
  return config;
}

async function callRelay<T>(
  action: 'create' | 'status' | 'refund',
  method: 'GET' | 'POST',
  options: { query?: Record<string, string>; body?: unknown }
): Promise<PayPayRelayResponse<T>> {
  const { url, secret } = requireRelayConfig();

  const target = new URL(url);
  target.searchParams.set('action', action);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      target.searchParams.set(key, value);
    }
  }

  let response: Response;
  try {
    response = await fetch(target.toString(), {
      method,
      headers: {
        'X-Relay-Secret': secret,
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      body: method === 'POST' ? JSON.stringify(options.body ?? {}) : undefined,
      cache: 'no-store',
    });
  } catch (error) {
    throw new Error(`PayPay中継（Xserver）への接続に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`PayPay中継からのレスポンスをJSONとして解析できませんでした（HTTP ${response.status}）`);
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`PayPay中継から不正なレスポンスを受け取りました（HTTP ${response.status}）`);
  }

  const parsedObj = parsed as Record<string, unknown>;
  // 中継スクリプト自体のエラー（403認証エラー・400バリデーション・500設定不備等）は
  // resultInfoを含まない { error, message? } 形で返る。PayPay自体のエラーはresultInfoを含むため、
  // resultInfoの有無で区別する。
  if (!('resultInfo' in parsedObj)) {
    const message = (parsedObj.message as string | undefined) || (parsedObj.error as string | undefined);
    throw new Error(`PayPay中継エラー（HTTP ${response.status}）: ${message || '不明なエラー'}`);
  }

  return parsedObj as unknown as PayPayRelayResponse<T>;
}

function assertSuccess(resultInfo: PayPayResultInfo | undefined, action: string): void {
  if (!resultInfo || resultInfo.code !== 'SUCCESS') {
    throw new Error(`PayPay ${action}に失敗しました: ${resultInfo?.message || resultInfo?.code || '不明なエラー'}`);
  }
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

  assertSuccess(response.resultInfo, 'ウェブ決済作成');

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

  assertSuccess(response.resultInfo, '返金');

  return {
    refundId: merchantRefundId,
    status: response.data?.status,
  };
}
