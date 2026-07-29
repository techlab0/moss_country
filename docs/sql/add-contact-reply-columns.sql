-- 管理画面からの初回返信を記録するための列を contact_inquiries に追加する。
--
-- これまではステータスを 'replied' に変えるだけで、実際に何を返信したかは
-- どこにも残らなかった（Xserverのウェブメールの送信済みフォルダにしかない）。
-- 管理画面から返信できるようにするのに合わせて、送信本文と送信者を記録する。
--
-- Supabaseのダッシュボード → SQL Editor で実行すること。
-- 何度実行しても安全（IF NOT EXISTS）。

ALTER TABLE contact_inquiries
    ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS reply_message TEXT,
    -- 返信を送信した管理者のメールアドレス（複数人で運用する場合に誰が返したか分かるように）
    ADD COLUMN IF NOT EXISTS replied_by VARCHAR(255);

-- 未返信の問い合わせを絞り込むためのインデックス。
-- replied_at IS NULL の行だけを対象にする部分インデックスにして、
-- 返信済みが増えてもサイズが膨らまないようにする。
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_unreplied
    ON contact_inquiries(created_at DESC)
    WHERE replied_at IS NULL;
