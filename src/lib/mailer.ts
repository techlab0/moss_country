// Nodemailerを使った軽量メール送信ユーティリティ。
// 送信基盤は環境変数で切替できる:
//   1) 汎用SMTP（AWS SES SMTP / Xserver など）: SMTP_HOST + SMTP_USER + SMTP_PASS を設定
//   2) 未設定時のフォールバック: Gmail（GMAIL_USER + GMAIL_APP_PASSWORD）
// 送信元アドレスは MAIL_FROM（例: info@mosscountry.com）。未設定時は認証ユーザーのアドレスを使う。
//
// 呼び出し元の処理フロー（注文保存・問い合わせ保存など）を絶対に壊さないよう、
// 未設定・送信失敗のいずれの場合も例外を投げず、sent: false を返すだけにする。

import nodemailer from 'nodemailer';

/**
 * 店舗（MOSS COUNTRY）宛の通知を受け取るメールアドレス。
 * 独自ドメイン運用時は STORE_EMAIL 環境変数（例: info@mosscountry.com）で上書きできる。
 */
export const STORE_EMAIL = process.env.STORE_EMAIL || 'moss.country.kokenokuni@gmail.com';

export interface SendMailParams {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

export type SendMailResult =
  | { sent: true }
  | { sent: false; reason: string };

interface MailerConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

// 送信基盤の設定を環境変数から解決する。汎用SMTP優先、無ければGmailにフォールバック。
function resolveMailerConfig(): MailerConfig | null {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  // 1) 汎用SMTP（AWS SES / Xserver など）
  if (smtpHost && smtpUser && smtpPass) {
    const port = Number(process.env.SMTP_PORT) || 587;
    // SMTP_SECURE 未指定なら、465はSSL(secure=true)、それ以外はSTARTTLS(secure=false)とみなす
    const secure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : port === 465;
    return {
      host: smtpHost,
      port,
      secure,
      user: smtpUser,
      pass: smtpPass,
      from: process.env.MAIL_FROM || smtpUser,
    };
  }

  // 2) フォールバック: Gmail
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailAppPassword) {
    return {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      user: gmailUser,
      pass: gmailAppPassword,
      from: process.env.MAIL_FROM || gmailUser,
    };
  }

  return null;
}

// transporterはモジュールロード時ではなく、実際に送信する時点まで生成を遅延させる。
// こうすることで、環境変数未設定でもビルド・他APIの動作に影響を与えない。
let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter(config: MailerConfig) {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
  }
  return cachedTransporter;
}

/**
 * メールを送信する。送信基盤未設定・送信失敗時は console.warn して
 * { sent: false, reason } を返す（throwしない）。
 */
export async function sendMail({ to, subject, text, html }: SendMailParams): Promise<SendMailResult> {
  const config = resolveMailerConfig();
  if (!config) {
    console.warn('[mailer] SMTP設定（SMTP_* もしくは GMAIL_*）が未設定のため、メール送信をスキップしました。', { subject });
    return { sent: false, reason: 'not-configured' };
  }

  const toList = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (toList.length === 0) {
    console.warn('[mailer] 送信先が空のため、メール送信をスキップしました。', { subject });
    return { sent: false, reason: 'no-recipient' };
  }

  try {
    const transporter = getTransporter(config);
    await transporter.sendMail({
      from: `"MOSS COUNTRY" <${config.from}>`,
      to: toList.join(', '),
      subject,
      text,
      ...(html ? { html } : {}),
    });

    return { sent: true };
  } catch (error) {
    console.warn('[mailer] メール送信中に例外が発生しました。', { subject, error });
    return { sent: false, reason: 'exception' };
  }
}
