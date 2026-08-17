// Gmail連携（ワークショップ予約通知メールの読み取り）のOAuth処理。
//
// カレンダー・スプレッドシート連携（googleCalendar.ts / googleSheets.ts）はサービスアカウント方式だが、
// Gmailの受信箱は「個人のGmailアカウントが持つデータ」なのでサービスアカウントでは読めない。
// そのため、店舗のGmailアカウント本人に一度だけ許可してもらうOAuth（authorization code + refresh token）方式を使う。
//
// 権限は gmail.readonly のみ。送信・削除・変更の権限は要求しないので、
// このコードから誤ってメールを消したり送ったりすることは構造的に起こらない。
//
// トークンはSupabaseの gmail_oauth_tokens テーブル（RLS有効・ポリシー無し＝service roleのみ）に保存する。
// docs/sql/create-gmail-oauth-table.sql を参照。

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { SignJWT, jwtVerify } from 'jose';
import { getAdminJwtSecretKey } from '@/lib/auth';

// google-auth-library は googleapis が内部に別バージョンを持っているため、
// トップレベルの 'google-auth-library' から型をimportすると google.gmail({ auth }) に渡せない。
// googleapis が実際に返す型をそのまま使う。
type GmailOAuth2Client = InstanceType<typeof google.auth.OAuth2>;

/** 要求する権限。読み取り専用のみ。ここを増やすときは必ず理由を書くこと */
export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

const TABLE = 'gmail_oauth_tokens';
const ROW_ID = 'default';

/** OAuthフローのCSRF対策に使うstateを入れるCookie名 */
export const GMAIL_OAUTH_STATE_COOKIE = 'gmail-oauth-state';

// 管理者セッションのCookie（admin-session）は SameSite=strict のため、Googleの許可画面から
// 戻ってくるトップレベル遷移では送られてこない。そのためコールバックは admin-session では
// 認証できない。代わりに、この署名付きstateトークンをコールバックの認証材料として使う。
// 発行できるのは認証済み管理者だけ（/api/admin/gmail/connect が middleware に守られている）なので、
// 正しく署名されたトークンを提示できること自体が「管理者が開始したフローである」ことの証明になる。
// Cookieは SameSite=lax にして、Googleからの戻りでも送られるようにしている。

interface OAuthStatePayload {
  /** Googleへ渡すstateと突き合わせる乱数 */
  nonce: string;
  /** 連携操作を行った管理者。connected_by に記録する */
  email: string;
}

export async function createOAuthStateToken(nonce: string, email: string): Promise<string> {
  return new SignJWT({ nonce, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(getAdminJwtSecretKey());
}

export async function verifyOAuthStateToken(token: string): Promise<OAuthStatePayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAdminJwtSecretKey());
    if (typeof payload.nonce !== 'string' || typeof payload.email !== 'string') {
      return null;
    }
    return { nonce: payload.nonce, email: payload.email };
  } catch {
    // 署名不正・期限切れはいずれも「このフローを信用しない」で同じ扱いにする
    return null;
  }
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Gmail連携に必要な環境変数が揃っているか。
 * リダイレクトURIは、Google Cloud側に登録した文字列と完全一致でなければ
 * redirect_uri_mismatch になる。コードにハードコードせず環境変数から読むことで、
 * 「www有無のズレ」を1か所（Vercelの環境変数）だけ見れば済むようにしている。
 */
export function isGmailConfigured(): boolean {
  return !!(
    process.env.GMAIL_OAUTH_CLIENT_ID &&
    process.env.GMAIL_OAUTH_CLIENT_SECRET &&
    process.env.GMAIL_OAUTH_REDIRECT_URI
  );
}

function createOAuthClient(): GmailOAuth2Client {
  if (!isGmailConfigured()) {
    throw new Error(
      'Gmail連携の環境変数が設定されていません（GMAIL_OAUTH_CLIENT_ID / GMAIL_OAUTH_CLIENT_SECRET / GMAIL_OAUTH_REDIRECT_URI）'
    );
  }
  return new google.auth.OAuth2(
    process.env.GMAIL_OAUTH_CLIENT_ID,
    process.env.GMAIL_OAUTH_CLIENT_SECRET,
    process.env.GMAIL_OAUTH_REDIRECT_URI
  );
}

/**
 * Googleの許可画面へのURLを作る。
 * access_type: 'offline' と prompt: 'consent' の両方が必要。
 * offlineだけだと2回目以降のconsentで refresh_token が返らず、
 * 「連携できたのに翌日から読めない」という分かりにくい壊れ方をする。
 */
export function buildAuthUrl(state: string): string {
  return createOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [GMAIL_SCOPE],
    include_granted_scopes: false,
    state,
  });
}

export interface GmailConnection {
  email: string | null;
  scope: string | null;
  connectedBy: string | null;
  connectedAt: string | null;
  updatedAt: string | null;
}

interface TokenRow {
  email: string | null;
  refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | null;
  scope: string | null;
  connected_by: string | null;
  connected_at: string | null;
  updated_at: string | null;
}

async function loadTokenRow(): Promise<TokenRow | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .eq('id', ROW_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`Gmail連携情報の読み込みに失敗しました: ${error.message}`);
  }
  return (data as TokenRow | null) ?? null;
}

/** 管理画面に表示する接続状態。トークン本体は絶対に返さない */
export async function getGmailConnection(): Promise<GmailConnection | null> {
  const row = await loadTokenRow();
  if (!row) return null;
  return {
    email: row.email,
    scope: row.scope,
    connectedBy: row.connected_by,
    connectedAt: row.connected_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 認証コードをトークンに交換して保存する。連携したGmailアドレスを返す。
 * refresh_token が返ってこなかった場合はエラーにする（保存しても後で使えないため）。
 */
export async function exchangeCodeAndSave(code: string, connectedBy: string): Promise<string | null> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error(
      'Googleからrefresh_tokenが返りませんでした。Googleアカウントの「サードパーティ製アプリ」から既存の許可を削除してから、もう一度連携してください。'
    );
  }

  client.setCredentials(tokens);

  // 連携先アドレスの確認。userinfo系のscopeは要求していないので、Gmail自身のプロフィールAPIで取得する
  let email: string | null = null;
  try {
    const gmail = google.gmail({ version: 'v1', auth: client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    email = profile.data.emailAddress ?? null;
  } catch (error) {
    // アドレスは表示用の付加情報なので、取得できなくても連携自体は成立させる
    console.error('Gmail profile fetch failed:', error);
  }

  const now = new Date().toISOString();
  const { error } = await getSupabase().from(TABLE).upsert(
    {
      id: ROW_ID,
      email,
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token ?? null,
      access_token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      scope: tokens.scope ?? GMAIL_SCOPE,
      connected_by: connectedBy,
      connected_at: now,
      updated_at: now,
    },
    { onConflict: 'id' }
  );

  if (error) {
    throw new Error(`Gmail連携情報の保存に失敗しました: ${error.message}`);
  }

  return email;
}

/**
 * 保存済みのrefresh tokenから、APIを叩ける状態のクライアントを返す。
 * アクセストークンの再発行はgoogleapis側が自動で行うので、
 * ここでは再発行された値をSupabaseへ書き戻すだけにする。
 */
export async function getAuthorizedGmailClient(): Promise<GmailOAuth2Client> {
  const row = await loadTokenRow();
  if (!row) {
    throw new Error('Gmailが連携されていません。管理画面から連携してください。');
  }

  const client = createOAuthClient();
  client.setCredentials({
    refresh_token: row.refresh_token,
    access_token: row.access_token ?? undefined,
    expiry_date: row.access_token_expires_at ? new Date(row.access_token_expires_at).getTime() : undefined,
  });

  client.on('tokens', (tokens) => {
    // 書き戻しは次回のAPI呼び出しを速くするためのキャッシュ更新であり、失敗しても処理は続行できる
    void getSupabase()
      .from(TABLE)
      .update({
        access_token: tokens.access_token ?? row.access_token,
        access_token_expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : row.access_token_expires_at,
        // Googleがrefresh_tokenを再発行した場合のみ上書きする（通常はundefinedで返る）
        ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', ROW_ID)
      .then(({ error }) => {
        if (error) console.error('Gmailトークンの更新保存に失敗:', error.message);
      });
  });

  return client;
}

/**
 * 連携を解除する。Google側の許可も取り消した上でSupabaseの行を消す。
 * Google側の取り消しが失敗しても、こちらの保存を消すことは必ず実行する
 * （鍵を持ち続けるほうが危険なため）。
 */
export async function disconnectGmail(): Promise<void> {
  const row = await loadTokenRow();

  if (row?.refresh_token) {
    try {
      await createOAuthClient().revokeToken(row.refresh_token);
    } catch (error) {
      console.error('Gmailトークンの失効処理に失敗（保存の削除は続行）:', error);
    }
  }

  const { error } = await getSupabase().from(TABLE).delete().eq('id', ROW_ID);
  if (error) {
    throw new Error(`Gmail連携情報の削除に失敗しました: ${error.message}`);
  }
}
