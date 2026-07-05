import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { resolveStoreLineItems, adjustDailyCounters, StoreLineItemInput } from '@/lib/storeSales';

const PAYMENT_METHODS = ['cash', 'payPay', 'card'] as const;

interface ExistingTransaction {
  _id: string;
  date: string;
  visitorCount?: number;
  itemCount: number;
}

async function fetchExisting(id: string): Promise<ExistingTransaction | null> {
  return writeClient.fetch(
    `*[_type == "storeTransaction" && _id == $id][0]{ _id, date, visitorCount, "itemCount": count(lineItems) }`,
    { id }
  );
}

// 取引の修正（明細・支払い方法・人数）。金額はサーバー側でカタログ単価から再計算する
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await fetchExisting(id);
    if (!existing) {
      return NextResponse.json({ error: '取引が見つかりません' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    let visitorDelta = 0;
    let groupDelta = 0;

    if (Array.isArray(body.lineItems)) {
      const { lineItems, total } = await resolveStoreLineItems(body.lineItems as StoreLineItemInput[]);
      updates.lineItems = lineItems;
      updates.total = total;
      groupDelta = (lineItems.length > 0 ? 1 : 0) - ((existing.itemCount || 0) > 0 ? 1 : 0);
    }

    if (body.paymentMethod !== undefined) {
      if (!PAYMENT_METHODS.includes(body.paymentMethod)) {
        return NextResponse.json({ error: '支払い方法が不正です' }, { status: 400 });
      }
      updates.paymentMethod = body.paymentMethod;
    }

    if (body.visitorCount !== undefined) {
      const newVisitorCount = Math.max(0, Number(body.visitorCount) || 0);
      visitorDelta = newVisitorCount - (existing.visitorCount || 0);
      updates.visitorCount = newVisitorCount;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '変更内容がありません' }, { status: 400 });
    }

    const transaction = await writeClient.patch(id).set(updates).commit();
    await adjustDailyCounters(existing.date, visitorDelta, groupDelta);

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('店頭取引更新エラー:', error);
    const message = error instanceof Error ? error.message : '取引の更新に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 誤登録した取引の削除。日別カウンタも巻き戻す
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await fetchExisting(id);
    if (!existing) {
      return NextResponse.json({ error: '取引が見つかりません' }, { status: 404 });
    }

    await writeClient.delete(id);
    await adjustDailyCounters(
      existing.date,
      -(existing.visitorCount || 0),
      (existing.itemCount || 0) > 0 ? -1 : 0
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('店頭取引削除エラー:', error);
    return NextResponse.json(
      { error: '取引の削除に失敗しました' },
      { status: 500 }
    );
  }
}
