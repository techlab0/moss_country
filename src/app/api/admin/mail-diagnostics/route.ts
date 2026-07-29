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

export async function GET(request: NextRequest) {
  const session = await verifyAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const config = describeMailerConfig();
  const connection = await verifyMailerConnection();

  return NextResponse.json({
    config,
    connection,
    hint: connection.ok
      ? null
      : 'エラーに 535 が含まれる場合はSMTP認証情報が誤っている（SESの認証情報はリージョンごとに別物。SMTP_HOST のリージョンと一致しているか確認）。ETIMEDOUT の場合はホスト名かポートを確認。',
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
