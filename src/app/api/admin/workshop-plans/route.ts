import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { countUpcomingBookingsByPlan } from '@/lib/workshopBookings';
import { todayJst } from '@/lib/salesAggregation';

// ワークショップの予約プラン（Sanityの simpleWorkshop）の管理API。
// これまではSanity Studioからしか編集できなかったため、管理画面から追加・編集・削除できるようにする。
//
// 公開側（/workshop/booking のプラン一覧、予約作成時の価格再検証）は同じ simpleWorkshop を
// 参照する。読み取りはCDN経由のクライアントだが、Sanityは更新時にCDNをパージするため
// ここでの変更は速やかに反映される。

interface PlanInput {
  title?: unknown;
  description?: unknown;
  price?: unknown;
  duration?: unknown;
}

/** 入力を検証して保存用の値に正規化する。エラー文言を返した場合は保存しない。 */
export function normalizePlanInput(body: PlanInput): { error: string } | {
  title: string;
  description: string;
  price: number;
  duration: string;
} {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return { error: 'プラン名は必須です' };
  }

  // 料金は予約時の請求額になるため、0以下や数値でない値は保存させない
  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    return { error: '料金は1円以上の数値で入力してください' };
  }

  return {
    title,
    description: typeof body.description === 'string' ? body.description.trim() : '',
    price: Math.round(price),
    duration: typeof body.duration === 'string' ? body.duration.trim() : '',
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 下書き（drafts.*）は公開側の一覧に出ないため、管理画面でも除外して実態を揃える
    const plans = await writeClient.fetch(`
      *[_type == "simpleWorkshop" && !(_id in path("drafts.**"))] | order(title asc) {
        _id,
        title,
        description,
        price,
        duration
      }
    `);

    // 削除時の警告に使うため、プランごとの未開催予約件数を添えて返す
    const upcomingCounts = await countUpcomingBookingsByPlan(todayJst());
    const plansWithUsage = (plans as Array<{ _id: string }>).map(plan => ({
      ...plan,
      upcomingBookingCount: upcomingCounts[plan._id] || 0,
    }));

    return NextResponse.json({ plans: plansWithUsage });
  } catch (error) {
    console.error('ワークショッププラン取得エラー:', error);
    return NextResponse.json({ error: 'プランの取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const normalized = normalizePlanInput(await request.json());
    if ('error' in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const plan = await writeClient.create({
      _type: 'simpleWorkshop',
      ...normalized,
    });

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('ワークショッププラン作成エラー:', error);
    return NextResponse.json({ error: 'プランの作成に失敗しました' }, { status: 500 });
  }
}
