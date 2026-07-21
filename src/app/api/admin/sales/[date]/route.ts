import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { getJstDayBoundariesUtc, dailySalesDocId, DATE_PATTERN } from '@/lib/salesAggregation';
import { syncDailySalesToSheet } from '@/lib/googleSheets';
import { taxBreakdown } from '@/lib/tax';
import { getOrdersInDateRange } from '@/lib/orders';
import type { OrderItemSnapshot } from '@/lib/orders';

// 取引（storeTransaction）と支払い済みQR決済（inStoreCharge）から日別の集計を組み立てる。
// dailySales ドキュメントはカウンタ（来店者数・購入組数）・調整・備考のみを保持する。

type PaymentMethod = 'cash' | 'payPay' | 'card';

interface AggLineItem {
  name?: string;
  quantity?: number;
  amount?: number;
  salesItemId?: string;
  category?: string;
}

interface TransactionDoc {
  _id: string;
  createdAt?: string;
  paymentMethod?: PaymentMethod;
  visitorCount?: number;
  total?: number;
  lineItems?: AggLineItem[];
  source?: string;
  subtotal?: number;
  discountAmount?: number;
  notes?: string;
}

interface ChargeDoc {
  _id: string;
  amount?: number;
  description?: string;
  status?: string;
  createdAt?: string;
  paidAt?: string;
  visitorCount?: number;
  lineItems?: AggLineItem[];
  subtotal?: number;
  discountAmount?: number;
  // 決済方法。'qr'/'pos'（Squareのカード決済）と 'paypay'（PayPay動的QR）を区別する
  method?: string;
}

interface MethodCell {
  quantity: number;
  amount: number;
}

interface ItemRow {
  key: string;
  salesItemId?: string;
  name: string;
  cash: MethodCell;
  payPay: MethodCell;
  card: MethodCell;
  qr: MethodCell;
  // EC（オンライン）購入分。現金/PayPay/カード/QRのどれでもないため専用セルに集計する
  // （合計列には反映されるが、店舗の決済方法別セルには加算しない＝二重計上を避ける）
  ec: MethodCell;
  // EC分をさらに注文のpaymentMethod（credit_card/bank_transfer/cash_on_delivery等）別に内訳集計したもの。
  // 表示用の補助データで、ecの合算値とは独立に加算する（二重計上ではなく同じ値を別軸で持つ）。
  ecMethods?: Record<string, MethodCell>;
  total: number;
}

function emptyCell(): MethodCell {
  return { quantity: 0, amount: 0 };
}

function addToRow(
  rows: Map<string, ItemRow>,
  li: AggLineItem,
  method: PaymentMethod | 'qr' | 'ec',
  // EC分の内訳集計キー（注文のpaymentMethod）。method === 'ec' のときのみ使用する。
  ecPaymentMethod?: string
) {
  const key = li.salesItemId || `custom:${li.name || '不明'}`;
  let row = rows.get(key);
  if (!row) {
    row = {
      key,
      salesItemId: li.salesItemId,
      name: li.name || '不明',
      cash: emptyCell(),
      payPay: emptyCell(),
      card: emptyCell(),
      qr: emptyCell(),
      ec: emptyCell(),
      ecMethods: {},
      total: 0,
    };
    rows.set(key, row);
  }
  row[method].quantity += li.quantity || 0;
  row[method].amount += li.amount || 0;
  row.total += li.amount || 0;

  if (method === 'ec' && ecPaymentMethod) {
    if (!row.ecMethods) row.ecMethods = {};
    const cell = row.ecMethods[ecPaymentMethod] || emptyCell();
    cell.quantity += li.quantity || 0;
    cell.amount += li.amount || 0;
    row.ecMethods[ecPaymentMethod] = cell;
  }
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
    const { start, end } = getJstDayBoundariesUtc(date);

    const [dailySales, transactions, charges, paidOrders]: [
      { visitorCount?: number; purchaseGroupCount?: number; wordOfMouthDiscount?: number; adjustment?: number; notes?: string; updatedAt?: string } | null,
      TransactionDoc[],
      ChargeDoc[],
      Array<{ total?: number; items?: OrderItemSnapshot[]; paymentMethod?: string }>,
    ] = await Promise.all([
      writeClient.fetch(
        `*[_id == $id][0]{ visitorCount, purchaseGroupCount, wordOfMouthDiscount, adjustment, notes, updatedAt }`,
        { id: docId }
      ),
      writeClient.fetch(
        `*[_type == "storeTransaction" && date == $date] | order(createdAt desc) {
          _id, createdAt, paymentMethod, visitorCount, total, source, notes,
          subtotal, discountAmount,
          lineItems[]{ name, quantity, amount, "salesItemId": salesItem._ref }
        }`,
        { date }
      ),
      // 履歴表示用: その日に発行された決済を全ステータスで返す
      writeClient.fetch(
        `*[_type == "inStoreCharge" && createdAt >= $start && createdAt < $end] | order(createdAt desc) {
          _id, amount, subtotal, discountAmount, description, status, createdAt, paidAt, visitorCount,
          lineItems[]{ name, quantity, amount, "salesItemId": salesItem._ref }
        }`,
        { start, end }
      ),
      // EC（オンライン）のその日の支払い済み注文（orderはPIIを含むためSupabaseから取得）
      // 商品別明細に反映するため items のスナップショットも保持する
      getOrdersInDateRange(start, end).then(orders =>
        orders
          .filter(order => order.paymentStatus === 'paid')
          .map(order => ({ total: order.total ?? 0, items: order.items ?? [], paymentMethod: order.paymentMethod || '不明' }))
      ),
    ]);

    // 集計対象のQR決済は「その日に支払われたもの」（発行日ではなく支払い日で金額を帰属させる）
    const paidChargesForAggregate: ChargeDoc[] = await writeClient.fetch(
      `*[_type == "inStoreCharge" && status == "paid" && paidAt >= $start && paidAt < $end] {
        amount, discountAmount, method, lineItems[]{ name, quantity, amount, "salesItemId": salesItem._ref }
      }`,
      { start, end }
    );

    const rows = new Map<string, ItemRow>();
    const methodTotals = { cash: 0, payPay: 0, card: 0, qr: 0 };
    let discountTotal = 0;

    for (const tx of transactions) {
      const method: PaymentMethod = tx.paymentMethod || 'cash';
      methodTotals[method] += tx.total || 0;
      discountTotal += tx.discountAmount || 0;
      for (const li of tx.lineItems || []) {
        addToRow(rows, li, method);
      }
    }
    for (const charge of paidChargesForAggregate) {
      // PayPay動的QRはPayPayの売上として集計する。それ以外（Square QR/POS）はクレジット(QR)。
      const bucket: 'payPay' | 'qr' = charge.method === 'paypay' ? 'payPay' : 'qr';
      methodTotals[bucket] += charge.amount || 0;
      discountTotal += charge.discountAmount || 0;
      for (const li of charge.lineItems || []) {
        addToRow(rows, li, bucket);
      }
    }
    // EC（オンライン）購入分を商品別明細に合流させる（表示用のitemRowsのみ）。
    // grandTotal は下記の通り methodTotals（店舗）+ ecTotal（EC、注文のtotalから別集計）で
    // 計算されており、itemsTotal はどこにも合算されないため、ここでitemRowsに加算しても
    // グランド合計の二重計上にはならない。決済方法別セル（現金/PayPay/カード/QR）にも
    // 加算しない（'ec'専用セルに集計し、合計列にのみ反映）。
    // EC売上の決済方法別内訳（サマリ表示用）。注文単位の total を paymentMethod で集計する。
    const ecMethodTotals = new Map<string, { amount: number; count: number }>();
    for (const order of paidOrders) {
      const method = order.paymentMethod || '不明';
      const agg = ecMethodTotals.get(method) || { amount: 0, count: 0 };
      agg.amount += order.total || 0;
      agg.count += 1;
      ecMethodTotals.set(method, agg);
      for (const item of order.items || []) {
        addToRow(
          rows,
          {
            name: item.name,
            quantity: item.quantity,
            amount: (item.price || 0) * (item.quantity || 0),
            salesItemId: item.salesItemId || undefined,
          },
          'ec',
          method
        );
      }
    }
    const ecBreakdown = Array.from(ecMethodTotals.entries())
      .map(([method, v]) => ({ method, amount: v.amount, count: v.count }))
      .sort((a, b) => b.amount - a.amount);

    const itemRows = Array.from(rows.values()).sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    const itemsTotal = itemRows.reduce((sum, row) => sum + row.total, 0);
    const ecTotal = paidOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    const adjustment = dailySales?.adjustment || 0;
    const wordOfMouthDiscount = dailySales?.wordOfMouthDiscount || 0;
    const storeTotal = methodTotals.cash + methodTotals.payPay + methodTotals.card + methodTotals.qr;
    const grandTotal = storeTotal + adjustment - wordOfMouthDiscount + ecTotal;
    const tax = taxBreakdown(grandTotal);

    return NextResponse.json({
      dailySales: dailySales || null,
      transactions,
      charges,
      aggregate: {
        methodTotals,
        itemRows,
        itemsTotal,
        storeTotal,
        ecTotal,
        ecBreakdown,
        discountTotal,
        grandTotal,
        taxExcludedTotal: tax.excludedAmount,
        taxAmountTotal: tax.taxAmount,
      },
    });
  } catch (error) {
    console.error('日別売上取得エラー:', error);
    return NextResponse.json(
      { error: '日別売上の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// カウンタ（来店者数・購入組数）・調整・口コミ割引・備考の保存＋Googleシート同期
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
    const doc = {
      _id: dailySalesDocId(date),
      _type: 'dailySales',
      date,
      visitorCount: Math.max(0, Number(body.visitorCount) || 0),
      purchaseGroupCount: Math.max(0, Number(body.purchaseGroupCount) || 0),
      wordOfMouthDiscount: Math.max(0, Number(body.wordOfMouthDiscount) || 0),
      adjustment: Number(body.adjustment) || 0,
      notes: typeof body.notes === 'string' ? body.notes : '',
      updatedAt: new Date().toISOString(),
    };

    const saved = await writeClient.createOrReplace(doc);

    // バックアップ用のGoogleスプレッドシート同期（ベストエフォート、失敗しても保存は成功のまま返す）
    await syncToSheetBestEffort(date, doc);

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
 * その日の取引＋支払い済みQR決済からサマリーを再計算し、バックアップ用Googleスプレッドシートへ同期する。
 * ここでの失敗は保存処理の成功に影響させない（ログのみ）。
 */
async function syncToSheetBestEffort(
  date: string,
  doc: {
    visitorCount: number;
    purchaseGroupCount: number;
    wordOfMouthDiscount: number;
    adjustment: number;
  }
) {
  try {
    const { start, end } = getJstDayBoundariesUtc(date);
    const [transactions, paidCharges, paidOrders]: [
      Array<{ paymentMethod?: PaymentMethod; total?: number; lineItems?: Array<{ amount?: number; category?: string }> }>,
      Array<{ amount?: number; method?: string; lineItems?: Array<{ amount?: number; category?: string }> }>,
      Array<{ total?: number }>,
    ] = await Promise.all([
      writeClient.fetch(
        `*[_type == "storeTransaction" && date == $date]{
          paymentMethod, total, lineItems[]{ amount, "category": salesItem->category }
        }`,
        { date }
      ),
      writeClient.fetch(
        `*[_type == "inStoreCharge" && status == "paid" && paidAt >= $start && paidAt < $end]{
          amount, method, lineItems[]{ amount, "category": salesItem->category }
        }`,
        { start, end }
      ),
      // orderはPIIを含むためSupabaseから取得
      getOrdersInDateRange(start, end).then(orders =>
        orders.filter(order => order.paymentStatus === 'paid').map(order => ({ total: order.total ?? 0 }))
      ),
    ]);

    const categorySubtotals: Record<string, number> = {};
    let cashAmount = 0;
    let payPayAmount = 0;
    let manualCardAmount = 0;
    for (const tx of transactions) {
      if (tx.paymentMethod === 'payPay') payPayAmount += tx.total || 0;
      else if (tx.paymentMethod === 'card') manualCardAmount += tx.total || 0;
      else cashAmount += tx.total || 0;
      for (const li of tx.lineItems || []) {
        const category = li.category || 'other';
        categorySubtotals[category] = (categorySubtotals[category] || 0) + (li.amount || 0);
      }
    }
    // PayPay動的QRはPayPay売上に加算し、店頭QR決済（Squareカード）とは分ける
    let qrChargeTotal = 0;
    for (const charge of paidCharges) {
      if (charge.method === 'paypay') {
        payPayAmount += charge.amount || 0;
      } else {
        qrChargeTotal += charge.amount || 0;
      }
      for (const li of charge.lineItems || []) {
        const category = li.category || 'other';
        categorySubtotals[category] = (categorySubtotals[category] || 0) + (li.amount || 0);
      }
    }
    const ecTotal = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    const storeTotal = cashAmount + payPayAmount + manualCardAmount + qrChargeTotal;
    const grandTotal = storeTotal + doc.adjustment - doc.wordOfMouthDiscount + ecTotal;

    await syncDailySalesToSheet({
      date,
      visitorCount: doc.visitorCount,
      purchaseGroupCount: doc.purchaseGroupCount,
      categorySubtotals,
      cashAmount,
      payPayAmount,
      manualCardAmount,
      ecTotal,
      qrChargeTotal,
      grandTotal,
    });
  } catch (error) {
    console.error('売上サマリー計算またはシート同期に失敗しました（保存自体は成功しています）:', error);
  }
}
