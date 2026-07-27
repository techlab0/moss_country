import { supabaseAdmin } from './supabase';

/**
 * Supabaseの単一RPCでカウンタ更新と判定を行う分散レート制限。
 * DBへ接続できない場合に許可すると公開予約APIの悪用を防げないため、例外を投げてfail-closedにする。
 */
export async function consumeDistributedRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('consume_api_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error('分散レート制限の確認に失敗しました:', {
      code: error.code,
      message: error.message,
    });
    throw new Error('Distributed rate limit unavailable');
  }

  return data === true;
}
