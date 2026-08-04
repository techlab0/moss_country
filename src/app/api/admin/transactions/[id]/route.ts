import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { resolveStoreLineItems, adjustDailyCounters, applyDiscount, DiscountType, StoreLineItemInput } from '@/lib/storeSales';
import { applyStoreSaleInventory, revertStoreSaleInventory, type StoreInventoryLine } from '@/lib/storeInventory';

const PAYMENT_METHODS = ['cash', 'payPay', 'card'] as const;
const DISCOUNT_TYPES = ['amount', 'percent'] as const;

interface ExistingTransaction {
  _id: string;
  date: string;
  visitorCount?: number;
  itemCount: number;
  subtotal?: number;
  discountType?: DiscountType;
  discountValue?: number;
  // 在庫を戻すために、変更前の明細（売上項目と数量）も取得する
  lineItems?: StoreInventoryLine[];
  source?: string;
}

async function fetchExisting(id: string): Promise<ExistingTransaction | null> {
  return writeClient.fetch(
    `*[_type == "storeTransaction" && _id == $id][0]{
      _id, date, visitorCount, "itemCount": count(lineItems),
      subtotal, discountType, discountValue, source,
      lineItems[]{ quantity, "salesItemId": salesItem._ref }
    }`,
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

    // 明細か割引のどちらかが変わっていれば、両方を踏まえて合計を再計算する
    const lineItemsChanged = Array.isArray(body.lineItems);
    const discountChanged = body.discountType !== undefined || body.discountValue !== undefined;
    if (lineItemsChanged || discountChanged) {
      let subtotal: number;
      if (lineItemsChanged) {
        const { lineItems, total } = await resolveStoreLineItems(body.lineItems as StoreLineItemInput[]);
        updates.lineItems = lineItems;
        subtotal = total;
        groupDelta = (lineItems.length > 0 ? 1 : 0) - ((existing.itemCount || 0) > 0 ? 1 : 0);
      } else {
        subtotal = existing.subtotal || 0;
      }

      const discountType = discountChanged
        ? (DISCOUNT_TYPES.includes(body.discountType) ? (body.discountType as DiscountType) : undefined)
        : existing.discountType;
      const discountValue = discountChanged ? (Number(body.discountValue) || 0) : (existing.discountValue || 0);

      const { discountAmount, total } = applyDiscount(subtotal, discountType, discountValue);
      updates.subtotal = subtotal;
      updates.discountType = discountType;
      updates.discountValue = discountType ? discountValue : undefined;
      updates.discountAmount = discountAmount;
      updates.total = total;
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

    if (typeof body.notes === 'string') {
      updates.notes = body.notes.trim() || undefined;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '変更内容がありません' }, { status: 400 });
    }

    const transaction = await writeClient.patch(id).set(updates).commit();
    await adjustDailyCounters(existing.date, visitorDelta, groupDelta);

    // 明細を差し替えた場合は、旧明細分の在庫を戻してから新明細分を引き落とす。
    // 過去分の一括入力（source: 'historical'）は登録時に在庫を動かしていないため対象外。
    if (lineItemsChanged && existing.source !== 'historical') {
      try {
        await revertStoreSaleInventory(existing.lineItems || [], `店頭会計の修正 ${id}`);
        await applyStoreSaleInventory((updates.lineItems as StoreInventoryLine[]) || [], `店頭会計の修正 ${id}`);
      } catch (inventoryError) {
        console.error('店頭会計修正時の在庫調整に失敗しました（棚卸しで調整してください）:', inventoryError);
      }
    }

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

    // 誤登録の取り消しなので、引き落とした在庫を戻す（過去分の一括入力は元々動かしていない）
    if (existing.source !== 'historical') {
      try {
        await revertStoreSaleInventory(existing.lineItems || [], `店頭会計の削除 ${id}`);
      } catch (inventoryError) {
        console.error('店頭会計削除時の在庫戻しに失敗しました（棚卸しで調整してください）:', inventoryError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('店頭取引削除エラー:', error);
    return NextResponse.json(
      { error: '取引の削除に失敗しました' },
      { status: 500 }
    );
  }
}
