-- 既存テーブル向けマイグレーション（Supabase SQL Editorで実行する）
--
-- 一部返金（送料の取りすぎ、ワークショップのキャンセル料控除など）に対応するため、
-- 累計の返金済み金額を記録するカラムを追加する。
--
-- 全額返金は payment_status = 'refunded'、一部返金は 'partially_refunded' として扱い、
-- refunded_amount が total に達した時点で 'refunded' になる。
-- 未実行の場合、一部返金は失敗する（返金済み金額を記録できないため）。

ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC DEFAULT 0;
ALTER TABLE workshop_bookings ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC DEFAULT 0;

COMMENT ON COLUMN orders.refunded_amount IS '返金済みの累計金額（一部返金の合計）';
COMMENT ON COLUMN workshop_bookings.refunded_amount IS '返金済みの累計金額（一部返金の合計）';
