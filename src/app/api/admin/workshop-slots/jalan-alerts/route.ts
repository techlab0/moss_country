// じゃらん側で在庫を閉じるべき受付枠の一覧。
//
// じゃらんは在庫を外部から操作できないため、この一覧を見てACTIVITY BOARDで手動で閉じる。

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { computeAvailableSlots, CalendarUnavailableError } from '@/lib/workshopAvailability';
import { findSlotsToCloseOnJalan, LOW_REMAINING_THRESHOLD } from '@/lib/jalanSlotAlerts';
import { todayJstDateStr } from '@/lib/workshopBookingConfig';
import { checkCapacityConsistency } from '@/lib/workshopCapacityCheck';

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

    const requested = Number(request.nextUrl.searchParams.get('days'));
    const days = Math.max(1, Math.min(Number.isFinite(requested) ? requested : DEFAULT_DAYS, MAX_DAYS));

    const from = todayJstDateStr();
    const to = addDays(from, days);

    const slots = await computeAvailableSlots(from, to);
    const alerts = findSlotsToCloseOnJalan(slots);

    // 定員設定の不整合もここで返す。受付枠に関わる問題を1画面で拾えるようにするため
    // （専用の診断画面を作っても見に行かないので、日常的に開く画面に出す）。
    const capacityCheck = await checkCapacityConsistency();

    return NextResponse.json({
      from,
      to,
      threshold: LOW_REMAINING_THRESHOLD,
      alerts,
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
