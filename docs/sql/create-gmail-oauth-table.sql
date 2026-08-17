-- Gmail連携（ワークショップ予約メールの読み取り）用のトークン保管テーブル。
--
-- ここに入るのは refresh_token / access_token という「Gmailを読める鍵そのもの」なので、
-- 公開読み取り前提のSanityではなくSupabaseに置き、さらにRLSを有効化した上で
-- ポリシーを一切作らない。ポリシーが無いテーブルは anon キーからは読み書きできないため、
-- service role キーを使うサーバー側APIだけがアクセスできる状態になる。
-- （calendar_events のように SELECT ポリシーを付けてはいけない。付けると公開されてしまう）
--
-- 連携先は「予約通知を受け取っているGmailアカウント1つ」だけなので、常に1行のみ保持する。
CREATE TABLE IF NOT EXISTS gmail_oauth_tokens (
    id TEXT PRIMARY KEY DEFAULT 'default',
    -- 連携したGmailアカウントのアドレス（表示・確認用）
    email TEXT,
    -- 長期の鍵。これがある限りアクセストークンを再発行できる
    refresh_token TEXT NOT NULL,
    -- 短期の鍵。期限切れ時は refresh_token から再発行して上書きする
    access_token TEXT,
    access_token_expires_at TIMESTAMP WITH TIME ZONE,
    -- 実際に許可された権限。gmail.readonly 以外が入っていたら想定外なので確認する
    scope TEXT,
    -- 連携操作を行った管理者のメールアドレス（監査用）
    connected_by TEXT,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- 1行しか持たせない
    CONSTRAINT gmail_oauth_tokens_single_row CHECK (id = 'default')
);

ALTER TABLE gmail_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- ポリシーは意図的に作らない（上のコメント参照）。
