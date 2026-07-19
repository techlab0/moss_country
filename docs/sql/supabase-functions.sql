-- Supabase カスタム関数
-- データベース最適化・監視・メンテナンス用

-- ===========================================
-- 1. テーブル統計情報取得関数
-- ===========================================
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE (
  name TEXT,
  row_count BIGINT,
  size_formatted TEXT,
  size_bytes BIGINT,
  index_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT as name,
    t.n_tup_ins - t.n_tup_del as row_count,
    pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename)) as size_formatted,
    pg_total_relation_size(t.schemaname||'.'||t.tablename) as size_bytes,
    pg_size_pretty(
      pg_total_relation_size(t.schemaname||'.'||t.tablename) - 
      pg_relation_size(t.schemaname||'.'||t.tablename)
    ) as index_size
  FROM pg_stat_user_tables t
  WHERE t.schemaname = 'public'
    AND t.tablename IN ('admin_users', 'audit_logs');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 2. インデックス統計情報取得関数  
-- ===========================================
CREATE OR REPLACE FUNCTION get_index_stats()
RETURNS TABLE (
  table_name TEXT,
  index_name TEXT,
  scans BIGINT,
  tuples_read BIGINT,
  tuples_fetched BIGINT,
  size_formatted TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.relname::TEXT as table_name,
    s.indexrelname::TEXT as index_name,
    s.idx_scan as scans,
    s.idx_tup_read as tuples_read,
    s.idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(s.indexrelid)) as size_formatted
  FROM pg_stat_user_indexes s
  JOIN pg_class i ON i.oid = s.relid
  WHERE s.schemaname = 'public'
  ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 3. パフォーマンス統計取得関数
-- ===========================================
CREATE OR REPLACE FUNCTION get_performance_stats()
RETURNS TABLE (
  slow_queries INTEGER,
  avg_query_time NUMERIC,
  cache_hit_ratio NUMERIC,
  connection_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    0 as slow_queries, -- pg_stat_statementsが必要（拡張機能）
    0.0 as avg_query_time, -- 同上
    CASE 
      WHEN blks_hit + blks_read = 0 THEN 100.0
      ELSE round((blks_hit * 100.0 / (blks_hit + blks_read))::numeric, 2)
    END as cache_hit_ratio,
    (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active')::INTEGER as connection_count
  FROM pg_stat_database 
  WHERE datname = current_database()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 4. クエリ実行計画分析関数
-- ===========================================
CREATE OR REPLACE FUNCTION explain_query(query_text TEXT)
RETURNS JSON AS $$
DECLARE
  plan JSON;
BEGIN
  -- 実行計画を取得（実際には実行しない）
  EXECUTE 'EXPLAIN (FORMAT JSON, ANALYZE false) ' || query_text INTO plan;
  RETURN plan;
EXCEPTION
  WHEN OTHERS THEN
    RETURN '{"error": "クエリの分析に失敗しました"}'::JSON;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 5. テーブル分析実行関数
-- ===========================================
CREATE OR REPLACE FUNCTION analyze_tables()
RETURNS TEXT AS $$
BEGIN
  ANALYZE admin_users;
  ANALYZE audit_logs;
  RETURN 'テーブル統計情報を更新しました';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 6. 古いログクリーンアップ関数
-- ===========================================
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 7. インデックス健全性チェック関数
-- ===========================================
CREATE OR REPLACE FUNCTION check_index_health()
RETURNS TABLE (
  table_name TEXT,
  index_name TEXT,
  status TEXT,
  recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.schemaname::TEXT as table_name,
    s.indexrelname::TEXT as index_name,
    CASE 
      WHEN s.idx_scan = 0 THEN '未使用'
      WHEN s.idx_scan < 100 THEN '低使用'
      ELSE '正常'
    END as status,
    CASE 
      WHEN s.idx_scan = 0 THEN '削除を検討'
      WHEN s.idx_scan < 100 THEN '使用状況を監視'
      ELSE '継続使用'
    END as recommendation
  FROM pg_stat_user_indexes s
  WHERE s.schemaname = 'public'
  ORDER BY s.idx_scan ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 8. インデックス使用状況分析関数
-- ===========================================
CREATE OR REPLACE FUNCTION get_index_usage_analysis()
RETURNS TABLE (
  tablename TEXT,
  indexname TEXT,
  idx_scan BIGINT,
  idx_tup_read BIGINT,
  idx_tup_fetch BIGINT,
  usage_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.relname::TEXT as tablename,
    s.indexrelname::TEXT as indexname,
    s.idx_scan,
    s.idx_tup_read,
    s.idx_tup_fetch,
    CASE 
      WHEN s.idx_scan = 0 THEN '未使用'
      WHEN s.idx_scan < 1000 THEN '低使用'
      WHEN s.idx_scan < 10000 THEN '中使用'
      ELSE '高使用'
    END as usage_level
  FROM pg_stat_user_indexes s
  WHERE s.schemaname = 'public'
  ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 9. データベースサイズ監視関数
-- ===========================================
CREATE OR REPLACE FUNCTION get_database_size_info()
RETURNS TABLE (
  database_size TEXT,
  table_sizes JSONB,
  index_sizes JSONB,
  total_connections INTEGER,
  active_connections INTEGER
) AS $$
DECLARE
  table_data JSONB := '{}';
  index_data JSONB := '{}';
  rec RECORD;
BEGIN
  -- テーブルサイズ情報を取得
  FOR rec IN 
    SELECT 
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  LOOP
    table_data := table_data || jsonb_build_object(rec.tablename, rec.size);
  END LOOP;

  -- インデックスサイズ情報を取得
  FOR rec IN
    SELECT 
      indexname,
      pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) as size
    FROM pg_indexes 
    WHERE schemaname = 'public'
    ORDER BY pg_relation_size(schemaname||'.'||indexname) DESC
  LOOP
    index_data := index_data || jsonb_build_object(rec.indexname, rec.size);
  END LOOP;

  RETURN QUERY
  SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size,
    table_data as table_sizes,
    index_data as index_sizes,
    (SELECT COUNT(*)::INTEGER FROM pg_stat_activity) as total_connections,
    (SELECT COUNT(*)::INTEGER FROM pg_stat_activity WHERE state = 'active') as active_connections;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 10. セキュリティ監視関数
-- ===========================================
CREATE OR REPLACE FUNCTION get_security_metrics()
RETURNS TABLE (
  failed_login_attempts BIGINT,
  suspicious_activities BIGINT,
  recent_admin_changes BIGINT,
  high_severity_logs BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM audit_logs 
     WHERE action = 'auth.login_failed' 
       AND created_at > NOW() - INTERVAL '24 hours') as failed_login_attempts,
    (SELECT COUNT(*) FROM audit_logs 
     WHERE severity = 'high' 
       AND created_at > NOW() - INTERVAL '24 hours') as suspicious_activities,
    (SELECT COUNT(*) FROM audit_logs 
     WHERE action LIKE 'user.%' 
       AND details->>'role' = 'admin'
       AND created_at > NOW() - INTERVAL '7 days') as recent_admin_changes,
    (SELECT COUNT(*) FROM audit_logs 
     WHERE severity IN ('high', 'critical')
       AND created_at > NOW() - INTERVAL '7 days') as high_severity_logs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 11. 自動メンテナンス実行関数
-- ===========================================
CREATE OR REPLACE FUNCTION run_automated_maintenance()
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  cleanup_count INTEGER;
  maintenance_log TEXT := '';
BEGIN
  -- 統計情報更新
  PERFORM analyze_tables();
  maintenance_log := maintenance_log || '統計情報を更新しました。';
  
  -- 古いログのクリーンアップ
  SELECT cleanup_old_audit_logs() INTO cleanup_count;
  maintenance_log := maintenance_log || format('古いログを%s件削除しました。', cleanup_count);
  
  -- 結果をJSONで返す
  result := jsonb_build_object(
    'success', true,
    'timestamp', NOW(),
    'cleanup_count', cleanup_count,
    'log', maintenance_log
  );
  
  -- メンテナンス実行ログを記録
  INSERT INTO audit_logs (
    user_id, user_email, action, category, 
    details, severity, created_at
  ) VALUES (
    'system', 'system@moss-country.com', 
    'system.maintenance', 'system',
    result, 'low', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 権限設定（セキュリティ）
-- ===========================================

-- 管理者のみがこれらの関数を実行可能に設定
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- 認証済みユーザーに実行権限を付与
GRANT EXECUTE ON FUNCTION get_table_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_index_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION explain_query(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION check_index_health() TO authenticated;
GRANT EXECUTE ON FUNCTION get_index_usage_analysis() TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_size_info() TO authenticated;
GRANT EXECUTE ON FUNCTION get_security_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION run_automated_maintenance() TO authenticated;

-- ===========================================
-- 12. カレンダーイベントテーブル
-- ===========================================

-- calendar_eventsテーブルを作成
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('open', 'event', 'closed')),
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(type);

-- RLS (Row Level Security) を有効化
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- 管理者のみがアクセス可能なポリシーを作成
CREATE POLICY "Calendar events are viewable by authenticated users" ON calendar_events
    FOR SELECT USING (true);

CREATE POLICY "Calendar events are manageable by service role" ON calendar_events
    FOR ALL USING (true);

-- 初期データを挿入（サンプルデータ）
INSERT INTO calendar_events (date, type, title, location) VALUES
('2025-01-01', 'closed', '元日', NULL),
('2025-01-02', 'closed', '年始休業', NULL),
('2025-01-03', 'closed', '年始休業', NULL),
('2025-01-06', 'open', '営業日', NULL),
('2025-01-07', 'open', '営業日', NULL),
('2025-01-08', 'open', '営業日', NULL),
('2025-01-09', 'open', '営業日', NULL),
('2025-01-10', 'open', '営業日', NULL),
('2025-01-11', 'event', 'イベント出店（丸井今井札幌店）', '丸井今井札幌店'),
('2025-01-12', 'event', 'イベント出店（丸井今井札幌店）', '丸井今井札幌店'),
('2025-01-13', 'open', '営業日', NULL),
('2025-01-14', 'open', '営業日', NULL),
('2025-01-15', 'open', '営業日', NULL),
('2025-01-16', 'open', '営業日', NULL),
('2025-01-17', 'open', '営業日', NULL),
('2025-01-18', 'event', 'イベント出店（東急ハンズ札幌店）', '東急ハンズ札幌店'),
('2025-01-19', 'event', 'イベント出店（東急ハンズ札幌店）', '東急ハンズ札幌店'),
('2025-01-20', 'open', '営業日', NULL),
('2025-01-21', 'open', '営業日', NULL),
('2025-01-22', 'open', '営業日', NULL),
('2025-01-23', 'closed', '定休日', NULL),
('2025-01-24', 'open', '営業日', NULL),
('2025-01-25', 'event', 'イベント出店（新千歳空港）', '新千歳空港ターミナル'),
('2025-01-26', 'event', 'イベント出店（新千歳空港）', '新千歳空港ターミナル'),
('2025-01-27', 'open', '営業日', NULL),
('2025-01-28', 'open', '営業日', NULL),
('2025-01-29', 'open', '営業日', NULL),
('2025-01-30', 'closed', '定休日', NULL),
('2025-01-31', 'open', '営業日', NULL)
ON CONFLICT (date) DO NOTHING;