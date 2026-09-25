// 売上管理まわりで共通して使う日付ユーティリティ

/**
 * 日付文字列（YYYY-MM-DD、日本時間の暦日として扱う）から、
 * その日の開始・終了時刻をUTCのISO文字列で返す。
 * 注文の createdAt（UTC ISO文字列）との範囲比較に使う。
 */
export function getJstDayBoundariesUtc(dateStr: string): { start: string; end: string } {
  const start = new Date(`${dateStr}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function dailySalesDocId(dateStr: string): string {
  return `dailySales-${dateStr}`;
}

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface SalesTotalParts {
  storeTotal?: number;
  adjustment?: number;
  wordOfMouthDiscount?: number;
  ecTotal?: number;
  workshopTotal?: number;
  jalanPointAmount?: number;
}

/**
 * 日別・月次・バックアップで共通の総売上計算。
 * じゃらんポイントは利用日の売上として1ポイント＝1円で加算する。
 */
export function calculateSalesGrandTotal(parts: SalesTotalParts): number {
  return (
    (parts.storeTotal || 0) +
    (parts.adjustment || 0) -
    (parts.wordOfMouthDiscount || 0) +
    (parts.ecTotal || 0) +
    (parts.workshopTotal || 0) +
    (parts.jalanPointAmount || 0)
  );
}

/** 1件の売上から、じゃらんポイント分と実際の受取額を確定する。 */
export function resolveJalanPointPayment(
  salesTotal: number,
  input: unknown
): { jalanPointAmount: number; receivedAmount: number } {
  const numeric = Number(input);
  const jalanPointAmount = Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
  if (jalanPointAmount > salesTotal) {
    throw new RangeError('じゃらんポイントは売上合計以下で入力してください');
  }
  return { jalanPointAmount, receivedAmount: salesTotal - jalanPointAmount };
}

/** 複数の支払い方法へ、じゃらんポイントを売上額の比率で按分する。 */
export function distributeJalanPointAmount(salesTotals: number[], input: unknown): number[] {
  const grandTotal = salesTotals.reduce((sum, value) => sum + Math.max(0, value), 0);
  const { jalanPointAmount } = resolveJalanPointPayment(grandTotal, input);
  if (grandTotal <= 0 || jalanPointAmount <= 0) return salesTotals.map(() => 0);

  const raw = salesTotals.map(value => (Math.max(0, value) / grandTotal) * jalanPointAmount);
  const result = raw.map(Math.floor);
  let remainder = jalanPointAmount - result.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - result[index] }))
    .sort((a, b) => b.fraction - a.fraction);
  for (const { index } of order) {
    if (remainder <= 0) break;
    result[index] += 1;
    remainder -= 1;
  }
  return result;
}

// EC（オンライン）注文の決済方法ラベル。API（日別売上の内訳集計）とUI（表示）の双方から参照する。
// 将来 paymentMethod の値が増えても（例: paypay）ここに追記するだけで両側に反映される。
// 未知のキーは ecMethodLabel() 側でキーそのままフォールバック表示する。
export const EC_METHOD_LABELS: Record<string, string> = {
  credit_card: 'クレジット',
  bank_transfer: '銀行振込',
  cash_on_delivery: '代金引換',
  paypay: 'PayPay',
};

/** EC決済方法のラベルを返す。未知のキーはそのままのキー文字列を返す。 */
export function ecMethodLabel(method: string): string {
  return EC_METHOD_LABELS[method] || method;
}

// ワークショップ予約の決済方法ラベル（現地払いは店舗売上として計上されるためここには出てこない）
const WORKSHOP_METHOD_LABELS: Record<string, string> = {
  credit_card: 'クレジットカード',
  paypay: 'PayPay',
  on_site: '現地払い',
  external: '外部予約（じゃらん等）',
};

/** ワークショップ予約の決済方法ラベルを返す。未知のキーはそのままのキー文字列を返す。 */
export function workshopMethodLabel(method: string): string {
  return WORKSHOP_METHOD_LABELS[method] || method;
}

/** 今日の日付を日本時間基準の YYYY-MM-DD 文字列で返す */
export function todayJst(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}
