-- workshop_bookings テーブル作成クエリ
-- ワークショップ予約情報。顧客個人情報（氏名・メール・電話）を含むため、
-- orders テーブル（docs/sql/create-orders-table.sql）と同様にservice_role専用でRLSを構成する。
CREATE TABLE IF NOT EXISTS workshop_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_number TEXT UNIQUE NOT NULL,

    -- 予約対象プラン（Sanity simpleWorkshop）のスナップショット
    -- プラン名・料金は予約時点の内容を保持し、後からプラン側が変更されても過去の予約表示に影響しないようにする
    workshop_plan_id TEXT,
    workshop_plan_name TEXT,

    -- 予約日時（JST）
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,

    party_size INTEGER NOT NULL CHECK (party_size > 0),

    -- 顧客情報（PII）
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,

    payment_method TEXT CHECK (payment_method IN ('credit_card', 'on_site', 'paypay')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    total NUMERIC,

    -- Square決済連携ID（credit_cardでその場決済した場合のみ設定）
    square_payment_id TEXT,
    -- Googleカレンダー側のイベントID（キャンセル時の削除に使用）
    google_event_id TEXT,

    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_workshop_bookings_date ON workshop_bookings(date);
CREATE INDEX IF NOT EXISTS idx_workshop_bookings_booking_number ON workshop_bookings(booking_number);
CREATE INDEX IF NOT EXISTS idx_workshop_bookings_status ON workshop_bookings(status);

-- RLS (Row Level Security) を有効化
ALTER TABLE workshop_bookings ENABLE ROW LEVEL SECURITY;

-- Service Role による全アクセスのみを許可（顧客PIIを含むため、anonキーでのアクセスは一切許可しない）
CREATE POLICY "Service role can access all workshop bookings" ON workshop_bookings
    FOR ALL USING (auth.role() = 'service_role');

-- 更新時間の自動更新トリガー
-- SET search_path で search_path 乗っ取り（Supabaseリンター: function_search_path_mutable）を防ぐ
-- 注意: この関数は docs/sql/create-orders-table.sql 等でも同名で定義されている共通トリガー関数。
-- CREATE OR REPLACE のため、どちらのSQLを先に実行しても後から実行した方の定義で上書きされるだけで、
-- 内容は同一なので問題ない。
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = '';

CREATE OR REPLACE TRIGGER update_workshop_bookings_updated_at
    BEFORE UPDATE ON workshop_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE workshop_bookings IS 'ワークショップ予約情報（顧客PIIを含むためservice_role専用）';
COMMENT ON COLUMN workshop_bookings.workshop_plan_id IS 'Sanity simpleWorkshopの_id（予約時点のスナップショット。プランが削除されても予約自体は残す）';
COMMENT ON COLUMN workshop_bookings.payment_method IS 'credit_card=その場カード決済 / on_site=現地払い / paypay=現時点ではon_site同様の現地/別途扱い（TODO: オンラインPayPay決済は次フェーズ）';
COMMENT ON COLUMN workshop_bookings.google_event_id IS 'Googleカレンダー側のイベントID。キャンセル時にこのIDでイベントを削除する';
