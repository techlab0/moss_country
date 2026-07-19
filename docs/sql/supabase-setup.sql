-- Supabase データベース初期化スクリプト
-- MOSS COUNTRY ECサイト用テーブル作成

-- 1. 管理者ユーザーテーブル
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  totp_secret TEXT NULL,
  webauthn_credentials JSONB NULL DEFAULT '[]',
  last_login TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. 監査ログテーブル
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  details JSONB DEFAULT '{}',
  resource_id VARCHAR(255) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 4. 更新時刻の自動更新（admin_usersテーブル用）
-- SET search_path で search_path 乗っ取り（Supabaseリンター: function_search_path_mutable）を防ぐ
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = '';

CREATE OR REPLACE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Row Level Security (RLS) 設定
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 管理者ユーザーのポリシー（認証済みユーザーのみアクセス可能）
CREATE POLICY "管理者ユーザー選択ポリシー" ON admin_users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "管理者ユーザー挿入ポリシー" ON admin_users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "管理者ユーザー更新ポリシー" ON admin_users
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 監査ログのポリシー（挿入・選択のみ許可、削除・更新は禁止）
CREATE POLICY "監査ログ選択ポリシー" ON audit_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "監査ログ挿入ポリシー" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 6. 初期管理者ユーザー作成
-- 注意: パスワードは後でハッシュ化されたものに置き換えてください
INSERT INTO admin_users (email, password_hash, role, two_factor_enabled) VALUES 
('moss.country.kokenokuni@gmail.com', '$2b$10$placeholder', 'admin', false)
ON CONFLICT (email) DO NOTHING;

-- 7. コメント追加
COMMENT ON TABLE admin_users IS 'MOSS COUNTRY 管理者ユーザー情報';
COMMENT ON TABLE audit_logs IS 'システム操作の監査ログ';

COMMENT ON COLUMN admin_users.id IS 'ユーザーID（UUID）';
COMMENT ON COLUMN admin_users.email IS 'メールアドレス（ログイン用）';
COMMENT ON COLUMN admin_users.password_hash IS 'ハッシュ化されたパスワード';
COMMENT ON COLUMN admin_users.role IS 'ユーザーロール（admin/editor）';
COMMENT ON COLUMN admin_users.two_factor_enabled IS '2段階認証有効フラグ';
COMMENT ON COLUMN admin_users.totp_secret IS 'TOTP秘密鍵';
COMMENT ON COLUMN admin_users.webauthn_credentials IS 'WebAuthn認証情報（JSON）';
COMMENT ON COLUMN admin_users.last_login IS '最終ログイン日時';

COMMENT ON COLUMN audit_logs.user_id IS '操作ユーザーID';
COMMENT ON COLUMN audit_logs.user_email IS '操作ユーザーメールアドレス';
COMMENT ON COLUMN audit_logs.action IS '実行されたアクション';
COMMENT ON COLUMN audit_logs.category IS 'アクションカテゴリ';
COMMENT ON COLUMN audit_logs.details IS '詳細情報（JSON）';
COMMENT ON COLUMN audit_logs.resource_id IS '対象リソースID';
COMMENT ON COLUMN audit_logs.severity IS '重要度レベル';

-- 注意: かつてここに動作確認用の集計ビュー（admin_users_stats / audit_logs_stats）を
-- 作成していたが、アプリからは未使用のうえ、ビューは既定でRLSを素通りする
-- （Supabaseリンターの security_definer_view エラーになる）ため削除した。
-- 集計が必要な場合はSQL Editorで直接クエリするか、security_invoker = on を付けて作成すること。