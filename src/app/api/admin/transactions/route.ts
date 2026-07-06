import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { DATE_PATTERN, todayJst } from '@/lib/salesAggregation';
import { resolveStoreLineItems, adjustDailyCounters, StoreLineItemInput } from '@/lib/storeSales';

const PAYMENT_METHODS = ['cash', 'payPay', 'card'] as const;

// 店頭取引（1会計 = 1レコード）の登録。
// 現金・PayPay・手動カード用。QRコード決済は /api/admin/in-store-charge が担当する。
export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const paymentMethod = PAYMENT_METHODS.includes(body.paymentMethod) ? body.paymentMethod : 'cash';
    const visitorCount = Math.max(0, Number(body.visitorCount) || 0);
    const lineItemsInput: StoreLineItemInput[] = Array.isArray(body.lineItems) ? body.lineItems : [];
    const date = typeof body.date === 'string' && DATE_PATTERN.test(body.date) ? body.date : todayJst();
    const isHistorical = body.isHistorical === true;

    const { lineItems, total } = await resolveStoreLineItems(lineItemsInput);

    // 商品なしでも人数があれば「来店のみ」として登録できる。両方空は登録する意味がないためエラー
    if (lineItems.length === 0 && visitorCount <= 0) {
      return NextResponse.json({ error: '商品または来店人数を入力してください' }, { status: 400 });
    }

    const transaction = await writeClient.create({
      _type: 'storeTransaction',
      date,
      createdAt: new Date().toISOString(),
      paymentMethod,
      visitorCount,
      lineItems,
      total,
      source: isHistorical ? 'historical' : undefined,
    });

    // 過去の手書き記録の一括入力では、来店者数・購入組数は集計タブの手動欄で別途管理するため、
    // 取引作成のたびに加算すると二重加算になってしまう。そのためカウンタ加算はスキップする。
    if (!isHistorical) {
      await adjustDailyCounters(date, visitorCount, lineItems.length > 0 ? 1 : 0);
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('店頭取引登録エラー:', error);
    const message = error instanceof Error ? error.message : '取引の登録に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// その日の取引一覧
export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const date = request.nextUrl.searchParams.get('date') || todayJst();
    if (!DATE_PATTERN.test(date)) {
      return NextResponse.json({ error: '日付の形式が不正です' }, { status: 400 });
    }

    const transactions = await writeClient.fetch(
      `*[_type == "storeTransaction" && date == $date] | order(createdAt desc) {
        _id, createdAt, paymentMethod, visitorCount, total, source,
        lineItems[]{ name, quantity, amount, "salesItemId": salesItem._ref }
      }`,
      { date }
    );

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('店頭取引一覧取得エラー:', error);
    return NextResponse.json(
      { error: '取引一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
