-- orders テーブル作成クエリ
-- 顧客個人情報（氏名・メール・電話・配送先住所）を含むため、Sanity（公開データセット）から
-- Supabase（service_roleキーでのみアクセス可能）へ移行した。
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,

    -- 顧客情報（PII）
    customer_email TEXT,
    customer_first_name TEXT,
    customer_last_name TEXT,
    customer_phone TEXT,

    -- 明細のスナップショット（商品参照ではなく購入時点の内容を保持）
    -- 各要素: { productId, name, price, quantity, variant }
    items JSONB NOT NULL,

    subtotal NUMERIC,
    shipping_cost NUMERIC,
    tax NUMERIC,
    total NUMERIC,

    -- 'paid' はカード決済成功時に必ずセットされる。アプリのOrderStatus型と完全一致させること
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
    payment_method TEXT,

    shipping_address JSONB,
    notes TEXT,
    -- 指定されたカラム定義には無いが、既存の管理画面（/admin/orders/[id]）が
    -- 追跡番号の編集・保存機能を持っているため、回帰を防ぐために追加した。
    tracking_number TEXT,

    -- Square決済連携用ID
    square_order_id TEXT,
    square_payment_id TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_square_order_id ON orders(square_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_square_payment_id ON orders(square_payment_id);

-- RLS (Row Level Security) を有効化
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Service Role による全アクセスのみを許可（顧客PIIを含むため、anonキーでのアクセスは一切許可しない）
CREATE POLICY "Service role can access all orders" ON orders
    FOR ALL USING (auth.role() = 'service_role');

-- 更新時間の自動更新トリガー
-- SET search_path で search_path 乗っ取り（Supabaseリンター: function_search_path_mutable）を防ぐ
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = '';

CREATE OR REPLACE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE orders IS 'ECサイトの注文情報（顧客PIIを含むためservice_role専用）';
COMMENT ON COLUMN orders.items IS '注文明細のスナップショット: [{ productId, name, price, quantity, variant }]';
COMMENT ON COLUMN orders.shipping_address IS '配送先住所（JSON）';
COMMENT ON COLUMN orders.square_order_id IS 'Square側のOrder ID（Webhookでの照合に使用）';
COMMENT ON COLUMN orders.square_payment_id IS 'Square側のPayment ID（Webhookでの照合に使用）';
