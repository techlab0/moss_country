import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { getJstDayBoundariesUtc, dailySalesDocId, DATE_PATTERN } from '@/lib/salesAggregation';
import { syncDailySalesToSheet } from '@/lib/googleSheets';

interface LineItemInput {
  salesItemId: string;
  cashQuantity?: number;
  cashAmount?: number;
  payPayQuantity?: number;
  payPayAmount?: number;
  cardQuantity?: number;
  cardAmount?: number;
}

interface SalesItemMeta {
  _id: string;
  category: string;
  pricingType: string;
  unitPrice?: number;
}

// 数量入力(fixed)なら単価×数量、金額直接入力(variable)ならその金額を返す
function resolveAmount(meta: SalesItemMeta, quantity?: number, amount?: number): number {
  return meta.pricingType === 'fixed' ? (quantity || 0) * (meta.unitPrice || 0) : (amount || 0);
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
        lineItems[]{
          "salesItemId": salesItem._ref,
          cashQuantity, cashAmount,
          payPayQuantity, payPayAmount,
          cardQuantity, cardAmount
        },
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

    // 店頭QRコード決済のその日の支払い済み分を、商品ごとに自動集計する（手入力欄には出さず、表示・合計に自動反映するため）
    const paidCharges: Array<{ amount?: number; lineItems?: Array<{ amount?: number; quantity?: number; salesItemId?: string }> }> = await writeClient.fetch(
      `*[_type == "inStoreCharge" && status == "paid" && paidAt >= $start && paidAt < $end]{ amount, lineItems[]{ amount, quantity, "salesItemId": salesItem._ref } }`,
      { start, end }
    );
    const qrChargeTotal = paidCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
    const qrChargeItemTotals: Record<string, { quantity: number; amount: number }> = {};
    for (const charge of paidCharges) {
      for (const li of charge.lineItems || []) {
        if (!li.salesItemId) continue;
        const existing = qrChargeItemTotals[li.salesItemId] || { quantity: 0, amount: 0 };
        existing.quantity += li.quantity || 0;
        existing.amount += li.amount || 0;
        qrChargeItemTotals[li.salesItemId] = existing;
      }
    }

    return NextResponse.json({ dailySales: dailySales || null, ecTotal, qrChargeTotal, qrChargeItemTotals });
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

    const salesItemIds = lineItemsInput.map(item => item.salesItemId).filter(Boolean);
    const salesItemsMeta: SalesItemMeta[] = salesItemIds.length
      ? await writeClient.fetch(
          `*[_type == "salesItem" && _id in $ids]{ _id, category, pricingType, unitPrice }`,
          { ids: salesItemIds }
        )
      : [];
    const metaById = new Map(salesItemsMeta.map(m => [m._id, m]));

    // 金額はクライアントの申告値を信用せず、カタログの単価からサーバー側で再計算する
    let cashTotal = 0;
    let payPayTotal = 0;
    let cardTotal = 0;
    const lineItems = [];
    for (const item of lineItemsInput) {
      const meta = metaById.get(item.salesItemId);
      if (!meta) continue;

      const cashAmount = resolveAmount(meta, item.cashQuantity, item.cashAmount);
      const payPayAmount = resolveAmount(meta, item.payPayQuantity, item.payPayAmount);
      const cardAmount = resolveAmount(meta, item.cardQuantity, item.cardAmount);
      if (cashAmount <= 0 && payPayAmount <= 0 && cardAmount <= 0) continue;

      cashTotal += cashAmount;
      payPayTotal += payPayAmount;
      cardTotal += cardAmount;

      lineItems.push({
        _type: 'lineItem',
        _key: item.salesItemId,
        salesItem: { _type: 'reference', _ref: item.salesItemId },
        cashQuantity: meta.pricingType === 'fixed' ? item.cashQuantity : undefined,
        cashAmount: meta.pricingType === 'fixed' ? cashAmount : item.cashAmount,
        payPayQuantity: meta.pricingType === 'fixed' ? item.payPayQuantity : undefined,
        payPayAmount: meta.pricingType === 'fixed' ? payPayAmount : item.payPayAmount,
        cardQuantity: meta.pricingType === 'fixed' ? item.cardQuantity : undefined,
        cardAmount: meta.pricingType === 'fixed' ? cardAmount : item.cardAmount,
      });
    }

    const docId = dailySalesDocId(date);
    const doc = {
      _id: docId,
      _type: 'dailySales',
      date,
      visitorCount: body.visitorCount ?? 0,
      purchaseGroupCount: body.purchaseGroupCount ?? 0,
      lineItems,
      cashAmount: cashTotal,
      payPayAmount: payPayTotal,
      manualCardAmount: cardTotal,
      wordOfMouthDiscount: body.wordOfMouthDiscount ?? 0,
      adjustment: body.adjustment ?? 0,
      notes: body.notes || '',
      updatedAt: new Date().toISOString(),
    };

    const saved = await writeClient.createOrReplace(doc);

    // バックアップ用のGoogleスプレッドシート同期（ベストエフォート、失敗しても保存は成功のまま返す）
    await syncToSheetBestEffort(date, doc, salesItemsMeta);

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
    lineItems: Array<{ salesItem: { _ref: string }; cashAmount?: number; payPayAmount?: number; cardAmount?: number }>;
    visitorCount: number;
    purchaseGroupCount: number;
    cashAmount: number;
    payPayAmount: number;
    manualCardAmount: number;
    wordOfMouthDiscount: number;
    adjustment: number;
  },
  salesItemsMeta: SalesItemMeta[]
) {
  try {
    const metaById = new Map(salesItemsMeta.map(m => [m._id, m]));

    const categorySubtotals: Record<string, number> = {};
    for (const item of doc.lineItems) {
      const meta = metaById.get(item.salesItem._ref);
      if (!meta) continue;
      const lineTotal = (item.cashAmount || 0) + (item.payPayAmount || 0) + (item.cardAmount || 0);
      categorySubtotals[meta.category] = (categorySubtotals[meta.category] || 0) + lineTotal;
    }

    const { start, end } = getJstDayBoundariesUtc(date);
    const [paidOrders, paidCharges]: [Array<{ total?: number }>, Array<{ amount?: number; lineItems?: Array<{ amount?: number; category?: string }> }>] = await Promise.all([
      writeClient.fetch(
        `*[_type == "order" && paymentStatus == "paid" && createdAt >= $start && createdAt < $end]{ total }`,
        { start, end }
      ),
      writeClient.fetch(
        `*[_type == "inStoreCharge" && status == "paid" && paidAt >= $start && paidAt < $end]{ amount, lineItems[]{ amount, "category": salesItem->category } }`,
        { start, end }
      ),
    ]);
    const ecTotal = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const qrChargeTotal = paidCharges.reduce((sum, c) => sum + (c.amount || 0), 0);
    // 店頭QR決済の商品明細も、手入力分と同じカテゴリ小計に合算する（同じ店舗商品の販売のため）
    for (const charge of paidCharges) {
      for (const li of charge.lineItems || []) {
        const category = li.category || 'other';
        categorySubtotals[category] = (categorySubtotals[category] || 0) + (li.amount || 0);
      }
    }

    const paymentTotal =
      doc.cashAmount + doc.payPayAmount + doc.manualCardAmount + qrChargeTotal + doc.adjustment - doc.wordOfMouthDiscount;
    const grandTotal = paymentTotal + ecTotal;

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
