-- 既存の workshop_bookings テーブル向けマイグレーション（Supabase SQL Editorで実行する）
--
-- ワークショップ予約をキャンセルして返金（Square Refund API / PayPay PaymentRefund）した際に、
-- 返金IDを記録するためのカラムを追加する。既存データには影響しない（NULL許容カラムの追加のみ）。
--
-- 未実行でも返金処理そのものは動く（返金IDの保存だけがスキップされ、ログに残る）。

ALTER TABLE workshop_bookings ADD COLUMN IF NOT EXISTS refund_id TEXT;

COMMENT ON COLUMN workshop_bookings.refund_id IS 'Square/PayPay側の返金ID（返金した場合に記録）';
