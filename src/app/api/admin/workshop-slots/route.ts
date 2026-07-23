import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { getClosedDates, CalendarUnavailableError } from '@/lib/workshopAvailability';
import { getOverridesInRange, setOverride } from '@/lib/workshopSlotOverrides';
import { WORKSHOP_SLOTS } from '@/lib/workshopBookingConfig';

const MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface DaySlots {
  date: string;
  closed: boolean;
  slots: Array<{ start: string; end: string; isOpen: boolean }>;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// 管理画面用: ワークショップ受付枠（月表示カレンダー）のON/OFF状態取得。認証必須
// （顧客への公開情報ではなく管理操作のためverifyAdminSession必須。公開の空き枠APIは
// src/app/api/workshop/availability/route.ts を参照）。
export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month');
    if (!monthParam || !MONTH_RE.test(monthParam)) {
      return NextResponse.json({ error: 'monthの形式が不正です（YYYY-MM）' }, { status: 400 });
    }

    const [yearStr, monthStr] = monthParam.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const lastDay = daysInMonth(year, month);
    const fromDate = `${monthParam}-01`;
    const toDate = `${monthParam}-${String(lastDay).padStart(2, '0')}`;

    let closedDates: Set<string>;
    let overrides: Awaited<ReturnType<typeof getOverridesInRange>>;
    try {
      [closedDates, overrides] = await Promise.all([
        getClosedDates(fromDate, toDate),
        getOverridesInRange(fromDate, toDate),
      ]);
    } catch (error) {
      if (error instanceof CalendarUnavailableError) {
        return NextResponse.json(
          { error: '休業日カレンダーを確認できません。しばらくしてから再度お試しください。' },
          { status: 503 }
        );
      }
      console.error('受付枠オーバーライドの取得に失敗しました:', error);
      return NextResponse.json(
        { error: '受付枠の取得に失敗しました。しばらくしてから再度お試しください。' },
        { status: 503 }
      );
    }

    // (date|startTime) -> isOpen（管理者が明示的に設定した枠のみ）
    const overrideMap = new Map(overrides.map(o => [`${o.date}|${o.startTime}`, o.isOpen]));

    const days: DaySlots[] = [];
    for (let day = 1; day <= lastDay; day++) {
      const date = `${monthParam}-${String(day).padStart(2, '0')}`;
      days.push({
        date,
        closed: closedDates.has(date),
        slots: WORKSHOP_SLOTS.map(slot => ({
          start: slot.start,
          end: slot.end,
          // オーバーライドが無ければ既定でOPEN
          isOpen: overrideMap.get(`${date}|${slot.start}`) ?? true,
        })),
      });
    }

    return NextResponse.json({ days });
  } catch (error) {
    console.error('ワークショップ受付枠取得エラー:', error);
    return NextResponse.json(
      { error: '受付枠の取得に失敗しました', details: error instanceof Error ? error.message : 'unknown' },
      { status: 500 }
    );
  }
}

interface SlotChange {
  date?: string;
  startTime?: string;
  isOpen?: boolean;
}

// 受付枠のON/OFFを一括更新する（管理画面の「まとめて保存」ボタンから呼ばれる想定）。認証必須。
export async function PUT(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = (await request.json()) as { changes?: SlotChange[] };
    const changes = body.changes;

    if (!Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json({ error: 'changesは必須です（1件以上の配列）' }, { status: 400 });
    }

    for (const change of changes) {
      if (!change.date || !DATE_RE.test(change.date)) {
        return NextResponse.json({ error: `dateの形式が不正です: ${change.date}` }, { status: 400 });
      }
      if (!change.startTime || !WORKSHOP_SLOTS.some(s => s.start === change.startTime)) {
        return NextResponse.json({ error: `startTimeが不正です: ${change.startTime}` }, { status: 400 });
      }
      if (typeof change.isOpen !== 'boolean') {
        return NextResponse.json(
          { error: `isOpenはbooleanで指定してください: ${change.date} ${change.startTime}` },
          { status: 400 }
        );
      }
    }

    // setOverrideを順次実行する（1件失敗しても残りは続行し、失敗した項目一覧を返す）
    const failed: Array<{ date: string; startTime: string; error: string }> = [];
    for (const change of changes) {
      try {
        await setOverride(change.date!, change.startTime!, change.isOpen!);
      } catch (error) {
        console.error(`受付枠オーバーライドの保存に失敗しました (${change.date} ${change.startTime}):`, error);
        failed.push({
          date: change.date!,
          startTime: change.startTime!,
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
    }

    if (failed.length > 0) {
      return NextResponse.json(
        { success: false, error: '一部の枠の保存に失敗しました', failed },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('ワークショップ受付枠更新エラー:', error);
    return NextResponse.json(
      { error: '受付枠の更新に失敗しました', details: error instanceof Error ? error.message : 'unknown' },
      { status: 500 }
    );
  }
}
