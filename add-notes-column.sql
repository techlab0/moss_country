-- calendar_eventsテーブルにnotesカラムを追加
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS notes TEXT;