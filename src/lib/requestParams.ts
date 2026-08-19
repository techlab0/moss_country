// クエリパラメータ・リクエストボディから数値を読むための共通処理。
//
// Number(null) は NaN ではなく 0 になる。このため
//   const n = Number(searchParams.get('days'));
//   Number.isFinite(n) ? n : DEFAULT
// と書くと、パラメータ未指定時に既定値ではなく0が採用される。
// 実際にこれで「今後30日」を見るはずの一覧が「1日」になり、
// 休業日の警告がほぼ出ない状態になっていた。
// 症状が「動いてはいるが範囲が狭い」なので気付きにくい。

/**
 * 正の整数として読み、読めなければ fallback を返す。
 * min / max の範囲に収めて返す。
 */
export function parsePositiveInt(
  raw: string | number | null | undefined,
  fallback: number,
  { min = 1, max = Number.MAX_SAFE_INTEGER }: { min?: number; max?: number } = {}
): number {
  // null / undefined / 空文字は「未指定」として扱う（Number() に渡さない）
  const value =
    raw === null || raw === undefined || raw === '' ? Number.NaN : Number(raw);

  const resolved = Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;

  return Math.min(Math.max(resolved, min), max);
}
