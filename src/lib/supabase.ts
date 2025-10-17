import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabaseの設定が不正です。環境変数を確認してください。')
}

// クライアント用（一般的な用途）
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// サーバーサイド用（RLS回避・管理機能）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// データベーステーブル定義
export interface AdminUser {
  id: string
  email: string
  password_hash: string
  role: 'admin' | 'editor'
  two_factor_enabled: boolean
  totp_secret?: string | null
  webauthn_credentials?: any[] | null
  last_login?: Date | null
  created_at: Date
  updated_at: Date
}

export interface AuditLog {
  id: string
  user_id: string
  user_email: string
  action: string
  category: string
  details: Record<string, any>
  resource_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
  severity: 'low' | 'medium' | 'high' | 'critical'
  created_at: Date
}

// ユーザー管理関数
export async function createUserInDB(userData: Omit<AdminUser, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .insert([{
      ...userData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function findUserByEmailInDB(email: string): Promise<AdminUser | null> {
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function findUserByIdInDB(id: string): Promise<AdminUser | null> {
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function updateUserInDB(id: string, updates: Partial<AdminUser>) {
  const { data, error } = await supabase
    .from('admin_users')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getAllUsersFromDB(): Promise<AdminUser[]> {
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// 監査ログ関数
export async function logAuditEventToDB(auditData: Omit<AuditLog, 'id' | 'created_at'>) {
  const { data, error } = await supabaseAdmin
    .from('audit_logs')
    .insert([{
      ...auditData,
      created_at: new Date().toISOString()
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getAuditLogsFromDB(limit = 100, offset = 0): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data || []
}

export async function getAuditLogsByUserFromDB(userId: string, limit = 50): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}