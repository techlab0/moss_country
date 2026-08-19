// 連携中のGoogleカレンダーを管理画面で閲覧するためのAPI（読み取り専用）。
//
// Googleカレンダーの埋め込み（iframe）は使わない。埋め込みはカレンダーを公開設定に
// しないと表示されず、予定のタイトルにお客様の氏名が入っているため公開できない。
// 既にサービスアカウントで読み取れるので、こちらで取得して自前で表示する。
//
// 既存の /api/admin/calendar は営業日カレンダー（Supabaseのcalendar_events）で別物。

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { listCalendarEvents, isCalendarConfigured } from '@/lib/googleCalendar';
import { jstDateTimeToIso, addMinutesToIso } from '@/lib/workshopBookingConfig';
import { parsePositiveInt } from '@/lib/requestParams';

/** 既定の表示日数。管理画面は月単位で見るため1か月強を既定にする */
const DEFAULT_DAYS = 31;
const MAX_DAYS = 62;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    if (!isCalendarConfigured()) {
      return NextResponse.json(
        { error: 'Googleカレンダーが設定されていません' },
        { status: 503 }
      );
    }

    const params = request.nextUrl.searchParams;
    const fromParam = params.get('from');
    const from = fromParam && DATE_RE.test(fromParam) ? fromParam : new Date().toISOString().slice(0, 10);
    const days = parsePositiveInt(params.get('days'), DEFAULT_DAYS, { max: MAX_DAYS });
    const to = addDays(from, days);

    // JSTの暦日で[from, to)を切り出す
    const startISO = jstDateTimeToIso(from, '00:00');
    const endISO = addMinutesToIso(jstDateTimeToIso(to, '00:00'), 0);

    const events = await listCalendarEvents(startISO, endISO);

    return NextResponse.json({ from, to, events });
  } catch (error) {
    console.error('Google calendar list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'カレンダーを取得できませんでした' },
      { status: 500 }
    );
  }
}
