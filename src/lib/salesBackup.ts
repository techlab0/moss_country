// 取引明細・日別サマリーのGoogleスプレッドシートバックアップに関する組み立て・収集ロジック。
//
// 注意（import循環）: このファイルは orders.ts（EC注文データ層）を静的importする。
// orders.ts側は逆にこのファイルを静的importしない（createOrder/updateOrderStatus内で
// dynamic import(`./salesBackup`)を使う）。orders.ts → salesBackup.ts → orders.ts という
// 静的循環を避けるための約束事なので、orders.tsを変更する際もこの向きを崩さないこと。

import { writeClient } from './sanity';
import { getOrders, getOrdersInDateRange, type Order } from './orders';
import { getJstDayBoundariesUtc, dailySalesDocId, ecMethodLabel } from './salesAggregation';
import { jstDateOf } from './storeSales';
import {
  upsertTransactionRow,
  type TransactionSheetRow,
  type DailySalesSheetRow,
} from './googleSheets';

// ========== 日時・共通ユーティリティ ==========

function formatJst(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

function nowJst(): string {
  return new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

const ITEMS_SUMMARY_MAX_LENGTH = 300;

function summarizeItems(items: Array<{ name?: string | null; quantity?: number | null }> | undefined | null): string {
  if (!items || items.length === 0) return '';
  const summary = items.map(item => `${item.name || '不明'}${item.quantity ? `×${item.quantity}` : ''}`).join('、');
  return summary.length > ITEMS_SUMMARY_MAX_LENGTH
    ? `${summary.slice(0, ITEMS_SUMMARY_MAX_LENGTH - 3)}...`
    : summary;
}

// ========== ステータスラベル ==========

function ecStatusLabel(order: { status?: string; paymentStatus?: string }): string {
  if (order.status === 'refunded') return '返金済み';
  if (order.status === 'cancelled') return 'キャンセル';
  if (order.paymentStatus === 'paid') return '支払い済み';
  return '入金待ち';
}

function chargeStatusLabel(status?: string): string {
  switch (status) {
    case 'paid':
      return '支払い済み';
    case 'refunded':
      return '返金済み';
    case 'cancelled':
      return 'キャンセル';
    case 'pending':
    default:
      return '入金待ち';
  }
}

// ========== 決済方法ラベル ==========

// 店頭QR/POS/PayPay決済（inStoreCharge）の method フィールドのラベル。
// 'qr'/'pos' はSquareのカード決済（QRコード決済リンク・POSアプリ起動タッチ決済）、
// 'paypay' はPayPay動的QR決済。
const STORE_CHARGE_METHOD_LABELS: Record<string, string> = {
  qr: 'クレジット(QR)',
  pos: 'クレジット(POS)',
  paypay: 'PayPay',
};

function storeChargeMethodLabel(method?: string | null): string {
  return (method && STORE_CHARGE_METHOD_LABELS[method]) || method || '不明';
}

// 手入力取引（storeTransaction）の paymentMethod フィールドのラベル
const STORE_TX_METHOD_LABELS: Record<string, string> = {
  cash: '現金',
  payPay: 'PayPay',
  card: 'カード（手入力）',
};

function storeTxMethodLabel(method?: string | null): string {
  return (method && STORE_TX_METHOD_LABELS[method]) || method || '不明';
}

// ========== 行の組み立て ==========

// createOrder時点ではSupabaseからOrder型を読み直さずに済むよう、必要フィールドのみの
// 最小構成で組み立てられるようにする（Order型はこのインターフェースを構造的に満たす）。
export interface OrderForRow {
  orderNumber: string;
  customerEmail?: string | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  items: Array<{ name?: string | null; quantity?: number | null }>;
  subtotal?: number | null;
  shippingCost?: number | null;
  tax?: number | null;
  total?: number | null;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string | null;
  createdAt: string;
}

export function orderToTxRow(order: OrderForRow): TransactionSheetRow {
  const customerName = [order.customerLastName, order.customerFirstName].filter(Boolean).join(' ');
  return {
    datetime: formatJst(order.createdAt),
    type: 'EC注文',
    txId: order.orderNumber,
    customerName,
    customerEmail: order.customerEmail || '',
    paymentMethod: order.paymentMethod ? ecMethodLabel(order.paymentMethod) : '不明',
    itemsSummary: summarizeItems(order.items),
    subtotal: order.subtotal || 0,
    shipping: order.shippingCost || 0,
    tax: order.tax || 0,
    total: order.total || 0,
    status: ecStatusLabel(order),
    updatedAt: nowJst(),
  };
}

export interface ChargeForRow {
  _id: string;
  amount?: number | null;
  subtotal?: number | null;
  discountAmount?: number | null;
  description?: string | null;
  method?: string | null;
  status?: string;
  createdAt?: string | null;
  lineItems?: Array<{ name?: string | null; quantity?: number | null; amount?: number | null }>;
}

export function chargeToTxRow(charge: ChargeForRow): TransactionSheetRow {
  const itemsSummary = summarizeItems(charge.lineItems) || charge.description || '';
  return {
    datetime: formatJst(charge.createdAt),
    type: '店頭QR/POS',
    txId: `charge:${charge._id}`,
    customerName: '',
    customerEmail: '',
    paymentMethod: storeChargeMethodLabel(charge.method),
    itemsSummary,
    subtotal: charge.subtotal ?? charge.amount ?? 0,
    shipping: 0,
    tax: 0,
    total: charge.amount || 0,
    status: chargeStatusLabel(charge.status),
    updatedAt: nowJst(),
  };
}

export interface StoreTransactionForRow {
  _id: string;
  paymentMethod?: string | null;
  lineItems?: Array<{ name?: string | null; quantity?: number | null; amount?: number | null }>;
  subtotal?: number | null;
  total?: number | null;
  notes?: string | null;
  createdAt?: string | null;
}

export function storeTransactionToTxRow(tx: StoreTransactionForRow): TransactionSheetRow {
  const itemsSummary = summarizeItems(tx.lineItems) || tx.notes || '';
  return {
    datetime: formatJst(tx.createdAt),
    type: '手入力',
    txId: `tx:${tx._id}`,
    customerName: '',
    customerEmail: '',
    paymentMethod: storeTxMethodLabel(tx.paymentMethod),
    itemsSummary,
    subtotal: tx.subtotal || 0,
    shipping: 0,
    tax: 0,
    total: tx.total || 0,
    status: '支払い済み',
    updatedAt: nowJst(),
  };
}

// ========== charge単体の再取得＋UPSERT（リアルタイム同期フック用） ==========

const CHARGE_ROW_PROJECTION = `{
  _id, amount, subtotal, discountAmount, description, method, status, createdAt,
  lineItems[]{ name, quantity, amount }
}`;

/**
 * chargeIdからinStoreChargeドキュメントを取得し、取引明細シートへUPSERTする。
 * 呼び出し元のステータス変更処理（paypay-status/pos/callback/webhooks/square/cancel）は
 * 既に応答・DB更新を終えた後にこれを呼ぶ想定で、ここでの失敗は一切伝播させない
 * （fire-and-forget。呼び出し側でも await しないこと）。
 */
export async function syncChargeToSheetById(chargeId: string): Promise<void> {
  try {
    const charge: ChargeForRow | null = await writeClient.fetch(
      `*[_type == "inStoreCharge" && _id == $id][0] ${CHARGE_ROW_PROJECTION}`,
      { id: chargeId }
    );
    if (!charge) return;
    await upsertTransactionRow(chargeToTxRow(charge));
  } catch (error) {
    console.error('店頭決済のシート同期に失敗しました（決済処理自体には影響ありません）:', error);
  }
}

// ========== 収集（日次Cron・バックフィル用） ==========

const TX_CHARGE_PROJECTION = `{
  _id, amount, subtotal, discountAmount, description, method, status, createdAt,
  lineItems[]{ name, quantity, amount }
}`;

const TX_STORE_TRANSACTION_PROJECTION = `{
  _id, paymentMethod, subtotal, total, notes, createdAt,
  lineItems[]{ name, quantity, amount }
}`;

/**
 * 指定したJST暦日の全取引（EC注文・店頭QR/POS決済・手入力取引）を集める。
 * キャンセル・返金・入金待ちも含める（ログ目的のため確定済み以外も出す。
 * ただしstoreTransactionは常に確定扱い）。日次Cronから使用する。
 */
export async function collectTransactionsForDate(dateStr: string): Promise<TransactionSheetRow[]> {
  const { start, end } = getJstDayBoundariesUtc(dateStr);

  const [orders, charges, transactions] = await Promise.all([
    getOrdersInDateRange(start, end),
    writeClient.fetch<ChargeForRow[]>(
      `*[_type == "inStoreCharge" && createdAt >= $start && createdAt < $end] ${TX_CHARGE_PROJECTION}`,
      { start, end }
    ),
    writeClient.fetch<StoreTransactionForRow[]>(
      `*[_type == "storeTransaction" && date == $date] ${TX_STORE_TRANSACTION_PROJECTION}`,
      { date: dateStr }
    ),
  ]);

  return [
    ...orders.map((order: Order) => orderToTxRow(order)),
    ...charges.map(chargeToTxRow),
    ...transactions.map(storeTransactionToTxRow),
  ];
}

/**
 * 全期間の全取引（EC注文・店頭QR/POS決済・手入力取引）を日時降順で集める（バックフィル用）。
 */
export async function collectAllTransactions(): Promise<TransactionSheetRow[]> {
  const [orders, charges, transactions] = await Promise.all([
    getOrders(),
    writeClient.fetch<ChargeForRow[]>(`*[_type == "inStoreCharge"] ${TX_CHARGE_PROJECTION}`),
    writeClient.fetch<StoreTransactionForRow[]>(`*[_type == "storeTransaction"] ${TX_STORE_TRANSACTION_PROJECTION}`),
  ]);

  const combined: Array<{ createdAt: string; row: TransactionSheetRow }> = [
    ...orders.map((order: Order) => ({ createdAt: order.createdAt || '', row: orderToTxRow(order) })),
    ...charges.map((charge: ChargeForRow) => ({ createdAt: charge.createdAt || '', row: chargeToTxRow(charge) })),
    ...transactions.map((tx: StoreTransactionForRow) => ({ createdAt: tx.createdAt || '', row: storeTransactionToTxRow(tx) })),
  ];

  return combined
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(entry => entry.row);
}

// ========== 日別サマリー集計（src/app/api/admin/sales/[date]/route.ts と共通化） ==========

interface DailySalesCountersDoc {
  visitorCount?: number;
  purchaseGroupCount?: number;
  wordOfMouthDiscount?: number;
  adjustment?: number;
}

interface StoreTransactionForDailyAgg {
  paymentMethod?: 'cash' | 'payPay' | 'card';
  total?: number;
  lineItems?: Array<{ amount?: number; category?: string }>;
}

interface ChargeForDailyAgg {
  amount?: number;
  method?: string;
  lineItems?: Array<{ amount?: number; category?: string }>;
}

/**
 * その日の取引＋支払い済みQR決済＋来店カウンタ（dailySalesドキュメント）から
 * 日別売上サマリーを計算する。src/app/api/admin/sales/[date]/route.ts のPUTハンドラと
 * Cron/バックフィルの両方から呼ばれる共通ロジック。
 */
export async function computeDailySalesSheetRow(dateStr: string): Promise<DailySalesSheetRow> {
  const docId = dailySalesDocId(dateStr);
  const { start, end } = getJstDayBoundariesUtc(dateStr);

  const [dailySales, transactions, paidCharges, paidOrders]: [
    DailySalesCountersDoc | null,
    StoreTransactionForDailyAgg[],
    ChargeForDailyAgg[],
    Array<{ total?: number }>,
  ] = await Promise.all([
    writeClient.fetch(
      `*[_id == $id][0]{ visitorCount, purchaseGroupCount, wordOfMouthDiscount, adjustment }`,
      { id: docId }
    ),
    writeClient.fetch(
      `*[_type == "storeTransaction" && date == $date]{
        paymentMethod, total, lineItems[]{ amount, "category": salesItem->category }
      }`,
      { date: dateStr }
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

  const adjustment = dailySales?.adjustment || 0;
  const wordOfMouthDiscount = dailySales?.wordOfMouthDiscount || 0;
  const storeTotal = cashAmount + payPayAmount + manualCardAmount + qrChargeTotal;
  const grandTotal = storeTotal + adjustment - wordOfMouthDiscount + ecTotal;

  return {
    date: dateStr,
    visitorCount: dailySales?.visitorCount || 0,
    purchaseGroupCount: dailySales?.purchaseGroupCount || 0,
    categorySubtotals,
    cashAmount,
    payPayAmount,
    manualCardAmount,
    ecTotal,
    qrChargeTotal,
    grandTotal,
  };
}

/**
 * 実際に取引が存在する全JST日付を古い順で列挙する（EC注文・店頭QR/POS決済・手入力取引の
 * 3ソースいずれかにその日のデータがあれば含める）。dailySalesドキュメント（来店カウンタ等）を
 * 一度も保存していない日でも、取引さえあれば集計・同期の対象に含めるためにこの方式にしている。
 * バックフィルで「集計対象の日付」を洗い出すために使う。
 */
export async function listTransactionDates(): Promise<string[]> {
  const [orders, charges, transactionDates]: [
    Array<{ createdAt: string }>,
    Array<{ createdAt?: string }>,
    string[],
  ] = await Promise.all([
    getOrders(),
    writeClient.fetch(`*[_type == "inStoreCharge" && defined(createdAt)]{ createdAt }`),
    writeClient.fetch(`*[_type == "storeTransaction" && defined(date)].date`),
  ]);

  const dates = new Set<string>();
  for (const order of orders) {
    if (order.createdAt) dates.add(jstDateOf(order.createdAt));
  }
  for (const charge of charges) {
    if (charge.createdAt) dates.add(jstDateOf(charge.createdAt));
  }
  for (const date of transactionDates) {
    if (date) dates.add(date);
  }
  return Array.from(dates).sort();
}
