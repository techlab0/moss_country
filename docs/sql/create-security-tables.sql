-- ログイン試行履歴・SMS認証コードの永続化用テーブル
--
-- これまでこれらはアプリのプロセスメモリ（変数）にしか保存されておらず、
-- Vercel等のサーバーレス環境ではインスタンスの入れ替わり（コールドスタート）のたびに
-- リセットされてしまうため、ログイン試行回数の制限が実質機能していませんでした。
-- このテーブルを作成すると、src/lib/advancedSecurity.ts と src/lib/smsAuth.ts が
-- 自動的にこちらを優先して使うようになります（USE_SUPABASE=true の場合のみ）。
--
-- 実行方法: Supabaseダッシュボード > SQL Editor に貼り付けて実行してください。

-- 1. ログイン試行履歴（管理者ログイン・2FA検証のレート制限用）
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(64) NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at);

-- 2. SMS二段階認証のワンタイムコード（5分間有効、1ユーザー1件のみ保持）
CREATE TABLE IF NOT EXISTS sms_verification_codes (
  user_id VARCHAR(255) PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  phone_number VARCHAR(32) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Row Level Security
-- ポリシーを一切定義せずRLSを有効化することで、anon/authenticatedロールからの
-- アクセスは全て拒否される。サーバー側の supabaseAdmin（service_role）は
-- RLSを常にバイパスするため、アプリからの読み書きには影響しない。
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_verification_codes ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE login_attempts IS 'ログイン試行履歴（レート制限・アカウントロック判定用）';
COMMENT ON TABLE sms_verification_codes IS 'SMS二段階認証のワンタイムコード（5分間有効）';
