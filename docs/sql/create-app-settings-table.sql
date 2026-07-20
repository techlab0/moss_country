-- app_settings テーブル作成クエリ
-- 管理画面から変更する汎用のキー・バリュー設定を保存する（メンテナンスパスワードなど、
-- Sanity（公開データセット）に置くと漏えいしうる機密値の保存先として利用する）。
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (Row Level Security) を有効化
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Service Role による全アクセスのみを許可（anonキーでのアクセスは一切許可しない）
CREATE POLICY "Service role can access all app_settings" ON app_settings
    FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE app_settings IS '管理画面から変更する汎用設定（キー・バリュー）。機密値の保存先としてservice_role専用でアクセスする';
COMMENT ON COLUMN app_settings.key IS '設定キー（例: maintenance_password）';
COMMENT ON COLUMN app_settings.value IS '設定値';
