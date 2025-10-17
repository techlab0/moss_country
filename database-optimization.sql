-- MOSS COUNTRY データベース最適化スクリプト
-- パフォーマンス向上・インデックス最適化・データ整合性強化

-- ===========================================
-- 1. 追加インデックス作成（パフォーマンス向上）
-- ===========================================

-- 複合インデックス（よく一緒に検索される項目）
CREATE INDEX IF NOT EXISTS idx_admin_users_role_created_at ON admin_users(role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_users_email_role ON admin_users(email, role);
CREATE INDEX IF NOT EXISTS idx_admin_users_two_factor ON admin_users(two_factor_enabled, role);
CREATE INDEX IF NOT EXISTS idx_admin_users_last_login ON admin_users(last_login DESC);

-- 監査ログの複合インデックス（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity_date ON audit_logs(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category_date ON audit_logs(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

-- フルテキスト検索用のGINインデックス（詳細検索対応）
CREATE INDEX IF NOT EXISTS idx_audit_logs_details_gin ON audit_logs USING gin(details);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email_gin ON audit_logs USING gin(to_tsvector('japanese', user_email));

-- 部分インデックス（条件付きデータに特化）
CREATE INDEX IF NOT EXISTS idx_admin_users_active_2fa ON admin_users(id) WHERE two_factor_enabled = true;
CREATE INDEX IF NOT EXISTS idx_audit_logs_critical ON audit_logs(created_at DESC) WHERE severity IN ('critical', 'high');
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent ON audit_logs(user_id, action) WHERE created_at > NOW() - INTERVAL '30 days';

-- ===========================================
-- 2. データベース設定最適化
-- ===========================================

-- ワーク メモリとメンテナンス設定の調整推奨値
-- （実際の適用は管理者が手動で行う必要があります）
COMMENT ON DATABASE postgres IS '
推奨設定（postgresql.conf）:
- shared_buffers = 256MB (利用可能メモリの25%)
- effective_cache_size = 1GB (利用可能メモリの75%)
- maintenance_work_mem = 64MB
- checkpoint_completion_target = 0.7
- wal_buffers = 16MB
- default_statistics_target = 100
';

-- ===========================================
-- 3. データ整合性制約の強化
-- ===========================================

-- メールアドレス形式チェック
ALTER TABLE admin_users 
ADD CONSTRAINT chk_admin_users_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- パスワードハッシュの長さチェック（bcryptは60文字）
ALTER TABLE admin_users 
ADD CONSTRAINT chk_admin_users_password_hash_length 
CHECK (length(password_hash) >= 60);

-- 監査ログのアクション名制約
ALTER TABLE audit_logs
ADD CONSTRAINT chk_audit_logs_action_format
CHECK (action ~ '^[a-z_]+\.[a-z_]+$');

-- IPアドレス形式チェック（IPv4/IPv6対応）
ALTER TABLE audit_logs
ADD CONSTRAINT chk_audit_logs_ip_format
CHECK (ip_address IS NULL OR ip_address ~ '^(\d{1,3}\.){3}\d{1,3}$' OR ip_address ~ '^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$');

-- ===========================================
-- 4. 自動クリーンアップ機能
-- ===========================================

-- 古い監査ログの自動削除（90日以上古いログ）
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  RAISE NOTICE '古い監査ログを削除しました: % 行', FOUND;
END;
$$ LANGUAGE plpgsql;

-- 定期実行用の関数（手動実行またはcron設定用）
CREATE OR REPLACE FUNCTION run_maintenance_tasks()
RETURNS void AS $$
BEGIN
  -- 古いログのクリーンアップ
  PERFORM cleanup_old_audit_logs();
  
  -- 統計情報の更新
  ANALYZE admin_users;
  ANALYZE audit_logs;
  
  -- インデックスの再構築（必要に応じて）
  REINDEX INDEX CONCURRENTLY idx_audit_logs_created_at;
  
  RAISE NOTICE 'メンテナンスタスクが完了しました';
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 5. パフォーマンス監視用ビュー
-- ===========================================

-- データベースパフォーマンス監視ビュー
CREATE OR REPLACE VIEW db_performance_stats AS
SELECT 
  schemaname,
  tablename,
  attname as column_name,
  n_distinct,
  correlation,
  most_common_vals,
  most_common_freqs,
  histogram_bounds
FROM pg_stats 
WHERE schemaname = 'public' 
  AND tablename IN ('admin_users', 'audit_logs');

-- インデックス使用状況監視ビュー
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE schemaname = 'public';

-- テーブルサイズ監視ビュー
CREATE OR REPLACE VIEW table_size_stats AS
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('admin_users', 'audit_logs');

-- ===========================================
-- 6. セキュリティ強化
-- ===========================================

-- 監査ログテーブルへの削除・更新を完全に禁止
CREATE POLICY "監査ログ削除禁止" ON audit_logs FOR DELETE USING (false);
CREATE POLICY "監査ログ更新禁止" ON audit_logs FOR UPDATE USING (false);

-- 管理者ユーザー削除の制限（最後の管理者は削除不可）
CREATE OR REPLACE FUNCTION prevent_last_admin_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role = 'admin' AND (SELECT COUNT(*) FROM admin_users WHERE role = 'admin' AND id != OLD.id) = 0 THEN
    RAISE EXCEPTION '最後の管理者ユーザーは削除できません';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_prevent_last_admin_deletion
  BEFORE DELETE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_admin_deletion();

-- ===========================================
-- 7. バックアップ推奨設定
-- ===========================================

COMMENT ON TABLE admin_users IS '
バックアップ推奨設定:
- 毎日の完全バックアップ
- 1時間毎のWALバックアップ
- 重要データのため、7日間の履歴保持を推奨
';

COMMENT ON TABLE audit_logs IS '
バックアップ推奨設定:
- 監査ログは法的要件のため、長期間の保持が必要
- 月次アーカイブでコールドストレージに保存推奨
- 暗号化バックアップ必須
';

-- ===========================================
-- 8. パフォーマンステスト用データ作成関数
-- ===========================================

-- テスト用ダミーデータ作成（開発環境でのパフォーマンステスト用）
CREATE OR REPLACE FUNCTION create_test_audit_data(row_count integer DEFAULT 10000)
RETURNS void AS $$
DECLARE
  i integer;
  test_user_id uuid;
  actions text[] := ARRAY['user.login', 'user.logout', 'user.create', 'user.update', 'user.delete', 'system.backup', 'security.alert'];
  categories text[] := ARRAY['authentication', 'user_management', 'system', 'security'];
  severities text[] := ARRAY['low', 'medium', 'high', 'critical'];
BEGIN
  -- テスト用管理者ユーザーを取得
  SELECT id INTO test_user_id FROM admin_users WHERE role = 'admin' LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'テスト用の管理者ユーザーが存在しません';
  END IF;
  
  FOR i IN 1..row_count LOOP
    INSERT INTO audit_logs (
      user_id,
      user_email,
      action,
      category,
      details,
      severity,
      ip_address,
      created_at
    ) VALUES (
      test_user_id::text,
      'test@example.com',
      actions[1 + (random() * (array_length(actions, 1) - 1))::integer],
      categories[1 + (random() * (array_length(categories, 1) - 1))::integer],
      '{"test": true, "iteration": ' || i || '}',
      severities[1 + (random() * (array_length(severities, 1) - 1))::integer],
      '192.168.1.' || (1 + random() * 254)::integer,
      NOW() - (random() * interval '30 days')
    );
  END LOOP;
  
  RAISE NOTICE 'テスト用監査ログデータを % 件作成しました', row_count;
END;
$$ LANGUAGE plpgsql;

-- 実行例（開発環境でのみ実行すること）
-- SELECT create_test_audit_data(50000);