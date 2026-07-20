-- 既存の orders テーブル向けマイグレーション（Supabase SQL Editorで実行する）
--
-- 不具合: status の CHECK 制約に 'paid' が含まれていなかったため、
-- カード決済成功後の status='paid' への UPDATE が制約違反(SQLSTATE 23514)で失敗し、
-- Square では課金が成立しているのに画面には「Payment processing failed」が表示されていた。
--
-- 対応: 制約を貼り直して 'paid' を許可する（アプリの OrderStatus 型と一致させる）。
-- 既存データには影響しない（許可値を増やすだけ）。

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'));
