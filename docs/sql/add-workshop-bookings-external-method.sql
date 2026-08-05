-- 既存の workshop_bookings テーブル向けマイグレーション（Supabase SQL Editorで実行する）
--
-- じゃらん等の外部予約サイト経由の予約を管理画面から手動登録できるようにするため、
-- payment_method に 'external' を追加する。
--
-- 'external' は「外部サイトで決済済み（後日入金）」を表す。レジを通らないため、
-- 日別売上では他のオンライン事前決済と同じく売上に計上する。
-- 当日店頭で精算する外部予約は 'on_site' で登録すること（レジ側で計上されるため
-- 予約側では計上せず、二重計上を防ぐ）。

ALTER TABLE workshop_bookings DROP CONSTRAINT IF EXISTS workshop_bookings_payment_method_check;

ALTER TABLE workshop_bookings ADD CONSTRAINT workshop_bookings_payment_method_check
  CHECK (payment_method IN ('credit_card', 'on_site', 'paypay', 'external'));
