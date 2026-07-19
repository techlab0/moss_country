-- FAQ管理用テーブルの作成
CREATE TABLE IF NOT EXISTS faqs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) を有効化
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- 全員が読み取り可能なポリシー
CREATE POLICY "Anyone can view published FAQs" ON faqs
  FOR SELECT USING (is_active = true);

-- Service Roleキーでの全操作を許可（管理画面用）
CREATE POLICY "Service role can manage FAQs" ON faqs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_faqs_display_order ON faqs(display_order);
CREATE INDEX IF NOT EXISTS idx_faqs_is_active ON faqs(is_active);

-- 初期データの挿入
INSERT INTO faqs (question, answer, display_order) VALUES
('駐車場はありますか？', '専用駐車場はございませんが、近隣に複数のコインパーキングがございます。お車でお越しの際は事前にご確認ください。', 1),
('予約は必要ですか？', '商品のご購入やご見学は予約不要です。ワークショップやオーダーメイドのご相談は事前予約をお勧めいたします。', 2),
('クレジットカードは使えますか？', 'VISA、MasterCard、JCB、American Express、各種電子マネー、QRコード決済に対応しております。', 3),
('テラリウムの育て方を教えてもらえますか？', 'もちろんです。購入時に詳しいお手入れ方法をご説明いたします。その後のご質問もお気軽にお電話ください。', 4);