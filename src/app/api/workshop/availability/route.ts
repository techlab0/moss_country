import { NextRequest, NextResponse } from 'next/server';
import { getSimpleWorkshopById } from '@/lib/sanity';
import { computeAvailableSlots, CalendarUnavailableError } from '@/lib/workshopAvailability';
import { todayJstDateStr, maxBookableDateStr } from '@/lib/workshopBookingConfig';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 公開API（予約ページ用の空き枠一覧）。認証不要（返す内容は公開情報のみ）。
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const planId = searchParams.get('planId') || undefined;

    if (fromParam && !DATE_RE.test(fromParam)) {
      return NextResponse.json({ error: 'fromの形式が不正です（YYYY-MM-DD）' }, { status: 400 });
    }
    if (toParam && !DATE_RE.test(toParam)) {
      return NextResponse.json({ error: 'toの形式が不正です（YYYY-MM-DD）' }, { status: 400 });
    }

    const today = todayJstDateStr();
    const maxDate = maxBookableDateStr();

    // 受付可能な範囲（今日〜ADVANCE_DAYS日後）にクランプする
    const fromDate = fromParam && fromParam > today ? fromParam : today;
    const toDate = toParam && toParam < maxDate ? toParam : maxDate;

    // プラン指定があれば実在確認のみ行う（枠の時間帯はWORKSHOP_SLOTSの固定windowでプランに依存しないため、
    // durationの解決は不要。ただし存在しないplanIdでの呼び出しは弾く）
    if (planId) {
      const plan = await getSimpleWorkshopById(planId);
      if (!plan) {
        return NextResponse.json({ error: '指定されたワークショッププランが見つかりません' }, { status: 400 });
      }
    }

    const available = await computeAvailableSlots(fromDate, toDate);
    return NextResponse.json({ available });
  } catch (error) {
    if (error instanceof CalendarUnavailableError) {
      console.error('空き枠取得: カレンダー確認不可:', error);
      return NextResponse.json(
        { error: '予約カレンダーに接続できません。しばらくしてから再度お試しください。' },
        { status: 503 }
      );
    }
    console.error('ワークショップ空き枠取得エラー:', error);
    return NextResponse.json(
      { error: '空き枠の取得に失敗しました', details: error instanceof Error ? error.message : 'unknown' },
      { status: 500 }
    );
  }
}
