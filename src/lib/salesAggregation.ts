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

/** 今日の日付を日本時間基準の YYYY-MM-DD 文字列で返す */
export function todayJst(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}
