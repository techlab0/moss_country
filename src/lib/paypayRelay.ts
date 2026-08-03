// PayPay OPA API を Xserver 固定IP中継（xserver-relay/paypay-relay.php）経由で呼ぶための共通トランスポート。
//
// PayPay本番APIは「PayPay for Businessに登録した固定IPからのみ」呼び出しを許可する。
// VercelはIPを固定できないため、EC決済（src/lib/paypayWebClient.ts）も店頭QR決済（src/lib/paypay.ts）も
// 例外なくこの中継を通す。PayPayのAPIキー・シークレット・加盟店IDはXserver側のconfig.phpにのみ置き、
// Vercel側は中継URLと共有シークレット（X-Relay-Secretヘッダー）だけを持つ。
//
// removable設計の要: PAYPAY_RELAY_URL / PAYPAY_RELAY_SECRET が揃っていない場合は
// 「PayPay決済は未設定」として明確にthrowする。isPaypayRelayConfigured() で事前判定できる。

/** 中継スクリプトが受け付けるアクション（paypay-relay.php の ?action= に対応） */
export type PayPayRelayAction = 'create' | 'status' | 'refund' | 'delete';

export interface PayPayResultInfo {
  code: string;
  message?: string;
  codeId?: string;
}

// 中継スクリプト（paypay-relay.php）はPayPay APIのレスポンスJSON（{resultInfo, data}）を
// そのまま横流しする。中継自体のエラー（403認証エラー・400バリデーション等）は
// resultInfoを含まない { error: string } 形なので、callRelay側で区別する。
export interface PayPayRelayResponse<T> {
  resultInfo: PayPayResultInfo;
  data?: T | null;
}

export interface PayPayMoney {
  amount?: number;
  currency?: string;
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
 * PayPay決済が利用できる状態か（Xserver中継のURL・共有シークレットが両方設定されているか）を返す。
 * これがfalseの間はEC側のAPIルートが503を返し、チェックアウトのPayPay選択肢も
 * NEXT_PUBLIC_PAYPAY_ENABLED フラグ側で隠れる。
 */
export function isPaypayRelayConfigured(): boolean {
  return getRelayConfig() !== null;
}

function requireRelayConfig(): { url: string; secret: string } {
  const config = getRelayConfig();
  if (!config) {
    throw new Error('PayPay決済は未設定です（PAYPAY_RELAY_URL / PAYPAY_RELAY_SECRET が必要です）');
  }
  return config;
}

export async function callRelay<T>(
  action: PayPayRelayAction,
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

export function assertRelaySuccess(resultInfo: PayPayResultInfo | undefined, action: string): void {
  if (!resultInfo || resultInfo.code !== 'SUCCESS') {
    throw new Error(`PayPay ${action}に失敗しました: ${resultInfo?.message || resultInfo?.code || '不明なエラー'}`);
  }
}
