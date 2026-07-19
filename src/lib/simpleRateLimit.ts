// サーバレスインスタンス単位のベストエフォートなインメモリレート制限。
// 注意: サーバレス環境では複数インスタンスが並行稼働し、インスタンスの再起動で
// 状態が失われるため、これは「同一インスタンス内でのベストエフォート」でしかなく、
// 厳密なグローバルレート制限ではない。より強い保証が必要な場合はRedis等の
// 外部ストアを使うこと。

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const MAX_ENTRIES = 10000;

const store = new Map<string, RateLimitEntry>();

// エントリ数が上限を超えたら、有効期限が古い順に間引く（メモリ肥大化防止）
function pruneIfNeeded() {
  if (store.size <= MAX_ENTRIES) {
    return;
  }

  const entries = Array.from(store.entries()).sort((a, b) => a[1].resetAt - b[1].resetAt);
  const removeCount = store.size - MAX_ENTRIES;
  for (let i = 0; i < removeCount; i++) {
    store.delete(entries[i][0]);
  }
}

/**
 * インスタンス単位のベストエフォートなレート制限チェック。
 * @param key レート制限の対象を識別するキー（例: `maintenance-verify:${ip}`）
 * @param limit windowMs 内に許可する最大リクエスト数
 * @param windowMs ウィンドウの長さ（ミリ秒）
 * @returns true なら許可、false なら制限超過
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    pruneIfNeeded();
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}
