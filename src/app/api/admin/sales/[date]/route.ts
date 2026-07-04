import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { getJstDayBoundariesUtc, dailySalesDocId, DATE_PATTERN } from '@/lib/salesAggregation';
import { syncDailySalesToSheet } from '@/lib/googleSheets';

interface LineItemInput {
  salesItemId: string;
  quantity?: number;
  amount?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { date } = await params;
    if (!DATE_PATTERN.test(date)) {
      return NextResponse.json({ error: '日付の形式が不正です' }, { status: 400 });
    }

    const docId = dailySalesDocId(date);
    const dailySales = await writeClient.fetch(
      `*[_id == $id][0]{
        _id,
        date,
        visitorCount,
        purchaseGroupCount,
        lineItems[]{ "salesItemId": salesItem._ref, quantity, amount },
        cashAmount,
        payPayAmount,
        manualCardAmount,
        wordOfMouthDiscount,
        adjustment,
        notes,
        updatedAt
      }`,
      { id: docId }
    );

    // EC（オンライン）のその日の支払い済み注文を自動集計する
    const { start, end } = getJstDayBoundariesUtc(date);
    const paidOrders: Array<{ total?: number }> = await writeClient.fetch(
      `*[_type == "order" && paymentStatus == "paid" && createdAt >= $start && createdAt < $end]{ total }`,
      { start, end }
    );
    const ecTotal = paidOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    // 店頭QRコード決済のその日の支払い済み分を自動集計する
    const paidCharges: Array<{ amount?: number }> = await writeClient.fetch(
      `*[_type == "inStoreCharge" && status == "paid" && paidAt >= $start && paidAt < $end]{ amount }`,
      { start, end }
    );
    const qrChargeTotal = paidCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);

    return NextResponse.json({ dailySales: dailySales || null, ecTotal, qrChargeTotal });
  } catch (error) {
    console.error('日別売上取得エラー:', error);
    return NextResponse.json(
      { error: '日別売上の取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { date } = await params;
    if (!DATE_PATTERN.test(date)) {
      return NextResponse.json({ error: '日付の形式が不正です' }, { status: 400 });
    }

    const body = await request.json();
    const lineItemsInput: LineItemInput[] = Array.isArray(body.lineItems) ? body.lineItems : [];

    const lineItems = lineItemsInput
      .filter(item => item.salesItemId)
      .map(item => ({
        _type: 'lineItem',
        _key: item.salesItemId,
        salesItem: { _type: 'reference', _ref: item.salesItemId },
        quantity: item.quantity,
        amount: item.amount,
      }));

    const docId = dailySalesDocId(date);
    const doc = {
      _id: docId,
      _type: 'dailySales',
      date,
      visitorCount: body.visitorCount ?? 0,
      purchaseGroupCount: body.purchaseGroupCount ?? 0,
      lineItems,
      cashAmount: body.cashAmount ?? 0,
      payPayAmount: body.payPayAmount ?? 0,
      manualCardAmount: body.manualCardAmount ?? 0,
      wordOfMouthDiscount: body.wordOfMouthDiscount ?? 0,
      adjustment: body.adjustment ?? 0,
      notes: body.notes || '',
      updatedAt: new Date().toISOString(),
    };

    const saved = await writeClient.createOrReplace(doc);

    // バックアップ用のGoogleスプレッドシート同期（ベストエフォート、失敗しても保存は成功のまま返す）
    await syncToSheetBestEffort(date, doc, lineItemsInput);

    return NextResponse.json({ dailySales: saved });
  } catch (error) {
    console.error('日別売上保存エラー:', error);
    return NextResponse.json(
      { error: '日別売上の保存に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * 保存した日別売上のサマリーを計算し、バックアップ用Googleスプレッドシートへ同期する。
 * ここでの失敗は保存処理の成功に影響させない（ログのみ）。
 */
async function syncToSheetBestEffort(
  date: string,
  doc: {
    visitorCount: number;
    purchaseGroupCount: number;
    cashAmount: number;
    payPayAmount: number;
    manualCardAmount: number;
    wordOfMouthDiscount: number;
    adjustment: number;
  },
  lineItemsInput: LineItemInput[]
) {
  try {
    const salesItemIds = lineItemsInput.map(item => item.salesItemId).filter(Boolean);
    const salesItemsMeta: Array<{ _id: string; category: string; pricingType: string; unitPrice?: number }> = salesItemIds.length
      ? await writeClient.fetch(
          `*[_type == "salesItem" && _id in $ids]{ _id, category, pricingType, unitPrice }`,
          { ids: salesItemIds }
        )
      : [];
    const metaById = new Map(salesItemsMeta.map(m => [m._id, m]));

    const categorySubtotals: Record<string, number> = {};
    for (const item of lineItemsInput) {
      const meta = metaById.get(item.salesItemId);
      if (!meta) continue;
      const lineTotal = meta.pricingType === 'fixed'
        ? (item.quantity || 0) * (meta.unitPrice || 0)
        : (item.amount || 0);
      categorySubtotals[meta.category] = (categorySubtotals[meta.category] || 0) + lineTotal;
    }

    const { start, end } = getJstDayBoundariesUtc(date);
    const [paidOrders, paidCharges]: [Array<{ total?: number }>, Array<{ amount?: number }>] = await Promise.all([
      writeClient.fetch(
        `*[_type == "order" && paymentStatus == "paid" && createdAt >= $start && createdAt < $end]{ total }`,
        { start, end }
      ),
      writeClient.fetch(
        `*[_type == "inStoreCharge" && status == "paid" && paidAt >= $start && paidAt < $end]{ amount }`,
        { start, end }
      ),
    ]);
    const ecTotal = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const qrChargeTotal = paidCharges.reduce((sum, c) => sum + (c.amount || 0), 0);

    const paymentTotal =
      doc.cashAmount + doc.payPayAmount + doc.manualCardAmount + doc.adjustment - doc.wordOfMouthDiscount;
    const grandTotal = paymentTotal + ecTotal + qrChargeTotal;

    await syncDailySalesToSheet({
      date,
      visitorCount: doc.visitorCount,
      purchaseGroupCount: doc.purchaseGroupCount,
      categorySubtotals,
      cashAmount: doc.cashAmount,
      payPayAmount: doc.payPayAmount,
      manualCardAmount: doc.manualCardAmount,
      ecTotal,
      qrChargeTotal,
      grandTotal,
    });
  } catch (error) {
    console.error('売上サマリー計算またはシート同期に失敗しました（保存自体は成功しています）:', error);
  }
}
