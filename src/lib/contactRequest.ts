export async function fetchContactPage<T>(
  fetcher: typeof fetch,
  url: string,
  signal: AbortSignal,
  isCurrent: () => boolean,
): Promise<T | null> {
  const response = await fetcher(url, { signal });
  if (!isCurrent()) return null;
  if (!response.ok) throw new Error('お問い合わせデータの取得に失敗しました');

  const data = await response.json() as T;
  return isCurrent() ? data : null;
}
