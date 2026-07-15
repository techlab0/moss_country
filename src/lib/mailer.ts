// Gmail SMTP（Nodemailer）を使った軽量メール送信ユーティリティ。
// 呼び出し元の処理フロー（注文保存・問い合わせ保存など）を絶対に壊さないよう、
// 未設定・送信失敗のいずれの場合も例外を投げず、sent: false を返すだけにする。

import nodemailer from 'nodemailer';

/** 店舗（MOSS COUNTRY）の受信用メールアドレス */
export const STORE_EMAIL = 'moss.country.kokenokuni@gmail.com';

export interface SendMailParams {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

export type SendMailResult =
  | { sent: true }
  | { sent: false; reason: string };

// transporterはモジュールロード時ではなく、実際に送信する時点まで生成を遅延させる。
// こうすることで、環境変数未設定でもビルド・他APIの動作に影響を与えない。
let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter(gmailUser: string, gmailAppPassword: string) {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });
  }
  return cachedTransporter;
}

/**
 * Gmail SMTP経由でメールを送信する。
 * GMAIL_USER / GMAIL_APP_PASSWORD が未設定の場合や送信失敗時はconsole.warnして
 * { sent: false, reason } を返す（throwしない）。
 */
export async function sendMail({ to, subject, text, html }: SendMailParams): Promise<SendMailResult> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.warn('[mailer] GMAIL_USER または GMAIL_APP_PASSWORD が未設定のため、メール送信をスキップしました。', { subject });
    return { sent: false, reason: 'not-configured' };
  }

  const toList = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (toList.length === 0) {
    console.warn('[mailer] 送信先が空のため、メール送信をスキップしました。', { subject });
    return { sent: false, reason: 'no-recipient' };
  }

  try {
    const transporter = getTransporter(gmailUser, gmailAppPassword);
    await transporter.sendMail({
      from: `"MOSS COUNTRY" <${gmailUser}>`,
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
