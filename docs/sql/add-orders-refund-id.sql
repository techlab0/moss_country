-- 既存の orders テーブル向けマイグレーション（Supabase SQL Editorで実行する）
--
-- 注文をカードへ返金（Square Refund API）した際に、返金IDを記録するためのカラムを追加する。
-- 既存データには影響しない（NULL許容カラムの追加のみ）。

ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_id TEXT;

COMMENT ON COLUMN orders.refund_id IS 'Square側の返金ID（カードへ返金した場合に記録）';
