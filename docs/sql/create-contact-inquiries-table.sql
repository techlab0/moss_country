-- contact_inquiries テーブル作成クエリ
CREATE TABLE IF NOT EXISTS contact_inquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    inquiry_type VARCHAR(50) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT CHECK (char_length(message) <= 1000) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'resolved')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status ON contact_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON contact_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_email ON contact_inquiries(email);

-- RLS (Row Level Security) を無効化（管理者のみアクセス）
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

-- Service Role による全アクセスを許可
CREATE POLICY "Service role can access all contact inquiries" ON contact_inquiries
    FOR ALL USING (auth.role() = 'service_role');

-- 注意: 以前は匿名ユーザーのINSERTを許可するポリシー（WITH CHECK (true)）があったが、
-- お問い合わせフォームの保存はAPI側でservice roleキー（RLSをバイパスする）を使うため不要で、
-- anonキーで誰でも直接行を挿入できる穴になっていたので削除した。

-- 更新時間の自動更新トリガー
-- SET search_path で search_path 乗っ取り（Supabaseリンター: function_search_path_mutable）を防ぐ
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = '';

CREATE TRIGGER update_contact_inquiries_updated_at 
    BEFORE UPDATE ON contact_inquiries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();