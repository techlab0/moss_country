import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { getJstDayBoundariesUtc } from '@/lib/salesAggregation';
import { taxBreakdown } from '@/lib/tax';
import { getOrdersInDateRange } from '@/lib/orders';

// 月次売上レポート用の集計API。
// storeTransaction / 支払い済みinStoreCharge / 支払い済みorder / dailySales から
// 日別推移と月間サマリーを組み立て、前月比較のため前月分サマリーも同時に返す。

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type PaymentMethod = 'cash' | 'payPay' | 'card';

interface MonthLineItem {
  name?: string;
  quantity?: number;
  amount?: number;
  category?: string;
}

interface MonthTransaction {
  date?: string;
  createdAt?: string;
  source?: string;
  paymentMethod?: PaymentMethod;
  total?: number;
  discountAmount?: number;
  lineItems?: MonthLineItem[];
}

interface MonthCharge {
  paidAt?: string;
  amount?: number;
  discountAmount?: number;
  lineItems?: MonthLineItem[];
}

interface MonthOrder {
  createdAt?: string;
  total?: number;
}

interface MonthDailySales {
  date?: string;
  visitorCount?: number;
  purchaseGroupCount?: number;
  adjustment?: number;
  wordOfMouthDiscount?: number;
}

interface DayRow {
  date: string;
  storeTotal: number;
  ecTotal: number;
  total: number;
  cash: number;
  payPay: number;
  card: number;
  qr: number;
}

/** 曜日別の売上。定休日を平均に含めると実態より低く出るため、売上のあった日だけで割る */
interface WeekdayRow {
  weekday: number;
  total: number;
  businessDays: number;
  avg: number;
}

/** 時間帯別の売上。会計時刻が分かる取引だけを対象にする */
interface HourRow {
  hour: number;
  total: number;
  count: number;
}

/** 売れ筋の明細。金額は割引前の定価ベース */
interface ItemRow {
  name: string;
  quantity: number;
  amount: number;
}

interface MonthlySummary {
  grandTotal: number;
  storeTotal: number;
  ecTotal: number;
  methodTotals: { cash: number; payPay: number; card: number; qr: number };
  categoryTotals: Record<string, number>;
  discountTotal: number;
  taxExcludedTotal: number;
  taxAmountTotal: number;
  visitorTotal: number;
  purchaseGroupTotal: number;
  avgPerGroup: number;
  avgPerVisitor: number;
  avgPerBusinessDay: number;
  purchaseRate: number;
  businessDays: number;
}

/** その月の日付一覧（YYYY-MM-DD、JSTの暦日）を返す */
function daysInMonth(month: string): string[] {
  const [year, mon] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const days: string[] = [];
  for (let d = 1; d <= lastDay; d++) {
    days.push(`${month}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

function previousMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  const prev = new Date(Date.UTC(year, mon - 2, 1));
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** UTCのISO日時をJSTの暦日（YYYY-MM-DD）に変換する */
function jstDateOf(isoUtc: string): string {
  const jst = new Date(new Date(isoUtc).getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function currentMonthJst(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 7);
}

/** UTCのISO日時からJSTの時（0-23）を取り出す */
function jstHourOf(isoUtc: string): number {
  return new Date(new Date(isoUtc).getTime() + 9 * 60 * 60 * 1000).getUTCHours();
}

interface MonthAggregate {
  days: DayRow[];
  summary: MonthlySummary;
  weekdays: WeekdayRow[];
  hours: HourRow[];
  /** 時間帯別の対象になった売上額。店舗売上に対する割合を画面で示すために返す */
  hourCoveredTotal: number;
  items: ItemRow[];
}

async function aggregateMonth(month: string): Promise<MonthAggregate> {
  const dayList = daysInMonth(month);
  const first = dayList[0];
  const last = dayList[dayList.length - 1];
  const { start: startUtc } = getJstDayBoundariesUtc(first);
  const { end: endUtc } = getJstDayBoundariesUtc(last);

  const [transactions, paidCharges, paidOrders, dailySalesList]: [
    MonthTransaction[],
    MonthCharge[],
    MonthOrder[],
    MonthDailySales[],
  ] = await Promise.all([
    writeClient.fetch(
      `*[_type == "storeTransaction" && date >= $first && date <= $last]{
        date, createdAt, source, paymentMethod, total, discountAmount,
        lineItems[]{ name, quantity, amount, "category": salesItem->category }
      }`,
      { first, last }
    ),
    writeClient.fetch(
      `*[_type == "inStoreCharge" && status == "paid" && paidAt >= $startUtc && paidAt < $endUtc]{
        paidAt, amount, discountAmount,
        lineItems[]{ name, quantity, amount, "category": salesItem->category }
      }`,
      { startUtc, endUtc }
    ),
    // orderはPIIを含むためSupabaseに移行済み。支払い済みのものだけ日別集計にマージする
    getOrdersInDateRange(startUtc, endUtc).then(orders =>
      orders
        .filter(order => order.paymentStatus === 'paid')
        .map(order => ({ createdAt: order.createdAt, total: order.total ?? 0 }))
    ),
    writeClient.fetch(
      `*[_type == "dailySales" && date >= $first && date <= $last]{
        date, visitorCount, purchaseGroupCount, adjustment, wordOfMouthDiscount
      }`,
      { first, last }
    ),
  ]);

  const dayMap = new Map<string, DayRow>();
  for (const date of dayList) {
    dayMap.set(date, { date, storeTotal: 0, ecTotal: 0, total: 0, cash: 0, payPay: 0, card: 0, qr: 0 });
  }

  const methodTotals = { cash: 0, payPay: 0, card: 0, qr: 0 };
  const categoryTotals: Record<string, number> = {};
  const hourMap = new Map<number, HourRow>();
  const itemMap = new Map<string, ItemRow>();
  let discountTotal = 0;
  let hourCoveredTotal = 0;

  const addHour = (hour: number, amount: number) => {
    const row = hourMap.get(hour) || { hour, total: 0, count: 0 };
    row.total += amount;
    row.count += 1;
    hourMap.set(hour, row);
    hourCoveredTotal += amount;
  };

  const addItems = (lineItems: MonthLineItem[] | undefined) => {
    for (const li of lineItems || []) {
      const name = li.name?.trim() || '（名称なし）';
      const row = itemMap.get(name) || { name, quantity: 0, amount: 0 };
      row.quantity += li.quantity || 0;
      row.amount += li.amount || 0;
      itemMap.set(name, row);
    }
  };

  for (const tx of transactions) {
    const row = tx.date ? dayMap.get(tx.date) : undefined;
    const method: PaymentMethod = tx.paymentMethod || 'cash';
    const amount = tx.total || 0;
    if (row) {
      row[method] += amount;
      row.storeTotal += amount;
    }
    methodTotals[method] += amount;
    discountTotal += tx.discountAmount || 0;
    // 紙の記録をまとめて入力したものは createdAt が「入力した時刻」なので時間帯集計から外す
    if (tx.createdAt && tx.source !== 'historical') {
      addHour(jstHourOf(tx.createdAt), amount);
    }
    addItems(tx.lineItems);
    for (const li of tx.lineItems || []) {
      const category = li.category || 'other';
      categoryTotals[category] = (categoryTotals[category] || 0) + (li.amount || 0);
    }
  }

  for (const charge of paidCharges) {
    const date = charge.paidAt ? jstDateOf(charge.paidAt) : undefined;
    const row = date ? dayMap.get(date) : undefined;
    const amount = charge.amount || 0;
    if (row) {
      row.qr += amount;
      row.storeTotal += amount;
    }
    methodTotals.qr += amount;
    discountTotal += charge.discountAmount || 0;
    // QR決済の paidAt は実際に支払われた時刻なので、そのまま時間帯集計に使える
    if (charge.paidAt) {
      addHour(jstHourOf(charge.paidAt), amount);
    }
    addItems(charge.lineItems);
    for (const li of charge.lineItems || []) {
      const category = li.category || 'other';
      categoryTotals[category] = (categoryTotals[category] || 0) + (li.amount || 0);
    }
  }

  for (const order of paidOrders) {
    const date = order.createdAt ? jstDateOf(order.createdAt) : undefined;
    const row = date ? dayMap.get(date) : undefined;
    if (row) row.ecTotal += order.total || 0;
  }

  let adjustmentTotal = 0;
  let wordOfMouthTotal = 0;
  let visitorTotal = 0;
  let purchaseGroupTotal = 0;
  for (const ds of dailySalesList) {
    adjustmentTotal += ds.adjustment || 0;
    wordOfMouthTotal += ds.wordOfMouthDiscount || 0;
    visitorTotal += ds.visitorCount || 0;
    purchaseGroupTotal += ds.purchaseGroupCount || 0;
  }

  const days = Array.from(dayMap.values());
  let businessDays = 0;
  const weekdays: WeekdayRow[] = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    total: 0,
    businessDays: 0,
    avg: 0,
  }));
  for (const row of days) {
    row.total = row.storeTotal + row.ecTotal;
    if (row.total > 0) businessDays++;
    const [y, m, d] = row.date.split('-').map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    weekdays[weekday].total += row.total;
    if (row.total > 0) weekdays[weekday].businessDays++;
  }
  for (const row of weekdays) {
    row.avg = row.businessDays > 0 ? Math.round(row.total / row.businessDays) : 0;
  }

  const hours = Array.from(hourMap.values()).sort((a, b) => a.hour - b.hour);
  const items = Array.from(itemMap.values())
    .filter(row => row.amount > 0 || row.quantity > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 20);

  const storeTotal = methodTotals.cash + methodTotals.payPay + methodTotals.card + methodTotals.qr;
  const ecTotal = days.reduce((sum, row) => sum + row.ecTotal, 0);
  // 日別集計 /api/admin/sales/[date] の grandTotal と同じ計算式（調整・口コミ割引を反映）
  const grandTotal = storeTotal + adjustmentTotal - wordOfMouthTotal + ecTotal;
  const tax = taxBreakdown(grandTotal);

  return {
    days,
    weekdays,
    hours,
    hourCoveredTotal,
    items,
    summary: {
      grandTotal,
      storeTotal,
      ecTotal,
      methodTotals,
      categoryTotals,
      discountTotal,
      taxExcludedTotal: tax.excludedAmount,
      taxAmountTotal: tax.taxAmount,
      visitorTotal,
      purchaseGroupTotal,
      avgPerGroup: purchaseGroupTotal > 0 ? Math.round(grandTotal / purchaseGroupTotal) : 0,
      avgPerVisitor: visitorTotal > 0 ? Math.round(grandTotal / visitorTotal) : 0,
      avgPerBusinessDay: businessDays > 0 ? Math.round(grandTotal / businessDays) : 0,
      // 「来店者数（名）」に対する「購入組数（組）」なので厳密な転換率ではない。傾向を見るための目安
      purchaseRate: visitorTotal > 0 ? Math.round((purchaseGroupTotal / visitorTotal) * 1000) / 10 : 0,
      businessDays,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const monthParam = request.nextUrl.searchParams.get('month') || currentMonthJst();
    if (!MONTH_PATTERN.test(monthParam)) {
      return NextResponse.json({ error: '月の形式が不正です（YYYY-MM）' }, { status: 400 });
    }

    const [current, previous] = await Promise.all([
      aggregateMonth(monthParam),
      aggregateMonth(previousMonth(monthParam)),
    ]);

    return NextResponse.json({
      month: monthParam,
      days: current.days,
      summary: current.summary,
      previousSummary: previous.summary,
      weekdays: current.weekdays,
      hours: current.hours,
      hourCoveredTotal: current.hourCoveredTotal,
      items: current.items,
    });
  } catch (error) {
    console.error('月次売上集計エラー:', error);
    return NextResponse.json({ error: '月次売上の集計に失敗しました' }, { status: 500 });
  }
}
