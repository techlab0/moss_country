import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { describeMailerConfig, sendMail, verifyMailerConnection, STORE_EMAIL } from '@/lib/mailer';

// メール送信基盤（AWS SES SMTP / Gmail）の接続を診断する管理者用エンドポイント。
// SES切替直後に「認証情報が正しいか」「リージョンのエンドポイントが合っているか」
// 「送信元アドレスが検証済みか」を、問い合わせフォームを実際に叩かずに切り分けるために用意した。
//
// GET  : 設定値（機密値はマスク）とSMTP接続・認証の可否を返す。メールは送らない。
// POST : STORE_EMAIL 宛にテストメールを1通送る。宛先は固定で、リクエストからは指定できない
//        （任意の宛先に送れるとスパム踏み台になるため）。

/**
 * 認証情報そのものを出さずに、535の典型的な原因を切り分けるための形式チェック。
 *
 * SESのSMTPパスワードは「シークレットアクセスキーをリージョン込みで変換した値」であり、
 * IAMのシークレットアクセスキーとは別物。両者は見た目が似ているうえ、SMTPユーザー名は
 * どちらも AKIA で始まるため取り違えやすい。長さで判別できる:
 *   - SESのSMTPパスワード: 44文字・末尾が "="（33バイトのBase64）
 *   - IAMのシークレットアクセスキー: 40文字・"=" なし
 */
function inspectCredentials() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const looksLikeIamSecret = !!pass && pass.length === 40 && !pass.endsWith('=');
  const looksLikeSmtpPassword = !!pass && pass.length === 44 && pass.endsWith('=');

  return {
    userLength: user?.length ?? 0,
    passLength: pass?.length ?? 0,
    // Vercelの入力欄への貼り付けで前後に空白や改行が混ざると、値は正しくても535になる
    userHasSurroundingWhitespace: !!user && user !== user.trim(),
    passHasSurroundingWhitespace: !!pass && pass !== pass.trim(),
    looksLikeSmtpPassword,
    looksLikeIamSecret,
  };
}

export async function GET(request: NextRequest) {
  const session = await verifyAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const config = describeMailerConfig();
  const credentials = inspectCredentials();
  const connection = await verifyMailerConnection();

  const hints: string[] = [];
  if (!connection.ok) {
    if (credentials.looksLikeIamSecret) {
      hints.push(
        'SMTP_PASS が40文字でIAMのシークレットアクセスキーの形式です。SESのSMTPパスワード（44文字・末尾"="）ではありません。SESコンソールの「SMTP設定」→「SMTP認証情報の作成」で発行し直してください。'
      );
    } else if (credentials.passLength > 0 && !credentials.looksLikeSmtpPassword) {
      hints.push(
        `SMTP_PASS が${credentials.passLength}文字で、SESのSMTPパスワード（44文字・末尾"="）の形式と一致しません。値が途中で切れていないか確認してください。`
      );
    }
    if (credentials.userHasSurroundingWhitespace || credentials.passHasSurroundingWhitespace) {
      hints.push('SMTP_USER または SMTP_PASS の前後に空白・改行が混ざっています。貼り付け直してください。');
    }
    if (connection.error?.includes('535')) {
      hints.push(
        'SESのSMTP認証情報はリージョンごとに別物です。別リージョンで発行したものは、このエンドポイント（' +
          `${config.host}）では必ず535になります。同じリージョンで発行し直してください。`
      );
    }
    if (connection.error?.includes('ETIMEDOUT') || connection.error?.includes('ENOTFOUND')) {
      hints.push('SMTPホスト名かポートに到達できません。SMTP_HOST と SMTP_PORT を確認してください。');
    }
  }

  return NextResponse.json({
    config,
    credentials,
    connection,
    hints: hints.length > 0 ? hints : null,
  });
}

export async function POST(request: NextRequest) {
  const session = await verifyAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const sentAt = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  const result = await sendMail({
    to: STORE_EMAIL,
    subject: '【MOSS COUNTRY】メール送信テスト',
    text: [
      'これは管理画面から送信したテストメールです。',
      'このメールが届いていれば、問い合わせフォーム・注文確認・予約確認の各メールも送信できます。',
      '',
      `送信日時: ${sentAt}`,
      `送信元: ${describeMailerConfig().from ?? '(不明)'}`,
      '',
      '迷惑メールフォルダに入っていた場合は、DKIM/SPF/DMARCの設定を確認してください。',
    ].join('\n'),
  });

  return NextResponse.json({
    ...result,
    to: STORE_EMAIL,
    config: describeMailerConfig(),
  });
}
