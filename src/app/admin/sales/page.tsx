'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';

// ========== 型 ==========

interface SalesItem {
  _id: string;
  category: string;
  name: string;
  pricingType: 'fixed' | 'variable';
  unitPrice?: number;
  sortOrder: number;
  isActive: boolean;
}

interface CustomItemRow {
  id: string;
  name: string;
  amount: string; // 単価
  quantity: string;
}

type PaymentMethod = 'cash' | 'payPay' | 'card';
type EntryMethod = PaymentMethod | 'qr' | 'pos';
type DiscountType = 'amount' | 'percent';

interface LineItemView {
  name: string;
  quantity?: number;
  amount?: number;
  salesItemId?: string;
}

interface TransactionView {
  _id: string;
  createdAt?: string;
  paymentMethod?: PaymentMethod;
  visitorCount?: number;
  total?: number;
  lineItems?: LineItemView[];
  source?: string;
  subtotal?: number;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount?: number;
  notes?: string;
}

interface HistoricalItemState {
  cashQty: string;
  payPayQty: string;
  cardQty: string;
  unitPrice: string; // 金額直接入力(variable)の商品のみ使用
}

interface HistoricalCustomRow {
  id: string;
  name: string;
  unitPrice: string;
  quantity: string;
  paymentMethod: PaymentMethod;
}

interface ChargeView {
  _id: string;
  amount?: number;
  subtotal?: number;
  discountAmount?: number;
  description?: string;
  status?: string;
  createdAt?: string;
  paidAt?: string;
  visitorCount?: number;
  lineItems?: LineItemView[];
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
  ec: MethodCell;
  total: number;
}

interface Aggregate {
  methodTotals: { cash: number; payPay: number; card: number; qr: number };
  itemRows: ItemRow[];
  itemsTotal: number;
  storeTotal: number;
  ecTotal: number;
  discountTotal: number;
  grandTotal: number;
  taxExcludedTotal: number;
  taxAmountTotal: number;
}

interface DayData {
  dailySales: {
    visitorCount?: number;
    purchaseGroupCount?: number;
    wordOfMouthDiscount?: number;
    adjustment?: number;
    notes?: string;
  } | null;
  transactions: TransactionView[];
  charges: ChargeView[];
  aggregate: Aggregate;
}

interface QrFlowState {
  chargeId: string;
  amount: number;
  subtotal?: number;
  discountAmount?: number;
  qrCodeDataUrl?: string; // QR決済時のみ
  posLaunchUrl?: string; // POSアプリ起動決済時のみ（square-commerce-v1://）
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  lineItems: LineItemView[];
}

interface EditLine {
  salesItemId?: string;
  name: string;
  pricingType: 'fixed' | 'variable' | 'custom';
  unitPrice?: number;
  quantity: string;
  amount: string;
}

interface EditState {
  id: string;
  isCharge: boolean;
  paymentMethod: PaymentMethod;
  visitorCount: string;
  lines: EditLine[];
  paidAmount?: number;
  discountType: DiscountType | '';
  discountValue: string;
  notes: string;
}

// ========== 定数・ユーティリティ ==========

const categoryLabels: Record<string, string> = {
  moss: 'コケ',
  product: '商品',
  figure: 'フィギュア',
  workshop: 'ワークショップ',
  gacha: 'ガチャ',
  other: 'その他',
};

const categoryOrder = ['moss', 'product', 'figure', 'workshop', 'gacha', 'other'];

const methodLabels: Record<EntryMethod, string> = {
  cash: '現金',
  payPay: 'PayPay',
  qr: 'クレジット(QR)',
  card: 'クレジット(手動)',
  pos: 'タッチ決済',
};

// Square POS API のディープリンクを組み立てる（iOS: square-commerce-v1://）。
// 決済後は options.auto_return で自動的に callback_url へ戻り、state に載せた会計IDが返る。
function buildPosDeepLink({ amount, chargeId, notes }: { amount: number; chargeId: string; notes?: string }): string {
  const data = {
    amount_money: { amount, currency_code: 'JPY' }, // 円は最小単位そのまま
    callback_url: `${window.location.origin}/api/pos/callback`,
    client_id: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
    version: '1.3',
    notes: notes || undefined,
    state: chargeId, // 会計ID。コールバックでそのまま返る
    options: {
      supported_tender_types: ['CREDIT_CARD'], // カード（iPhoneのタッチ決済含む）
      auto_return: true,
    },
  };
  return 'square-commerce-v1://payment/create?data=' + encodeURIComponent(JSON.stringify(data));
}

const chargeStatusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: '支払い待ち', className: 'bg-yellow-100 text-yellow-800' },
  paid: { label: '支払い済み', className: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'キャンセル', className: 'bg-gray-100 text-gray-600' },
  refunded: { label: '返金済み', className: 'bg-red-100 text-red-700' },
};

const numberInputClass = 'w-full px-1 py-2 text-sm text-right text-blue-700 font-bold border border-gray-300 rounded-md';

function todayJstString(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function displayStr(value: string): string {
  return value === '0' ? '' : value;
}

function sanitizeNonNegative(value: string): string {
  return value.replace(/-/g, '');
}

function sortByNameJa(items: SalesItem[]): SalesItem[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

// 画面表示用のプレビュー計算（金額の最終確定は必ずサーバー側で行う）
function previewDiscountAmount(subtotal: number, discountType: DiscountType | '', discountValue: string): number {
  if (!discountType || subtotal <= 0) return 0;
  const value = Math.max(0, toNumber(discountValue));
  const raw = discountType === 'amount' ? value : Math.round(subtotal * Math.min(value, 100) / 100);
  return Math.max(0, Math.min(raw, subtotal));
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
}

function itemsSummary(lineItems?: LineItemView[]): string {
  if (!lineItems || lineItems.length === 0) return '（商品なし・来店のみ）';
  return lineItems.map(li => `${li.name}${li.quantity ? `×${li.quantity}` : ''}`).join('、');
}

// ========== ページ ==========

export default function SalesPage() {
  const [tab, setTab] = useState<'entry' | 'summary'>('entry');
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [message, setMessage] = useState('');
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = useCallback((text: string) => {
    setMessage(text);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setMessage(''), 4000);
  }, []);

  // タブが切り替わったら、フッターなどが見えたままになっていないよう画面上部に戻す
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  useEffect(() => {
    (async () => {
      setLoadingItems(true);
      try {
        const response = await fetch('/api/admin/sales-items');
        const data = response.ok ? await response.json() : { items: [] };
        setSalesItems(data.items || []);
      } catch (err) {
        console.error('売上項目取得エラー:', err);
      } finally {
        setLoadingItems(false);
      }
    })();
    return () => {
      if (messageTimer.current) clearTimeout(messageTimer.current);
    };
  }, []);

  return (
    <div className="space-y-4 max-w-2xl pb-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900">売上管理</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/sales/monthly" className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            月次レポート
          </Link>
          <Link href="/admin/sales/items" className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            項目カタログ
          </Link>
        </div>
      </div>

      {/* タブ切り替え */}
      <div className="flex rounded-lg overflow-hidden border border-gray-300">
        <button
          onClick={() => setTab('entry')}
          className={`flex-1 py-3 font-medium ${tab === 'entry' ? 'bg-moss-green text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          入力
        </button>
        <button
          onClick={() => setTab('summary')}
          className={`flex-1 py-3 font-medium ${tab === 'summary' ? 'bg-moss-green text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          集計・履歴
        </button>
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 text-sm">
          {message}
        </div>
      )}

      {tab === 'entry' ? (
        <EntryTab salesItems={salesItems} loadingItems={loadingItems} onRegistered={showMessage} />
      ) : (
        <SummaryTab salesItems={salesItems} onMessage={showMessage} />
      )}
    </div>
  );
}

// ========== 入力タブ ==========

function EntryTab({
  salesItems,
  loadingItems,
  onRegistered,
}: {
  salesItems: SalesItem[];
  loadingItems: boolean;
  onRegistered: (text: string) => void;
}) {
  const [visitorCount, setVisitorCount] = useState('1');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [customItems, setCustomItems] = useState<CustomItemRow[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<EntryMethod>('cash');
  const [discountType, setDiscountType] = useState<DiscountType | ''>('');
  const [discountValue, setDiscountValue] = useState('0');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [qrFlow, setQrFlow] = useState<QrFlowState | null>(null);
  const [payPayQrUrl, setPayPayQrUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // PayPay店舗用QRコード（設定されていれば確認画面に表示する）
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/admin/payment-settings');
        if (!response.ok) return;
        const data = await response.json();
        setPayPayQrUrl(data.settings?.payPayQrUrl || null);
      } catch {
        // 未設定・取得失敗時はQRなしで動作する
      }
    })();
  }, []);

  // フォーム⇄確認画面⇄QR画面の切り替え時、スクロール位置が下のままだと
  // 新しく表示された内容が画面外になるため上部に戻す
  const isShowingOverlay = !!qrFlow || confirming;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [isShowingOverlay]);

  // 金額直接入力(variable)の商品は数量のデフォルトを1にする（単価だけ入れればそのまま登録できるように）
  const qtyStr = useCallback((item: SalesItem) => {
    return quantities[item._id] ?? (item.pricingType === 'fixed' ? '0' : '1');
  }, [quantities]);

  const itemAmount = useCallback((item: SalesItem) => {
    if (item.pricingType === 'fixed') {
      return toNumber(qtyStr(item)) * (item.unitPrice || 0);
    }
    return toNumber(amounts[item._id] || '0') * toNumber(qtyStr(item));
  }, [qtyStr, amounts]);

  const total = useMemo(() => {
    const fromCatalog = salesItems.reduce((sum, item) => sum + itemAmount(item), 0);
    const fromCustom = customItems.reduce((sum, row) => sum + toNumber(row.amount) * toNumber(row.quantity), 0);
    return fromCatalog + fromCustom;
  }, [salesItems, itemAmount, customItems]);

  const itemCount = useMemo(() => {
    const fromCatalog = salesItems.reduce((sum, item) => {
      if (item.pricingType === 'fixed') return sum + toNumber(qtyStr(item));
      return sum + (toNumber(amounts[item._id] || '0') > 0 ? toNumber(qtyStr(item)) : 0);
    }, 0);
    const fromCustom = customItems
      .filter(row => row.name.trim() && toNumber(row.amount) > 0)
      .reduce((sum, row) => sum + toNumber(row.quantity), 0);
    return fromCatalog + fromCustom;
  }, [salesItems, qtyStr, amounts, customItems]);

  const discountAmount = useMemo(
    () => previewDiscountAmount(total, discountType, discountValue),
    [total, discountType, discountValue]
  );
  const finalTotal = total - discountAmount;

  // レシート風の確認画面に表示する明細行（商品名・数量・行合計）
  const confirmRows = useMemo(() => {
    const rows: Array<{ name: string; quantity: number; amount: number }> = [];
    for (const item of salesItems) {
      const amount = itemAmount(item);
      if (amount <= 0) continue;
      rows.push({ name: item.name, quantity: toNumber(qtyStr(item)), amount });
    }
    for (const row of customItems) {
      const amount = toNumber(row.amount) * toNumber(row.quantity);
      if (!row.name.trim() || amount <= 0) continue;
      rows.push({ name: row.name.trim(), quantity: toNumber(row.quantity), amount });
    }
    return rows;
  }, [salesItems, itemAmount, qtyStr, customItems]);

  const setQuantity = (id: string, value: string) => {
    setQuantities(prev => ({ ...prev, [id]: sanitizeNonNegative(value) }));
  };
  const stepQuantity = (item: SalesItem, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [item._id]: String(Math.max(0, toNumber(prev[item._id] ?? (item.pricingType === 'fixed' ? '0' : '1')) + delta)),
    }));
  };
  const setAmount = (id: string, value: string) => {
    setAmounts(prev => ({ ...prev, [id]: sanitizeNonNegative(value) }));
  };

  const buildLineItems = () => {
    const catalogLines = salesItems
      .map(item => {
        const qty = toNumber(qtyStr(item));
        return {
          salesItemId: item._id,
          quantity: qty,
          amount: item.pricingType === 'variable' ? toNumber(amounts[item._id] || '0') : undefined,
        };
      })
      .filter(li => (li.quantity || 0) > 0 && (li.amount === undefined || li.amount > 0));
    const customLines = customItems
      .filter(row => row.name.trim() && toNumber(row.amount) > 0 && toNumber(row.quantity) > 0)
      .map(row => ({ customName: row.name.trim(), amount: toNumber(row.amount), quantity: toNumber(row.quantity) }));
    return [...catalogLines, ...customLines];
  };

  const resetForm = () => {
    setVisitorCount('1');
    setQuantities({});
    setAmounts({});
    setCustomItems([]);
    setPaymentMethod('cash');
    setDiscountType('');
    setDiscountValue('0');
    setNotes('');
    setConfirming(false);
    setQrFlow(null);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const handleRegister = async () => {
    const lineItems = buildLineItems();
    const visitors = toNumber(visitorCount);

    if (lineItems.length === 0 && visitors <= 0) {
      alert('商品または来店人数を入力してください');
      return;
    }
    if (lineItems.length > 0 && finalTotal <= 0) {
      alert('割引後の合計金額が0円です。数量・金額・割引を確認してください');
      return;
    }

    setSubmitting(true);
    try {
      if (paymentMethod === 'qr' && lineItems.length > 0) {
        // QR決済: 決済リンクを発行してその場でQR表示、支払い完了までポーリング
        const response = await fetch('/api/admin/in-store-charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineItems, visitorCount: visitors, discountType: discountType || undefined, discountValue: toNumber(discountValue), description: notes.trim() || undefined }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || '決済リンクの発行に失敗しました');
        }
        const data = await response.json();
        setQrFlow({
          chargeId: data.charge._id,
          amount: data.charge.amount,
          subtotal: data.charge.subtotal,
          discountAmount: data.charge.discountAmount,
          qrCodeDataUrl: data.qrCodeDataUrl,
          status: 'pending',
          lineItems: data.charge.lineItems || [],
        });
        startPolling(data.charge._id);
      } else if (paymentMethod === 'pos' && lineItems.length > 0) {
        // POSアプリ起動決済: 決済リンクは発行せず、会計IDを state に載せて
        // Square POSアプリ（iPhoneのタッチ決済等）を起動する。決済後は callback が確定する。
        const response = await fetch('/api/admin/in-store-charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'pos', lineItems, visitorCount: visitors, discountType: discountType || undefined, discountValue: toNumber(discountValue), description: notes.trim() || undefined }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || '会計の作成に失敗しました');
        }
        const data = await response.json();
        const launchUrl = buildPosDeepLink({ amount: data.amount, chargeId: data.charge._id, notes: data.notes });
        setQrFlow({
          chargeId: data.charge._id,
          amount: data.charge.amount,
          subtotal: data.charge.subtotal,
          discountAmount: data.charge.discountAmount,
          status: 'pending',
          lineItems: data.charge.lineItems || [],
          posLaunchUrl: launchUrl,
        });
        startPolling(data.charge._id);
        // 端末のSquare POSアプリを起動（戻り先はこの画面。ポーリングで完了を検知）
        window.location.href = launchUrl;
      } else {
        // qr/pos はそれぞれ専用分岐で処理済み。ここに来るのは現金・PayPay・手動カードのみ。
        const method: PaymentMethod = paymentMethod === 'qr' || paymentMethod === 'pos' ? 'cash' : paymentMethod;
        const response = await fetch('/api/admin/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethod: method,
            visitorCount: visitors,
            lineItems,
            discountType: discountType || undefined,
            discountValue: toNumber(discountValue),
            notes: notes.trim() || undefined,
          }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || '登録に失敗しました');
        }
        onRegistered(
          lineItems.length > 0
            ? `登録しました（${methodLabels[method]} ¥${finalTotal.toLocaleString()}）`
            : `来店のみ登録しました（${visitors}名）`
        );
        resetForm();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const startPolling = (chargeId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/in-store-charge/${chargeId}`);
        if (!response.ok) return;
        const data = await response.json();
        if (data.charge.status !== 'pending') {
          setQrFlow(prev => (prev ? { ...prev, status: data.charge.status } : prev));
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // ポーリング中の一時的なエラーは無視して次回に再試行する
      }
    }, 3000);
  };

  const handleQrAbort = async () => {
    if (!qrFlow) return;
    if (!confirm('このQR決済を取り消しますか？')) return;
    try {
      await fetch(`/api/admin/in-store-charge/${qrFlow.chargeId}/cancel`, { method: 'POST' });
    } catch {
      // 取り消しAPIの失敗は握りつぶす（未払いのまま放置されても実害はない）
    }
    resetForm();
  };

  const handleQrDone = () => {
    onRegistered(`決済が完了しました（¥${qrFlow?.amount.toLocaleString()}）`);
    resetForm();
  };

  // 現金・PayPay・手動カードの確認中はフォームの代わりにレシート風の確認画面を表示。
  // 将来のレシート印刷・メール送信を見据え、紙のレシートに近い体裁にしている。
  if (confirming) {
    // 表示用の税内訳（確定値はサーバーが計算する。src/lib/tax.ts と同じ計算式）
    const taxExcluded = Math.round(finalTotal / 1.1);
    return (
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div className="text-center border-b pb-3">
          <h2 className="font-bold text-gray-900 tracking-wider">MOSS COUNTRY</h2>
          <p className="text-xs text-gray-500 mt-1">お会計内容のご確認</p>
        </div>

        <ul className="divide-y text-sm text-gray-700">
          {confirmRows.map((row, idx) => (
            <li key={idx} className="py-2 flex justify-between gap-2">
              <span className="min-w-0">{row.name}{row.quantity > 1 ? ` × ${row.quantity}` : ''}</span>
              <span className="shrink-0">¥{row.amount.toLocaleString()}</span>
            </li>
          ))}
        </ul>

        <div className="border-t pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>小計</span>
            <span>¥{total.toLocaleString()}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-red-600 font-medium">
              <span>割引</span>
              <span>−¥{discountAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-1">
            <span className="font-medium text-gray-900">合計</span>
            <span className="text-3xl font-bold text-gray-900">¥{finalTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>（内訳）税抜金額</span>
            <span>¥{taxExcluded.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>消費税（10%）</span>
            <span>¥{(finalTotal - taxExcluded).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex justify-between items-center border-t pt-3 text-sm">
          <span className="text-gray-600">お支払い方法</span>
          <span className="font-bold text-gray-900">{methodLabels[paymentMethod]}</span>
        </div>
        {notes.trim() && (
          <p className="text-xs text-gray-400 italic">{notes}</p>
        )}

        {paymentMethod === 'payPay' && payPayQrUrl && (
          <div className="text-center border-t pt-3 space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={payPayQrUrl} alt="PayPay 店舗用QRコード" className="mx-auto w-56 h-56 object-contain" />
            <p className="text-sm text-gray-500">
              お客様にPayPayでこのQRコードを読み取ってもらい、合計金額 ¥{finalTotal.toLocaleString()} を入力してもらってください
            </p>
          </div>
        )}
        {paymentMethod === 'payPay' && !payPayQrUrl && (
          <p className="text-xs text-gray-400 text-center">
            PayPayの店舗用QRコード画像を<Link href="/admin/sales/items" className="underline">項目カタログ</Link>で設定すると、ここに表示されます
          </p>
        )}

        <button
          onClick={handleRegister}
          disabled={submitting}
          className="w-full py-4 bg-moss-green text-white text-lg font-medium rounded-md hover:bg-moss-green/90 disabled:opacity-50"
        >
          {submitting ? '登録中...' : '決済完了・登録する'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={submitting}
          className="w-full py-3 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          戻って修正する
        </button>
      </div>
    );
  }

  // QR決済フロー中はフォームの代わりにQR画面を表示
  if (qrFlow) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center space-y-4">
        <p className="text-3xl font-bold text-gray-900">¥{qrFlow.amount.toLocaleString()}</p>
        <ul className="text-left text-sm text-gray-600 divide-y border rounded-md">
          {qrFlow.lineItems.map((li, idx) => (
            <li key={idx} className="px-3 py-2 flex justify-between">
              <span>{li.name}{li.quantity ? ` × ${li.quantity}` : ''}</span>
              <span>¥{(li.amount || 0).toLocaleString()}</span>
            </li>
          ))}
        </ul>
        {(qrFlow.discountAmount || 0) > 0 && (
          <div className="text-right space-y-0.5">
            <p className="text-red-600 font-medium">割引: ¥{(qrFlow.discountAmount || 0).toLocaleString()}</p>
            <p className="text-red-600 font-bold">合計: ¥{qrFlow.amount.toLocaleString()}</p>
          </div>
        )}

        {qrFlow.status === 'pending' && (
          <>
            {qrFlow.posLaunchUrl ? (
              <>
                <a
                  href={qrFlow.posLaunchUrl}
                  className="block w-full py-4 bg-moss-green text-white text-lg font-medium rounded-md hover:bg-moss-green/90 text-center"
                >
                  Square POSアプリを起動して決済
                </a>
                <p className="text-sm text-gray-500">アプリで決済後、この画面に自動で戻ります。戻らない場合は上のボタンをもう一度押してください。</p>
              </>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrFlow.qrCodeDataUrl} alt="決済用QRコード" className="mx-auto w-64 h-64" />
                <p className="text-sm text-gray-500">お客様のスマホでQRコードを読み取ってお支払いください</p>
              </>
            )}
            <p className="text-sm text-moss-green animate-pulse">支払い待ち...</p>
            <button onClick={handleQrAbort} className="w-full py-3 border border-gray-300 rounded-md hover:bg-gray-50">
              取り消す
            </button>
          </>
        )}

        {qrFlow.status === 'paid' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">✓</span>
            </div>
            <p className="text-emerald-600 font-medium">支払いが完了しました</p>
            <button onClick={handleQrDone} className="w-full py-4 bg-moss-green text-white text-lg font-medium rounded-md hover:bg-moss-green/90">
              新しい会計を開始
            </button>
          </div>
        )}

        {(qrFlow.status === 'cancelled' || qrFlow.status === 'refunded') && (
          <div className="space-y-4">
            <p className="text-red-600 font-medium">支払いがキャンセル・失敗しました</p>
            <button onClick={resetForm} className="w-full py-3 border border-gray-300 rounded-md hover:bg-gray-50">
              新しい会計を開始
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 来店人数 */}
      <div className="bg-white shadow rounded-lg p-4 flex items-center justify-between">
        <span className="font-medium text-gray-900">来店人数</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVisitorCount(String(Math.max(0, toNumber(visitorCount) - 1)))}
            className="w-11 h-11 text-xl border border-gray-300 rounded-md hover:bg-gray-50"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={displayStr(visitorCount)}
            onChange={(e) => setVisitorCount(sanitizeNonNegative(e.target.value))}
            placeholder="0"
            className="w-16 px-1 py-2 text-lg text-center text-blue-700 font-bold border border-gray-300 rounded-md"
          />
          <button
            onClick={() => setVisitorCount(String(toNumber(visitorCount) + 1))}
            className="w-11 h-11 text-xl border border-gray-300 rounded-md hover:bg-gray-50"
          >
            ＋
          </button>
        </div>
      </div>

      {loadingItems ? (
        <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
      ) : (
        <>
          {categoryOrder.map(category => {
            const itemsInCategory = sortByNameJa(salesItems.filter(item => item.category === category && item.isActive));
            if (itemsInCategory.length === 0) return null;

            const categoryTotal = itemsInCategory.reduce((sum, item) => sum + itemAmount(item), 0);
            return (
              <details key={category} className="bg-white shadow rounded-lg overflow-hidden" open>
                <summary className="px-4 py-3 bg-gray-50 font-medium text-gray-900 cursor-pointer flex justify-between items-center">
                  <span>{categoryLabels[category]}</span>
                  {categoryTotal > 0 && <span className="text-sm text-moss-green font-bold">¥{categoryTotal.toLocaleString()}</span>}
                </summary>
                <ul className="divide-y">
                  {itemsInCategory.map(item => (
                    <li key={item._id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        {item.pricingType === 'fixed' && (
                          <p className="text-xs text-gray-500">単価 ¥{(item.unitPrice || 0).toLocaleString()}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {item.pricingType === 'variable' && (
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={displayStr(amounts[item._id] || '0')}
                            onChange={(e) => setAmount(item._id, e.target.value)}
                            placeholder="単価"
                            className="w-20 px-2 py-2 text-sm text-right text-blue-700 font-bold border border-gray-300 rounded-md mr-1"
                          />
                        )}
                        <button
                          onClick={() => stepQuantity(item, -1)}
                          className="w-10 h-10 text-lg border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={displayStr(qtyStr(item))}
                          onChange={(e) => setQuantity(item._id, e.target.value)}
                          placeholder="0"
                          className="w-12 px-1 py-2 text-sm text-center text-blue-700 font-bold border border-gray-300 rounded-md"
                        />
                        <button
                          onClick={() => stepQuantity(item, 1)}
                          className="w-10 h-10 text-lg border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          ＋
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}

          {salesItems.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              売上項目が登録されていません。<Link href="/admin/sales/items" className="underline">項目カタログ</Link>から初期データを投入してください。
            </div>
          )}

          {/* カタログ外の商品 */}
          <div className="bg-white shadow rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-gray-900 text-sm">その他（カタログにない商品）</h2>
              <button
                onClick={() => setCustomItems(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, name: '', amount: '0', quantity: '1' }])}
                className="text-sm px-3 py-1.5 bg-moss-green text-white rounded-md hover:bg-moss-green/90"
              >
                + 追加
              </button>
            </div>
            <ul className="space-y-2">
              {customItems.map(row => (
                <li key={row.id} className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => setCustomItems(prev => prev.map(r => r.id === row.id ? { ...r, name: e.target.value } : r))}
                    placeholder="商品名"
                    className="flex-1 min-w-0 px-2 py-2 text-sm border border-gray-300 rounded-md"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={displayStr(row.amount)}
                    onChange={(e) => setCustomItems(prev => prev.map(r => r.id === row.id ? { ...r, amount: sanitizeNonNegative(e.target.value) } : r))}
                    placeholder="単価"
                    className="w-20 px-2 py-2 text-sm text-right text-blue-700 font-bold border border-gray-300 rounded-md"
                  />
                  <span className="text-gray-400 text-xs">×</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={displayStr(row.quantity)}
                    onChange={(e) => setCustomItems(prev => prev.map(r => r.id === row.id ? { ...r, quantity: sanitizeNonNegative(e.target.value) } : r))}
                    placeholder="個数"
                    className="w-14 px-1 py-2 text-sm text-center text-blue-700 font-bold border border-gray-300 rounded-md"
                  />
                  <button
                    onClick={() => setCustomItems(prev => prev.filter(r => r.id !== row.id))}
                    className="text-red-500 text-sm px-2"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* 会計バー（割引＋支払い方法＋登録） */}
          <div className="sticky bottom-0 bg-white border border-gray-200 shadow-lg rounded-lg p-4 space-y-3">
            {total > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as DiscountType | '')}
                  className="px-2 py-2 text-sm border border-gray-300 rounded-md"
                >
                  <option value="">割引なし</option>
                  <option value="amount">割引（円）</option>
                  <option value="percent">割引（%）</option>
                </select>
                {discountType && (
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={displayStr(discountValue)}
                    onChange={(e) => setDiscountValue(sanitizeNonNegative(e.target.value))}
                    placeholder={discountType === 'amount' ? '円' : '%'}
                    className="w-24 px-2 py-2 text-sm text-right text-blue-700 font-bold border border-gray-300 rounded-md"
                  />
                )}
              </div>
            )}
            {total > 0 && (
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="メモ（任意）例: 常連さん割引"
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md"
              />
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{itemCount > 0 ? `${itemCount}点` : '商品未選択'}</span>
              <div className="text-right">
                {discountAmount > 0 && (
                  <p className="text-xs text-gray-500">
                    小計 ¥{total.toLocaleString()} − 割引 ¥{discountAmount.toLocaleString()}
                  </p>
                )}
                <span className="text-2xl font-bold text-gray-900">¥{finalTotal.toLocaleString()}</span>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {(['cash', 'payPay', 'qr', 'card', 'pos'] as EntryMethod[]).map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2.5 text-xs font-medium rounded-md border ${
                    paymentMethod === method
                      ? 'bg-moss-green text-white border-moss-green'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {methodLabels[method]}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                // 商品ありの現金・PayPay・手動カードはレシート風の確認画面を挟む
                // （QR・POSアプリ起動は決済画面自体が確認を兼ね、来店のみは確認不要のため直接登録）
                if (total > 0 && paymentMethod !== 'qr' && paymentMethod !== 'pos') {
                  if (finalTotal <= 0) {
                    alert('割引後の合計金額が0円です。数量・金額・割引を確認してください');
                    return;
                  }
                  setConfirming(true);
                } else {
                  handleRegister();
                }
              }}
              disabled={submitting || (finalTotal <= 0 && toNumber(visitorCount) <= 0)}
              className="w-full py-4 bg-moss-green text-white text-lg font-medium rounded-md hover:bg-moss-green/90 disabled:opacity-50"
            >
              {submitting
                ? '登録中...'
                : total > 0
                  ? (paymentMethod === 'qr'
                      ? 'QRコードを発行'
                      : paymentMethod === 'pos'
                        ? 'Square POSアプリで決済'
                        : `${methodLabels[paymentMethod]}で確認`)
                  : '来店のみ登録'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ========== 集計・履歴タブ ==========

function SummaryTab({
  salesItems,
  onMessage,
}: {
  salesItems: SalesItem[];
  onMessage: (text: string) => void;
}) {
  const [date, setDate] = useState(todayJstString());
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visitorCount, setVisitorCount] = useState('0');
  const [purchaseGroupCount, setPurchaseGroupCount] = useState('0');
  const [wordOfMouthDiscount, setWordOfMouthDiscount] = useState('0');
  const [adjustment, setAdjustment] = useState('0');
  const [notes, setNotes] = useState('');
  const [edit, setEdit] = useState<EditState | null>(null);
  const [busyId, setBusyId] = useState('');
  const [showHistoricalPanel, setShowHistoricalPanel] = useState(false);

  const loadDay = useCallback(async (targetDate: string) => {
    setLoading(true);
    setEdit(null);
    try {
      const response = await fetch(`/api/admin/sales/${targetDate}`);
      if (!response.ok) throw new Error('取得に失敗しました');
      const dayData: DayData = await response.json();
      setData(dayData);
      setVisitorCount(String(dayData.dailySales?.visitorCount ?? 0));
      setPurchaseGroupCount(String(dayData.dailySales?.purchaseGroupCount ?? 0));
      setWordOfMouthDiscount(String(dayData.dailySales?.wordOfMouthDiscount ?? 0));
      setAdjustment(String(dayData.dailySales?.adjustment ?? 0));
      setNotes(dayData.dailySales?.notes || '');
    } catch (err) {
      console.error('売上データ取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDay(date);
  }, [date, loadDay]);

  const agg = data?.aggregate;
  // 調整・割引は保存前でも画面上の総売上に即時反映する
  const grandTotal = (agg?.storeTotal || 0) + toNumber(adjustment) - toNumber(wordOfMouthDiscount) + (agg?.ecTotal || 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/sales/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorCount: toNumber(visitorCount),
          purchaseGroupCount: toNumber(purchaseGroupCount),
          wordOfMouthDiscount: toNumber(wordOfMouthDiscount),
          adjustment: toNumber(adjustment),
          notes,
        }),
      });
      if (!response.ok) throw new Error('保存に失敗しました');
      onMessage('保存しました（Googleシートにも同期されます）');
      await loadDay(date);
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // ----- 取引の編集 -----

  const openEdit = (tx: TransactionView) => {
    setEdit({
      id: tx._id,
      isCharge: false,
      paymentMethod: tx.paymentMethod || 'cash',
      visitorCount: String(tx.visitorCount ?? 0),
      lines: (tx.lineItems || []).map(li => toEditLine(li, salesItems)),
      discountType: tx.discountType || '',
      discountValue: String(tx.discountValue ?? 0),
      notes: tx.notes || '',
    });
  };

  const openChargeEdit = (charge: ChargeView) => {
    setEdit({
      id: charge._id,
      isCharge: true,
      paymentMethod: 'card',
      visitorCount: String(charge.visitorCount ?? 0),
      lines: (charge.lineItems || []).map(li => toEditLine(li, salesItems)),
      paidAmount: charge.amount,
      discountType: '',
      discountValue: '0',
      notes: '',
    });
  };

  const handleEditSave = async () => {
    if (!edit) return;
    setBusyId(edit.id);
    try {
      // amount は「単価」として送る（サーバー側で 単価 × 数量 に確定される）
      const lineItems = edit.lines
        .map(line => {
          if (line.salesItemId) {
            return {
              salesItemId: line.salesItemId,
              quantity: toNumber(line.quantity),
              amount: line.pricingType === 'variable' ? toNumber(line.amount) : undefined,
            };
          }
          return { customName: line.name, amount: toNumber(line.amount), quantity: toNumber(line.quantity) };
        })
        .filter(li => (li.quantity || 0) > 0 && (li.amount === undefined || li.amount > 0));

      const url = edit.isCharge
        ? `/api/admin/in-store-charge/${edit.id}`
        : `/api/admin/transactions/${edit.id}`;
      const body = edit.isCharge
        ? { lineItems }
        : {
            lineItems,
            paymentMethod: edit.paymentMethod,
            visitorCount: toNumber(edit.visitorCount),
            discountType: edit.discountType || undefined,
            discountValue: toNumber(edit.discountValue),
            notes: edit.notes.trim() || undefined,
          };

      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const resData = await response.json().catch(() => ({}));
        throw new Error(resData.error || '更新に失敗しました');
      }
      onMessage('更新しました');
      await loadDay(date);
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setBusyId('');
    }
  };

  const handleDelete = async (tx: TransactionView) => {
    if (!confirm(`この取引（¥${(tx.total || 0).toLocaleString()}）を削除しますか？来店者数・組数も戻ります。`)) return;
    setBusyId(tx._id);
    try {
      const response = await fetch(`/api/admin/transactions/${tx._id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('削除に失敗しました');
      onMessage('削除しました');
      await loadDay(date);
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setBusyId('');
    }
  };

  const handleChargeCancel = async (charge: ChargeView) => {
    const confirmText = charge.status === 'paid'
      ? `この決済（¥${(charge.amount || 0).toLocaleString()}）を返金しますか？\nお客様のカードに実際に全額返金されます。この操作は取り消せません。`
      : 'この未払いのQR決済を取り消しますか？';
    if (!confirm(confirmText)) return;
    setBusyId(charge._id);
    try {
      const response = await fetch(`/api/admin/in-store-charge/${charge._id}/cancel`, { method: 'POST' });
      if (!response.ok) {
        const resData = await response.json().catch(() => ({}));
        throw new Error(resData.error || 'キャンセルに失敗しました');
      }
      onMessage(charge.status === 'paid' ? '返金しました' : '取り消しました');
      await loadDay(date);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'キャンセルに失敗しました');
    } finally {
      setBusyId('');
    }
  };

  // 履歴: 手動取引とQR決済を時刻順にマージ
  const historyEntries = useMemo(() => {
    const entries: Array<{ kind: 'tx'; tx: TransactionView } | { kind: 'charge'; charge: ChargeView }> = [];
    for (const tx of data?.transactions || []) entries.push({ kind: 'tx', tx });
    for (const charge of data?.charges || []) entries.push({ kind: 'charge', charge });
    return entries.sort((a, b) => {
      const timeA = a.kind === 'tx' ? a.tx.createdAt || '' : a.charge.createdAt || '';
      const timeB = b.kind === 'tx' ? b.tx.createdAt || '' : b.charge.createdAt || '';
      return timeB.localeCompare(timeA);
    });
  }, [data]);

  if (loading) {
    return <div className="animate-pulse h-64 bg-gray-200 rounded"></div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white shadow rounded-lg p-4">
        <label className="block text-sm text-gray-600 mb-1">日付</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="block w-full min-w-0 max-w-full box-border appearance-none px-3 py-3 text-lg border border-gray-300 rounded-md"
        />
      </div>

      {/* 集計サマリー */}
      <div className="bg-white shadow rounded-lg p-4 space-y-2">
        <h2 className="font-medium text-gray-900 mb-2">集計（取引から自動計算）</h2>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">現金</span>
          <span>¥{(agg?.methodTotals.cash || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">PayPay</span>
          <span>¥{(agg?.methodTotals.payPay || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">クレジット（手動）</span>
          <span>¥{(agg?.methodTotals.card || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">クレジット（QR）</span>
          <span>¥{(agg?.methodTotals.qr || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm font-medium border-t pt-2">
          <span className="text-gray-700">店舗売上合計</span>
          <span>¥{(agg?.storeTotal || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">EC（オンライン）売上</span>
          <span>¥{(agg?.ecTotal || 0).toLocaleString()}</span>
        </div>
        {(agg?.discountTotal || 0) > 0 && (
          <div className="flex justify-between text-sm text-orange-600">
            <span>割引合計</span>
            <span>−¥{(agg?.discountTotal || 0).toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg border-t pt-2">
          <span>その日の総売上</span>
          <span>¥{grandTotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>（内訳）税抜金額</span>
          <span>¥{(agg?.taxExcludedTotal || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>消費税（10%）</span>
          <span>¥{(agg?.taxAmountTotal || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* 商品別明細 */}
      {agg && agg.itemRows.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4 overflow-x-auto">
          <h2 className="font-medium text-gray-900 mb-2">商品別明細</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="text-left py-1 pr-2">商品</th>
                <th className="text-right py-1 px-1">現金</th>
                <th className="text-right py-1 px-1">PayPay</th>
                <th className="text-right py-1 px-1">カード</th>
                <th className="text-right py-1 px-1">QR</th>
                <th className="text-right py-1 px-1">EC</th>
                <th className="text-right py-1 pl-1">合計</th>
              </tr>
            </thead>
            <tbody>
              {agg.itemRows.map(row => (
                <tr key={row.key} className="border-b last:border-0">
                  <td className="py-1.5 pr-2 text-gray-900">{row.name}</td>
                  {(['cash', 'payPay', 'card', 'qr', 'ec'] as const).map(method => (
                    <td key={method} className="text-right py-1.5 px-1 text-gray-600">
                      {row[method].amount > 0
                        ? (row[method].quantity > 0 ? `${row[method].quantity}個` : `¥${row[method].amount.toLocaleString()}`)
                        : ''}
                    </td>
                  ))}
                  <td className="text-right py-1.5 pl-1 font-medium">¥{row.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* カウンタ・調整・備考 */}
      <div className="bg-white shadow rounded-lg p-4 space-y-3">
        <h2 className="font-medium text-gray-900">来店・調整（自動加算済み、手修正可）</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">来店者数</label>
            <input type="number" inputMode="numeric" min="0" value={displayStr(visitorCount)} onChange={(e) => setVisitorCount(sanitizeNonNegative(e.target.value))} placeholder="0" className={numberInputClass} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">購入組数</label>
            <input type="number" inputMode="numeric" min="0" value={displayStr(purchaseGroupCount)} onChange={(e) => setPurchaseGroupCount(sanitizeNonNegative(e.target.value))} placeholder="0" className={numberInputClass} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">調整（マイナス可）</label>
            <input type="number" inputMode="numeric" value={displayStr(adjustment)} onChange={(e) => setAdjustment(e.target.value)} placeholder="0" className={numberInputClass} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">口コミ割引</label>
            <input type="number" inputMode="numeric" min="0" value={displayStr(wordOfMouthDiscount)} onChange={(e) => setWordOfMouthDiscount(sanitizeNonNegative(e.target.value))} placeholder="0" className={numberInputClass} />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">備考</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-moss-green text-white font-medium rounded-md hover:bg-moss-green/90 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存（Googleシート同期）'}
        </button>
      </div>

      {/* 取引履歴 */}
      <div className="bg-white shadow rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-medium text-gray-900">取引履歴</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistoricalPanel(v => !v)}
              className="text-xs px-3 py-1.5 border border-moss-green text-moss-green rounded-md hover:bg-moss-green/10"
            >
              {showHistoricalPanel ? '過去実績の入力を閉じる' : '過去の実績を入力'}
            </button>
            <a
              href="https://squareup.com/dashboard/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-moss-green hover:underline"
            >
              Squareダッシュボード ↗
            </a>
          </div>
        </div>

        {showHistoricalPanel && (
          <HistoricalEntryPanel
            salesItems={salesItems}
            date={date}
            onDone={(registeredDate) => {
              setShowHistoricalPanel(false);
              onMessage(`過去の実績を登録しました（${registeredDate}）`);
              // 登録した日付に切り替えて、その場で反映結果を確認できるようにする
              setDate(registeredDate);
            }}
            onEntryAdded={(registeredDate) => {
              onMessage(`1件登録しました（${registeredDate}）`);
              // パネルは閉じず、日付だけ揃えてその場で履歴に反映する
              if (registeredDate !== date) setDate(registeredDate);
              else loadDay(date);
            }}
            onCancel={() => setShowHistoricalPanel(false)}
          />
        )}

        {historyEntries.length === 0 && !showHistoricalPanel && (
          <p className="text-sm text-gray-500">
            この日の取引はまだありません。紙の記録が残っている日付なら「過去の実績を入力」から登録できます。
          </p>
        )}

        <ul className="divide-y">
          {historyEntries.map(entry => {
            if (entry.kind === 'tx') {
              const tx = entry.tx;
              const isEditing = edit?.id === tx._id;
              return (
                <li key={tx._id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400">{formatTime(tx.createdAt)}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                          {methodLabels[tx.paymentMethod || 'cash']}
                        </span>
                        {tx.source === 'historical' && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">手書き記録</span>
                        )}
                        {(tx.visitorCount || 0) > 0 && (
                          <span className="text-xs text-gray-500">{tx.visitorCount}名</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{itemsSummary(tx.lineItems)}</p>
                      {(tx.discountAmount || 0) > 0 && (
                        <p className="text-xs text-red-600 font-medium mt-0.5">
                          割引: −¥{(tx.discountAmount || 0).toLocaleString()}（小計 ¥{(tx.subtotal || 0).toLocaleString()}）
                        </p>
                      )}
                      {tx.notes && <p className="text-xs text-gray-400 italic mt-0.5">{tx.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">¥{(tx.total || 0).toLocaleString()}</p>
                      <div className="flex gap-2 mt-1 justify-end">
                        <button
                          onClick={() => (isEditing ? setEdit(null) : openEdit(tx))}
                          disabled={busyId === tx._id}
                          className="text-xs text-moss-green hover:underline"
                        >
                          {isEditing ? '閉じる' : '編集'}
                        </button>
                        <button
                          onClick={() => handleDelete(tx)}
                          disabled={busyId === tx._id}
                          className="text-xs text-red-500 hover:underline"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                  {isEditing && edit && (
                    <EditPanel
                      edit={edit}
                      setEdit={setEdit}
                      salesItems={salesItems}
                      onSave={handleEditSave}
                      saving={busyId === tx._id}
                    />
                  )}
                </li>
              );
            }

            const charge = entry.charge;
            const status = chargeStatusLabels[charge.status || 'pending'] || chargeStatusLabels.pending;
            const isEditing = edit?.id === charge._id;
            return (
              <li key={charge._id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400">{formatTime(charge.createdAt)}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">クレジット(QR)</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${status.className}`}>{status.label}</span>
                      {(charge.visitorCount || 0) > 0 && (
                        <span className="text-xs text-gray-500">{charge.visitorCount}名</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{itemsSummary(charge.lineItems)}</p>
                    {(charge.discountAmount || 0) > 0 && (
                      <p className="text-xs text-red-600 font-medium mt-0.5">
                        割引: −¥{(charge.discountAmount || 0).toLocaleString()}（小計 ¥{(charge.subtotal || 0).toLocaleString()}）
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900">¥{(charge.amount || 0).toLocaleString()}</p>
                    <div className="flex gap-2 mt-1 justify-end">
                      {charge.status === 'paid' && (
                        <button
                          onClick={() => (isEditing ? setEdit(null) : openChargeEdit(charge))}
                          disabled={busyId === charge._id}
                          className="text-xs text-moss-green hover:underline"
                        >
                          {isEditing ? '閉じる' : '記録を編集'}
                        </button>
                      )}
                      {(charge.status === 'pending' || charge.status === 'paid') && (
                        <button
                          onClick={() => handleChargeCancel(charge)}
                          disabled={busyId === charge._id}
                          className="text-xs text-red-500 hover:underline"
                        >
                          {busyId === charge._id ? '処理中...' : charge.status === 'paid' ? '返金' : '取り消し'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {isEditing && edit && (
                  <EditPanel
                    edit={edit}
                    setEdit={setEdit}
                    salesItems={salesItems}
                    onSave={handleEditSave}
                    saving={busyId === charge._id}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function HistoricalSingleEntry({
  salesItems,
  date,
  onAdded,
}: {
  salesItems: SalesItem[];
  date: string;
  onAdded: (registeredDate: string) => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [customItems, setCustomItems] = useState<CustomItemRow[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [discountType, setDiscountType] = useState<DiscountType | ''>('');
  const [discountValue, setDiscountValue] = useState('0');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const qtyStr = useCallback((item: SalesItem) => {
    return quantities[item._id] ?? (item.pricingType === 'fixed' ? '0' : '1');
  }, [quantities]);

  const itemAmount = useCallback((item: SalesItem) => {
    if (item.pricingType === 'fixed') {
      return toNumber(qtyStr(item)) * (item.unitPrice || 0);
    }
    return toNumber(amounts[item._id] || '0') * toNumber(qtyStr(item));
  }, [qtyStr, amounts]);

  const subtotal = useMemo(() => {
    const fromCatalog = salesItems.reduce((sum, item) => sum + itemAmount(item), 0);
    const fromCustom = customItems.reduce((sum, row) => sum + toNumber(row.amount) * toNumber(row.quantity), 0);
    return fromCatalog + fromCustom;
  }, [salesItems, itemAmount, customItems]);

  const discountAmount = useMemo(
    () => previewDiscountAmount(subtotal, discountType, discountValue),
    [subtotal, discountType, discountValue]
  );
  const grandTotal = subtotal - discountAmount;

  const setQuantity = (id: string, value: string) => {
    setQuantities(prev => ({ ...prev, [id]: sanitizeNonNegative(value) }));
  };
  const stepQuantity = (item: SalesItem, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [item._id]: String(Math.max(0, toNumber(prev[item._id] ?? (item.pricingType === 'fixed' ? '0' : '1')) + delta)),
    }));
  };
  const setAmount = (id: string, value: string) => {
    setAmounts(prev => ({ ...prev, [id]: sanitizeNonNegative(value) }));
  };

  const resetItemSelections = () => {
    setQuantities({});
    setAmounts({});
    setCustomItems([]);
    setDiscountType('');
    setDiscountValue('0');
    setNotes('');
  };

  const handleSubmit = async () => {
    const catalogLines = salesItems
      .map(item => ({
        salesItemId: item._id,
        quantity: toNumber(qtyStr(item)),
        amount: item.pricingType === 'variable' ? toNumber(amounts[item._id] || '0') : undefined,
      }))
      .filter(li => (li.quantity || 0) > 0 && (li.amount === undefined || li.amount > 0));
    const customLines = customItems
      .filter(row => row.name.trim() && toNumber(row.amount) > 0 && toNumber(row.quantity) > 0)
      .map(row => ({ customName: row.name.trim(), amount: toNumber(row.amount), quantity: toNumber(row.quantity) }));
    const lineItems = [...catalogLines, ...customLines];

    if (lineItems.length === 0) {
      alert('商品を1つ以上入力してください');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      alert('日付を指定してください');
      return;
    }
    if (grandTotal <= 0) {
      alert('割引後の合計金額が0円です。数量・金額・割引を確認してください');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          paymentMethod,
          visitorCount: 0,
          lineItems,
          discountType: discountType || undefined,
          discountValue: toNumber(discountValue),
          notes: notes.trim() || undefined,
          isHistorical: true,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '登録に失敗しました');
      }
      resetItemSelections();
      onAdded(date);
    } catch (err) {
      alert(err instanceof Error ? err.message : '登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        1件の会計として、その日の紙の記録を1つずつ登録できます。登録するたびにこのフォームがリセットされるので、続けて何件でも入力できます。
      </p>

      {categoryOrder.map(category => {
        const itemsInCategory = sortByNameJa(salesItems.filter(item => item.category === category && item.isActive));
        if (itemsInCategory.length === 0) return null;
        const categoryTotal = itemsInCategory.reduce((sum, item) => sum + itemAmount(item), 0);
        return (
          <details key={category} className="bg-white border rounded-md overflow-hidden" open>
            <summary className="px-3 py-2 bg-gray-50 font-medium text-sm cursor-pointer flex justify-between items-center">
              <span>{categoryLabels[category]}</span>
              {categoryTotal > 0 && <span className="text-moss-green font-bold">¥{categoryTotal.toLocaleString()}</span>}
            </summary>
            <ul className="divide-y">
              {itemsInCategory.map(item => (
                <li key={item._id} className="px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    {item.pricingType === 'fixed' && (
                      <p className="text-xs text-gray-500">単価 ¥{(item.unitPrice || 0).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {item.pricingType === 'variable' && (
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={displayStr(amounts[item._id] || '0')}
                        onChange={(e) => setAmount(item._id, e.target.value)}
                        placeholder="単価"
                        className="w-20 px-2 py-2 text-sm text-right text-blue-700 font-bold border border-gray-300 rounded-md mr-1"
                      />
                    )}
                    <button onClick={() => stepQuantity(item, -1)} className="w-9 h-9 text-lg border border-gray-300 rounded-md hover:bg-gray-50">−</button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={displayStr(qtyStr(item))}
                      onChange={(e) => setQuantity(item._id, e.target.value)}
                      placeholder="0"
                      className="w-12 px-1 py-2 text-sm text-center text-blue-700 font-bold border border-gray-300 rounded-md"
                    />
                    <button onClick={() => stepQuantity(item, 1)} className="w-9 h-9 text-lg border border-gray-300 rounded-md hover:bg-gray-50">＋</button>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        );
      })}

      {salesItems.length === 0 && (
        <p className="text-sm text-gray-500">売上項目が登録されていません。</p>
      )}

      {/* カタログ外の商品 */}
      <div className="bg-white border rounded-md p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">その他（カタログにない商品）</h4>
          <button
            onClick={() => setCustomItems(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, name: '', amount: '0', quantity: '1' }])}
            className="text-xs px-3 py-1.5 bg-moss-green text-white rounded-md hover:bg-moss-green/90"
          >
            + 追加
          </button>
        </div>
        <ul className="space-y-2">
          {customItems.map(row => (
            <li key={row.id} className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={row.name}
                onChange={(e) => setCustomItems(prev => prev.map(r => r.id === row.id ? { ...r, name: e.target.value } : r))}
                placeholder="商品名"
                className="flex-1 min-w-0 px-2 py-2 text-sm border border-gray-300 rounded-md"
              />
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={displayStr(row.amount)}
                onChange={(e) => setCustomItems(prev => prev.map(r => r.id === row.id ? { ...r, amount: sanitizeNonNegative(e.target.value) } : r))}
                placeholder="単価"
                className="w-20 px-2 py-2 text-sm text-right text-blue-700 font-bold border border-gray-300 rounded-md"
              />
              <span className="text-gray-400 text-xs">×</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={displayStr(row.quantity)}
                onChange={(e) => setCustomItems(prev => prev.map(r => r.id === row.id ? { ...r, quantity: sanitizeNonNegative(e.target.value) } : r))}
                placeholder="個数"
                className="w-14 px-1 py-2 text-sm text-center text-blue-700 font-bold border border-gray-300 rounded-md"
              />
              <button onClick={() => setCustomItems(prev => prev.filter(r => r.id !== row.id))} className="text-red-500 text-sm px-2">✕</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white border rounded-md p-3 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {(['cash', 'payPay', 'card'] as PaymentMethod[]).map(method => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={`py-2 text-xs font-medium rounded-md border ${
                paymentMethod === method
                  ? 'bg-moss-green text-white border-moss-green'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {methodLabels[method]}
            </button>
          ))}
        </div>
        {subtotal > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as DiscountType | '')}
              className="px-2 py-2 text-sm border border-gray-300 rounded-md"
            >
              <option value="">割引なし</option>
              <option value="amount">割引（円）</option>
              <option value="percent">割引（%）</option>
            </select>
            {discountType && (
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={displayStr(discountValue)}
                onChange={(e) => setDiscountValue(sanitizeNonNegative(e.target.value))}
                placeholder={discountType === 'amount' ? '円' : '%'}
                className="w-24 px-2 py-2 text-sm text-right text-blue-700 font-bold border border-gray-300 rounded-md"
              />
            )}
          </div>
        )}
        {subtotal > 0 && (
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="メモ（任意）例: 常連さん割引"
            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md"
          />
        )}
      </div>

      <div className="border-t pt-3 space-y-1">
        <div className="flex justify-between text-sm text-gray-600">
          <span>小計</span>
          <span>¥{subtotal.toLocaleString()}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>割引</span>
            <span>−¥{discountAmount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">合計</span>
          <span className="text-xl font-bold text-gray-900">¥{grandTotal.toLocaleString()}</span>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 bg-moss-green text-white font-medium rounded-md hover:bg-moss-green/90 disabled:opacity-50"
      >
        {submitting ? '登録中...' : 'この1件を登録して続ける'}
      </button>
    </div>
  );
}

// ========== 取引の編集パネル ==========

function toEditLine(li: LineItemView, salesItems: SalesItem[]): EditLine {
  const catalogItem = li.salesItemId ? salesItems.find(item => item._id === li.salesItemId) : undefined;
  const pricingType = catalogItem ? catalogItem.pricingType : (li.salesItemId ? 'fixed' : 'custom');
  // variable/custom は保存時に行合計で記録されているため、編集用に 単価 = 合計 ÷ 数量 へ戻す
  const quantity = li.quantity && li.quantity > 0 ? li.quantity : (pricingType === 'fixed' ? 0 : 1);
  const unitAmount = pricingType === 'fixed'
    ? (li.amount ?? 0)
    : Math.round((li.amount ?? 0) / (quantity || 1));
  return {
    salesItemId: li.salesItemId,
    name: li.name,
    pricingType,
    unitPrice: catalogItem?.unitPrice,
    quantity: String(quantity),
    amount: String(unitAmount),
  };
}

function EditPanel({
  edit,
  setEdit,
  salesItems,
  onSave,
  saving,
}: {
  edit: EditState;
  setEdit: (edit: EditState | null) => void;
  salesItems: SalesItem[];
  onSave: () => void;
  saving: boolean;
}) {
  const [addItemId, setAddItemId] = useState('');

  const updateLine = (index: number, patch: Partial<EditLine>) => {
    const lines = edit.lines.map((line, i) => (i === index ? { ...line, ...patch } : line));
    setEdit({ ...edit, lines });
  };

  const removeLine = (index: number) => {
    setEdit({ ...edit, lines: edit.lines.filter((_, i) => i !== index) });
  };

  const addCatalogLine = () => {
    if (!addItemId) return;
    const item = salesItems.find(i => i._id === addItemId);
    if (!item || edit.lines.some(line => line.salesItemId === addItemId)) return;
    setEdit({
      ...edit,
      lines: [
        ...edit.lines,
        {
          salesItemId: item._id,
          name: item.name,
          pricingType: item.pricingType,
          unitPrice: item.unitPrice,
          quantity: '1',
          amount: String(item.pricingType === 'fixed' ? item.unitPrice || 0 : 0),
        },
      ],
    });
    setAddItemId('');
  };

  const addCustomLine = () => {
    setEdit({
      ...edit,
      lines: [...edit.lines, { name: '', pricingType: 'custom', quantity: '1', amount: '0' }],
    });
  };

  const editSubtotal = edit.lines.reduce((sum, line) => {
    if (line.pricingType === 'fixed') return sum + toNumber(line.quantity) * (line.unitPrice || 0);
    return sum + toNumber(line.amount) * toNumber(line.quantity);
  }, 0);
  const editDiscountAmount = edit.isCharge ? 0 : previewDiscountAmount(editSubtotal, edit.discountType, edit.discountValue);
  const editTotal = editSubtotal - editDiscountAmount;

  const mismatch = edit.isCharge && edit.paidAmount !== undefined && editTotal !== edit.paidAmount;

  return (
    <div className="mt-3 bg-gray-50 border border-gray-200 rounded-md p-3 space-y-3">
      {!edit.isCharge && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">支払い方法</label>
            <select
              value={edit.paymentMethod}
              onChange={(e) => setEdit({ ...edit, paymentMethod: e.target.value as PaymentMethod })}
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md"
            >
              <option value="cash">現金</option>
              <option value="payPay">PayPay</option>
              <option value="card">クレジット(手動)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">来店人数</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={displayStr(edit.visitorCount)}
              onChange={(e) => setEdit({ ...edit, visitorCount: sanitizeNonNegative(e.target.value) })}
              placeholder="0"
              className={numberInputClass}
            />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <label className="text-xs text-gray-500 shrink-0">割引</label>
            <select
              value={edit.discountType}
              onChange={(e) => setEdit({ ...edit, discountType: e.target.value as DiscountType | '' })}
              className="px-2 py-2 text-sm border border-gray-300 rounded-md"
            >
              <option value="">なし</option>
              <option value="amount">円</option>
              <option value="percent">%</option>
            </select>
            {edit.discountType && (
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={displayStr(edit.discountValue)}
                onChange={(e) => setEdit({ ...edit, discountValue: sanitizeNonNegative(e.target.value) })}
                placeholder={edit.discountType === 'amount' ? '円' : '%'}
                className="w-24 px-2 py-2 text-sm text-right text-blue-700 font-bold border border-gray-300 rounded-md"
              />
            )}
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">メモ</label>
            <input
              type="text"
              value={edit.notes}
              onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
              placeholder="メモ（任意）例: 常連さん割引"
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md"
            />
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {edit.lines.map((line, index) => (
          <li key={index} className="flex items-center gap-2">
            {line.pricingType === 'custom' && !line.salesItemId ? (
              <input
                type="text"
                value={line.name}
                onChange={(e) => updateLine(index, { name: e.target.value })}
                placeholder="商品名"
                className="flex-1 min-w-0 px-2 py-2 text-sm border border-gray-300 rounded-md"
              />
            ) : (
              <span className="flex-1 min-w-0 text-sm text-gray-900 truncate">{line.name}</span>
            )}
            {line.pricingType !== 'fixed' && (
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={displayStr(line.amount)}
                onChange={(e) => updateLine(index, { amount: sanitizeNonNegative(e.target.value) })}
                placeholder="単価"
                className="w-20 px-2 py-2 text-sm text-right text-blue-700 font-bold border border-gray-300 rounded-md"
              />
            )}
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={displayStr(line.quantity)}
              onChange={(e) => updateLine(index, { quantity: sanitizeNonNegative(e.target.value) })}
              placeholder="個数"
              className="w-14 px-1 py-2 text-sm text-center text-blue-700 font-bold border border-gray-300 rounded-md"
            />
            <button onClick={() => removeLine(index)} className="text-red-500 text-sm px-1">✕</button>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <select
          value={addItemId}
          onChange={(e) => setAddItemId(e.target.value)}
          className="flex-1 min-w-0 px-2 py-2 text-sm border border-gray-300 rounded-md"
        >
          <option value="">商品を追加...</option>
          {sortByNameJa(salesItems.filter(item => item.isActive)).map(item => (
            <option key={item._id} value={item._id}>
              {categoryLabels[item.category] || item.category}: {item.name}
            </option>
          ))}
        </select>
        <button onClick={addCatalogLine} className="text-sm px-3 py-2 border border-gray-300 rounded-md hover:bg-white">追加</button>
        <button onClick={addCustomLine} className="text-sm px-3 py-2 border border-gray-300 rounded-md hover:bg-white whitespace-nowrap">自由入力</button>
      </div>

      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">明細合計</span>
        <span>¥{editSubtotal.toLocaleString()}</span>
      </div>
      {editDiscountAmount > 0 && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">割引</span>
          <span>−¥{editDiscountAmount.toLocaleString()}</span>
        </div>
      )}
      <div className="flex justify-between items-center text-sm font-medium border-t pt-2">
        <span className="text-gray-700">合計</span>
        <span className="font-bold">¥{editTotal.toLocaleString()}</span>
      </div>
      {mismatch && (
        <p className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1.5">
          ⚠️ 明細合計が決済金額（¥{(edit.paidAmount || 0).toLocaleString()}）と一致していません。記録として保存はできますが、金額の変更（返金）はできません。
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 py-2.5 bg-moss-green text-white text-sm font-medium rounded-md hover:bg-moss-green/90 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
        <button
          onClick={() => setEdit(null)}
          className="px-4 py-2.5 text-sm border border-gray-300 rounded-md hover:bg-white"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

// ========== 過去の実績の一括入力（紙の記録の取り込み用） ==========

const emptyHistoricalItemState: HistoricalItemState = {
  cashQty: '0',
  payPayQty: '0',
  cardQty: '0',
  unitPrice: '0',
};

function HistoricalEntryPanel({
  salesItems,
  date,
  onDone,
  onEntryAdded,
  onCancel,
}: {
  salesItems: SalesItem[];
  date: string;
  onDone: (registeredDate: string) => void;
  onEntryAdded: (registeredDate: string) => void;
  onCancel: () => void;
}) {
  const [entryDate, setEntryDate] = useState(date);
  const [mode, setMode] = useState<'bulk' | 'single'>('bulk');

  return (
    <div className="border-2 border-moss-green rounded-lg p-3 space-y-3 bg-emerald-50/30">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900 text-sm">過去の実績を入力</h3>
        <button onClick={onCancel} className="text-xs text-gray-500 hover:underline">閉じる</button>
      </div>

      <div className="bg-white border rounded-md p-3">
        <label className="block text-xs text-gray-500 mb-1">登録する日付</label>
        <input
          type="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          className="block w-full min-w-0 max-w-full box-border appearance-none px-3 py-2 text-base border border-gray-300 rounded-md"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode('bulk')}
          className={`py-2 text-sm font-medium rounded-md border ${mode === 'bulk' ? 'bg-moss-green text-white border-moss-green' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
        >
          まとめて入力
        </button>
        <button
          onClick={() => setMode('single')}
          className={`py-2 text-sm font-medium rounded-md border ${mode === 'single' ? 'bg-moss-green text-white border-moss-green' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
        >
          一件ずつ入力
        </button>
      </div>

      {mode === 'bulk' ? (
        <HistoricalBulkEntry salesItems={salesItems} date={entryDate} onDone={onDone} />
      ) : (
        <HistoricalSingleEntry salesItems={salesItems} date={entryDate} onAdded={onEntryAdded} />
      )}
    </div>
  );
}

function HistoricalBulkEntry({
  salesItems,
  date,
  onDone,
}: {
  salesItems: SalesItem[];
  date: string;
  onDone: (registeredDate: string) => void;
}) {
  const [itemState, setItemState] = useState<Record<string, HistoricalItemState>>({});
  const [customRows, setCustomRows] = useState<HistoricalCustomRow[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType | ''>('');
  const [discountValue, setDiscountValue] = useState('0');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getState = (id: string): HistoricalItemState => itemState[id] || emptyHistoricalItemState;

  const updateItemState = (id: string, patch: Partial<HistoricalItemState>) => {
    setItemState(prev => ({ ...prev, [id]: { ...getState(id), ...patch } }));
  };

  const methodQtyValue = (state: HistoricalItemState, method: PaymentMethod): string => {
    if (method === 'cash') return state.cashQty;
    if (method === 'payPay') return state.payPayQty;
    return state.cardQty;
  };

  const setMethodQty = (item: SalesItem, method: PaymentMethod, value: string) => {
    const clean = sanitizeNonNegative(value);
    if (method === 'cash') updateItemState(item._id, { cashQty: clean });
    else if (method === 'payPay') updateItemState(item._id, { payPayQty: clean });
    else updateItemState(item._id, { cardQty: clean });
  };

  const methodAmount = (item: SalesItem, method: PaymentMethod): number => {
    const state = getState(item._id);
    const qty = toNumber(methodQtyValue(state, method));
    if (item.pricingType === 'fixed') return qty * (item.unitPrice || 0);
    return qty * toNumber(state.unitPrice);
  };

  const categoryTotal = useCallback((category: string) => {
    return salesItems
      .filter(item => item.category === category)
      .reduce((sum, item) => sum + methodAmount(item, 'cash') + methodAmount(item, 'payPay') + methodAmount(item, 'card'), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesItems, itemState]);

  const customRowsTotal = useMemo(() => {
    return customRows.reduce((sum, row) => sum + toNumber(row.unitPrice) * toNumber(row.quantity), 0);
  }, [customRows]);

  const subtotal = useMemo(() => {
    const catalogTotal = categoryOrder.reduce((sum, cat) => sum + categoryTotal(cat), 0);
    return catalogTotal + customRowsTotal;
  }, [categoryTotal, customRowsTotal]);

  const discountAmount = useMemo(
    () => previewDiscountAmount(subtotal, discountType, discountValue),
    [subtotal, discountType, discountValue]
  );
  const grandTotal = subtotal - discountAmount;

  const addCustomRow = () => {
    setCustomRows(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, name: '', unitPrice: '0', quantity: '1', paymentMethod: 'cash' }]);
  };

  const handleSubmit = async () => {
    const groups: Record<PaymentMethod, Array<{ salesItemId?: string; customName?: string; quantity: number; amount?: number }>> = {
      cash: [],
      payPay: [],
      card: [],
    };

    for (const item of salesItems) {
      const state = getState(item._id);
      (['cash', 'payPay', 'card'] as PaymentMethod[]).forEach(method => {
        const qty = toNumber(methodQtyValue(state, method));
        if (qty <= 0) return;
        groups[method].push({
          salesItemId: item._id,
          quantity: qty,
          amount: item.pricingType === 'variable' ? toNumber(state.unitPrice) : undefined,
        });
      });
    }
    for (const row of customRows) {
      const qty = toNumber(row.quantity);
      if (!row.name.trim() || qty <= 0 || toNumber(row.unitPrice) <= 0) continue;
      groups[row.paymentMethod].push({ customName: row.name.trim(), quantity: qty, amount: toNumber(row.unitPrice) });
    }

    const methodsWithItems = (['cash', 'payPay', 'card'] as PaymentMethod[]).filter(m => groups[m].length > 0);
    if (methodsWithItems.length === 0) {
      alert('少なくとも1つ、商品と数量を入力してください');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      alert('日付を指定してください');
      return;
    }

    setSubmitting(true);
    try {
      // 割引の按分（複数の支払い方法グループへの分割）はサーバー側で再計算するため、
      // ここでは各グループの明細と割引の入力値だけを渡す
      const response = await fetch('/api/admin/transactions/historical-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          groups: {
            cash: groups.cash,
            payPay: groups.payPay,
            card: groups.card,
          },
          discountType: discountType || undefined,
          discountValue: toNumber(discountValue),
          notes: notes.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '登録に失敗しました');
      }
      onDone(date);
    } catch (err) {
      alert(err instanceof Error ? err.message : '登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        紙の集計表の内容を、商品ごとに現金・PayPay・クレジットの内訳で入力してください。来店者数・購入組数は下の「来店・調整」欄に直接入力できます。
      </p>

      {categoryOrder.map(category => {
        const itemsInCategory = sortByNameJa(salesItems.filter(item => item.category === category && item.isActive));
        if (itemsInCategory.length === 0) return null;
        return (
          <details key={category} className="bg-white border rounded-md overflow-hidden" open>
            <summary className="px-3 py-2 bg-gray-50 font-medium text-sm cursor-pointer flex justify-between items-center">
              <span>{categoryLabels[category]}</span>
              <span className="text-moss-green font-bold">¥{categoryTotal(category).toLocaleString()}</span>
            </summary>
            <ul className="divide-y">
              {itemsInCategory.map(item => {
                const state = getState(item._id);
                const isFixed = item.pricingType === 'fixed';
                return (
                  <li key={item._id} className="px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      {isFixed && <p className="text-xs text-gray-500">単価 ¥{(item.unitPrice || 0).toLocaleString()}</p>}
                    </div>
                    {!isFixed && (
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={displayStr(state.unitPrice)}
                        onChange={(e) => updateItemState(item._id, { unitPrice: sanitizeNonNegative(e.target.value) })}
                        placeholder="単価"
                        className="w-24 mb-1 px-2 py-1.5 text-sm text-right text-blue-700 font-bold border border-gray-300 rounded-md"
                      />
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      {(['cash', 'payPay', 'card'] as PaymentMethod[]).map(method => (
                        <div key={method}>
                          <label className="block text-[10px] text-gray-500 mb-0.5">{methodLabels[method]}</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={displayStr(methodQtyValue(state, method))}
                            onChange={(e) => setMethodQty(item, method, e.target.value)}
                            placeholder="0"
                            className="w-full px-1 py-1.5 text-sm text-center text-blue-700 font-bold border border-gray-300 rounded-md"
                          />
                        </div>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}

      {salesItems.length === 0 && (
        <p className="text-sm text-gray-500">売上項目が登録されていません。</p>
      )}

      {/* カタログ外の商品 */}
      <div className="bg-white border rounded-md p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">その他（カタログにない商品）</h4>
          <button onClick={addCustomRow} className="text-xs px-3 py-1.5 bg-moss-green text-white rounded-md hover:bg-moss-green/90">
            + 追加
          </button>
        </div>
        <ul className="space-y-2">
          {customRows.map(row => (
            <li key={row.id} className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={row.name}
                onChange={(e) => setCustomRows(prev => prev.map(r => r.id === row.id ? { ...r, name: e.target.value } : r))}
                placeholder="商品名"
                className="flex-1 min-w-0 px-2 py-2 text-sm border border-gray-300 rounded-md"
              />
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={displayStr(row.unitPrice)}
                onChange={(e) => setCustomRows(prev => prev.map(r => r.id === row.id ? { ...r, unitPrice: sanitizeNonNegative(e.target.value) } : r))}
                placeholder="単価"
                className="w-20 px-2 py-2 text-sm text-right text-blue-700 font-bold border border-gray-300 rounded-md"
              />
              <span className="text-gray-400 text-xs">×</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={displayStr(row.quantity)}
                onChange={(e) => setCustomRows(prev => prev.map(r => r.id === row.id ? { ...r, quantity: sanitizeNonNegative(e.target.value) } : r))}
                placeholder="個数"
                className="w-14 px-1 py-2 text-sm text-center text-blue-700 font-bold border border-gray-300 rounded-md"
              />
              <select
                value={row.paymentMethod}
                onChange={(e) => setCustomRows(prev => prev.map(r => r.id === row.id ? { ...r, paymentMethod: e.target.value as PaymentMethod } : r))}
                className="px-1 py-2 text-sm border border-gray-300 rounded-md"
              >
                <option value="cash">現金</option>
                <option value="payPay">PayPay</option>
                <option value="card">クレジット</option>
              </select>
              <button onClick={() => setCustomRows(prev => prev.filter(r => r.id !== row.id))} className="text-red-500 text-sm px-2">✕</button>
            </li>
          ))}
        </ul>
      </div>

      {subtotal > 0 && (
        <div className="bg-white border rounded-md p-3 flex items-center gap-2">
          <label className="text-xs text-gray-500 shrink-0">割引</label>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as DiscountType | '')}
            className="px-2 py-2 text-sm border border-gray-300 rounded-md"
          >
            <option value="">なし</option>
            <option value="amount">円</option>
            <option value="percent">%</option>
          </select>
          {discountType && (
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={displayStr(discountValue)}
              onChange={(e) => setDiscountValue(sanitizeNonNegative(e.target.value))}
              placeholder={discountType === 'amount' ? '円' : '%'}
              className="w-24 px-2 py-2 text-sm text-right text-blue-700 font-bold border border-gray-300 rounded-md"
            />
          )}
        </div>
      )}

      {subtotal > 0 && (
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="メモ（任意）例: 常連さん割引"
          className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md"
        />
      )}

      <div className="border-t pt-3 space-y-1">
        <div className="flex justify-between text-sm text-gray-600">
          <span>小計</span>
          <span>¥{subtotal.toLocaleString()}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>割引</span>
            <span>−¥{discountAmount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">合計</span>
          <span className="text-xl font-bold text-gray-900">¥{grandTotal.toLocaleString()}</span>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 bg-moss-green text-white font-medium rounded-md hover:bg-moss-green/90 disabled:opacity-50"
      >
        {submitting ? '登録中...' : 'この内容で過去実績を登録'}
      </button>
    </div>
  );
}
