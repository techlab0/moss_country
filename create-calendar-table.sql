-- カレンダーイベントテーブルを作成
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

-- ポリシーを作成（すべてのユーザーが読み取り可能、サービスロールが管理可能）
CREATE POLICY "Calendar events are viewable by everyone" ON calendar_events
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