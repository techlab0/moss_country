// じゃらん側で在庫を閉じるべき受付枠の一覧。
//
// じゃらんは在庫を外部から操作できないため、この一覧を見てACTIVITY BOARDで手動で閉じる。

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import {
  computeSlotStatuses,
  getRegisteredCalendarMonths,
  CalendarUnavailableError,
} from '@/lib/workshopAvailability';
import {
  findSlotsToCloseOnJalan,
  findFullyClosedDates,
  filterToRegisteredMonths,
  LOW_REMAINING_THRESHOLD,
} from '@/lib/jalanSlotAlerts';
import { WORKSHOP_SLOTS } from '@/lib/workshopBookingConfig';
import { todayJstDateStr } from '@/lib/workshopBookingConfig';
import { checkCapacityConsistency } from '@/lib/workshopCapacityCheck';
import { parsePositiveInt } from '@/lib/requestParams';

/** 既定で何日先まで見るか。長くするほどGoogleカレンダー参照が増えるので既定は短めにする */
const DEFAULT_DAYS = 30;
const MAX_DAYS = 60;

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

    const days = parsePositiveInt(request.nextUrl.searchParams.get('days'), DEFAULT_DAYS, {
      max: MAX_DAYS,
    });

    const from = todayJstDateStr();
    const to = addDays(from, days);

    // computeAvailableSlots ではなく computeSlotStatuses を使う。
    // 前者は予約可能な枠しか返さないため、満席・休業日という最も知らせたい枠が落ちる。
    const statuses = await computeSlotStatuses(from, to);

    // 営業日カレンダーを登録していない月は「休業」ではなく「予定が未定」。
    // そこまで警告すると月まるごとが一覧に並び、本当に対応が必要な日が埋もれる。
    const registeredMonths = await getRegisteredCalendarMonths(from, to);
    const alerts = filterToRegisteredMonths(findSlotsToCloseOnJalan(statuses), registeredMonths);

    // 定員設定の不整合もここで返す。受付枠に関わる問題を1画面で拾えるようにするため
    // （専用の診断画面を作っても見に行かないので、日常的に開く画面に出す）。
    const capacityCheck = await checkCapacityConsistency();

    return NextResponse.json({
      from,
      to,
      threshold: LOW_REMAINING_THRESHOLD,
      // 画面に「どの月を見ているか」を出すため。警告が0件のとき、
      // 対応不要なのか未登録で対象外なのかを区別できるようにする
      registeredMonths: [...registeredMonths].sort(),
      alerts,
      // 終日閉じている日は日単位でまとめて見せる（枠ごとに並べると件数が多くなりすぎる）
      fullyClosedDates: findFullyClosedDates(alerts, WORKSHOP_SLOTS.length),
      capacityCheck,
    });
  } catch (error) {
    // カレンダーが引けないと空き人数が確定できない。空配列を返すと「対応不要」に
    // 見えてしまい閉じ忘れにつながるため、明示的にエラーとして扱う。
    if (error instanceof CalendarUnavailableError) {
      return NextResponse.json(
        { error: 'Googleカレンダーを確認できないため、空き枠を判定できませんでした' },
        { status: 503 }
      );
    }
    console.error('Jalan slot alerts error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
