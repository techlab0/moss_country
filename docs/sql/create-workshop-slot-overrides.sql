-- workshop_slot_overrides テーブル作成クエリ
-- ワークショップ受付枠（src/lib/workshopBookingConfig.ts の WORKSHOP_SLOTS）ごとのON/OFFオーバーライド。
--
-- 既定は「営業日（calendar_events type='closed' でない）なら枠OPEN」。
-- このテーブルには管理者が明示的に変更した枠だけが入る
-- （is_open=false で閉鎖、trueで再開＝行削除でも表現できるが実装はupsertに統一）。
--
-- 顧客PIIは含まないが、予約可否ロジックの根拠データであり書き換えは管理操作のため、
-- workshop_bookings（docs/sql/create-workshop-bookings-table.sql）と同様にservice_role専用でRLSを構成する。
CREATE TABLE IF NOT EXISTS workshop_slot_overrides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    is_open BOOLEAN NOT NULL DEFAULT false,

    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    UNIQUE (date, start_time)
);

-- インデックス作成（月単位でのGET取得を高速化）
CREATE INDEX IF NOT EXISTS idx_workshop_slot_overrides_date ON workshop_slot_overrides(date);

-- RLS (Row Level Security) を有効化
ALTER TABLE workshop_slot_overrides ENABLE ROW LEVEL SECURITY;

-- Service Role による全アクセスのみを許可（管理操作専用のため、anonキーでのアクセスは一切許可しない）
CREATE POLICY "Service role can access all workshop slot overrides" ON workshop_slot_overrides
    FOR ALL USING (auth.role() = 'service_role');

-- 更新時間の自動更新トリガー
-- SET search_path で search_path 乗っ取り（Supabaseリンター: function_search_path_mutable）を防ぐ
-- 注意: この関数は docs/sql/create-workshop-bookings-table.sql 等でも同名で定義されている共通トリガー関数。
-- CREATE OR REPLACE のため、どちらのSQLを先に実行しても後から実行した方の定義で上書きされるだけで、
-- 内容は同一なので問題ない。
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = '';

CREATE OR REPLACE TRIGGER update_workshop_slot_overrides_updated_at
    BEFORE UPDATE ON workshop_slot_overrides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE workshop_slot_overrides IS 'ワークショップ受付枠（WORKSHOP_SLOTS）ごとのON/OFFオーバーライド（管理者が明示的に変更した枠のみ格納。service_role専用）';
COMMENT ON COLUMN workshop_slot_overrides.start_time IS 'WORKSHOP_SLOTSのstart（例: "11:30"）と一致させる';
COMMENT ON COLUMN workshop_slot_overrides.is_open IS 'false=この日のこの枠を閉鎖 / true=明示的に再開（既定と同じ状態だが行としては残せる）';
