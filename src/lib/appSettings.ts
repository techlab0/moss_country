import { supabaseAdmin } from '@/lib/supabase'

// メンテナンスパスワードの保存キー（app_settings.key）
export const MAINTENANCE_PASSWORD_KEY = 'maintenance_password'

/**
 * app_settings から値を取得する。
 * 未設定・取得失敗の場合はログを出して null を返す（呼び出し側でフォールバックする想定）。
 */
export async function getAppSetting(key: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single()

    if (error) {
      // 行が存在しない場合（PGRST116）は未設定として扱う
      if (error.code !== 'PGRST116') {
        console.error(`Failed to get app setting "${key}":`, error)
      }
      return null
    }

    return data?.value ?? null
  } catch (error) {
    console.error(`Failed to get app setting "${key}":`, error)
    return null
  }
}

/**
 * app_settings に値を保存する（upsert）。
 * 失敗した場合はログを出したうえで例外を投げる（呼び出し側で保存失敗を検知できるように）。
 */
export async function setAppSetting(key: string, value: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('app_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() })

    if (error) throw error
  } catch (error) {
    console.error(`Failed to set app setting "${key}":`, error)
    throw error
  }
}
