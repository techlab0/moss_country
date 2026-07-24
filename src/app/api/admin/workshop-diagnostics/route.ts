import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { isCalendarConfigured, getBusyIntervals } from '@/lib/googleCalendar';

// ワークショップ予約のGoogleカレンダー接続を診断する管理者用エンドポイント。
// 空き枠APIが503になる原因（環境変数未設定 / Calendar API未有効 / 共有ミス / カレンダーID誤り）を
// 実際のエラーメッセージから切り分けるために一時的に用意した。認証必須・機密値はマスクして返す。
function mask(value: string | undefined): string {
  if (!value) return '(未設定)';
  if (value.length <= 8) return `設定あり(${value.length}文字)`;
  return `${value.slice(0, 4)}…${value.slice(-6)}`;
}

export async function GET(request: NextRequest) {
  const session = await verifyAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const env = {
    GOOGLE_SERVICE_ACCOUNT_EMAIL: mask(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
      ? `設定あり(${process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.length}文字)`
      : '(未設定)',
    GOOGLE_CALENDAR_ID: mask(process.env.GOOGLE_CALENDAR_ID),
    isCalendarConfigured: isCalendarConfigured(),
  };

  let busyTest: { ok: boolean; result?: unknown; error?: string } = { ok: false };
  try {
    const now = new Date();
    const start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const busy = await getBusyIntervals(start.toISOString(), end.toISOString());
    busyTest = { ok: true, result: busy };
  } catch (error) {
    // Googleのエラーは「API未有効」「Not Found(カレンダーID誤り)」「forbidden(共有ミス)」等を含む
    busyTest = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  return NextResponse.json({ env, busyTest });
}
