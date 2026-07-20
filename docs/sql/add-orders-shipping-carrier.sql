-- ordersテーブルに配送業者カラムを追加
-- 顧客がチェックアウト画面で選択した配送業者（'yupack' | 'yamato'）を保存する。
-- 未選択・追加前の既存注文はNULL（管理画面では非表示扱い）。
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_carrier TEXT;

COMMENT ON COLUMN orders.shipping_carrier IS '顧客が選択した配送業者（yupack=ゆうパック / yamato=ヤマト運輸 宅急便）。未選択の旧注文はNULL。';
