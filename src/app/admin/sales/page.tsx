'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

interface SalesItem {
  _id: string;
  category: string;
  name: string;
  pricingType: 'fixed' | 'variable';
  unitPrice?: number;
  sortOrder: number;
  isActive: boolean;
}

interface LineItemState {
  cashQuantity: string;
  cashAmount: string;
  payPayQuantity: string;
  payPayAmount: string;
  cardQuantity: string;
  cardAmount: string;
}

type PaymentMethod = 'cash' | 'payPay' | 'card';

const emptyLineItemState: LineItemState = {
  cashQuantity: '0',
  cashAmount: '0',
  payPayQuantity: '0',
  payPayAmount: '0',
  cardQuantity: '0',
  cardAmount: '0',
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: '現金',
  payPay: 'PayPay',
  card: 'クレジット',
};

const categoryLabels: Record<string, string> = {
  moss: 'コケ',
  product: '商品',
  figure: 'フィギュア',
  workshop: 'ワークショップ',
  gacha: 'ガチャ',
  other: 'その他',
};

const categoryOrder = ['moss', 'product', 'figure', 'workshop', 'gacha', 'other'];

function todayJstString(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// 数量入力(fixed)なら単価×数量、金額直接入力(variable)ならその金額を返す
function methodAmount(item: SalesItem, state: LineItemState, method: PaymentMethod): number {
  if (item.pricingType === 'fixed') {
    const qty = method === 'cash' ? state.cashQuantity : method === 'payPay' ? state.payPayQuantity : state.cardQuantity;
    return toNumber(qty) * (item.unitPrice || 0);
  }
  const amt = method === 'cash' ? state.cashAmount : method === 'payPay' ? state.payPayAmount : state.cardAmount;
  return toNumber(amt);
}

export default function SalesPage() {
  const [date, setDate] = useState(todayJstString());
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [lineItemState, setLineItemState] = useState<Record<string, LineItemState>>({});
  const [visitorCount, setVisitorCount] = useState('0');
  const [purchaseGroupCount, setPurchaseGroupCount] = useState('0');
  const [wordOfMouthDiscount, setWordOfMouthDiscount] = useState('0');
  const [adjustment, setAdjustment] = useState('0');
  const [notes, setNotes] = useState('');
  const [ecTotal, setEcTotal] = useState(0);
  const [qrChargeTotal, setQrChargeTotal] = useState(0);
  const [qrChargeItemTotals, setQrChargeItemTotals] = useState<Record<string, { quantity: number; amount: number }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadDay = useCallback(async (targetDate: string) => {
    setLoading(true);
    try {
      const [itemsRes, dayRes] = await Promise.all([
        fetch('/api/admin/sales-items'),
        fetch(`/api/admin/sales/${targetDate}`),
      ]);
      const itemsData = itemsRes.ok ? await itemsRes.json() : { items: [] };
      const dayData = dayRes.ok ? await dayRes.json() : { dailySales: null, ecTotal: 0, qrChargeTotal: 0, qrChargeItemTotals: {} };

      const items: SalesItem[] = itemsData.items || [];
      setSalesItems(items);

      const existingLineItems: Array<{
        salesItemId: string;
        cashQuantity?: number; cashAmount?: number;
        payPayQuantity?: number; payPayAmount?: number;
        cardQuantity?: number; cardAmount?: number;
      }> = dayData.dailySales?.lineItems || [];
      const byId = new Map(existingLineItems.map(li => [li.salesItemId, li]));

      const nextState: Record<string, LineItemState> = {};
      for (const item of items) {
        const existing = byId.get(item._id);
        nextState[item._id] = {
          cashQuantity: String(existing?.cashQuantity ?? 0),
          cashAmount: String(existing?.cashAmount ?? 0),
          payPayQuantity: String(existing?.payPayQuantity ?? 0),
          payPayAmount: String(existing?.payPayAmount ?? 0),
          cardQuantity: String(existing?.cardQuantity ?? 0),
          cardAmount: String(existing?.cardAmount ?? 0),
        };
      }
      setLineItemState(nextState);

      const d = dayData.dailySales;
      setVisitorCount(String(d?.visitorCount ?? 0));
      setPurchaseGroupCount(String(d?.purchaseGroupCount ?? 0));
      setWordOfMouthDiscount(String(d?.wordOfMouthDiscount ?? 0));
      setAdjustment(String(d?.adjustment ?? 0));
      setNotes(d?.notes || '');
      setEcTotal(dayData.ecTotal || 0);
      setQrChargeTotal(dayData.qrChargeTotal || 0);
      setQrChargeItemTotals(dayData.qrChargeItemTotals || {});
    } catch (err) {
      console.error('売上データ取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDay(date);
  }, [date, loadDay]);

  const itemTotal = useCallback((item: SalesItem) => {
    const state = lineItemState[item._id] || emptyLineItemState;
    const manual = methodAmount(item, state, 'cash') + methodAmount(item, state, 'payPay') + methodAmount(item, state, 'card');
    return manual + (qrChargeItemTotals[item._id]?.amount || 0);
  }, [lineItemState, qrChargeItemTotals]);

  const categorySubtotal = useCallback((category: string) => {
    return salesItems
      .filter(item => item.category === category)
      .reduce((sum, item) => sum + itemTotal(item), 0);
  }, [salesItems, itemTotal]);

  const itemsTotal = useMemo(() => {
    return categoryOrder.reduce((sum, cat) => sum + categorySubtotal(cat), 0);
  }, [categorySubtotal]);

  const methodTotal = useCallback((method: PaymentMethod) => {
    return salesItems.reduce((sum, item) => {
      const state = lineItemState[item._id] || emptyLineItemState;
      return sum + methodAmount(item, state, method);
    }, 0);
  }, [salesItems, lineItemState]);

  const cashTotal = useMemo(() => methodTotal('cash'), [methodTotal]);
  const payPayTotal = useMemo(() => methodTotal('payPay'), [methodTotal]);
  const cardManualTotal = useMemo(() => methodTotal('card'), [methodTotal]);

  // 店頭QR決済も店舗での支払い手段の一つのため、店舗入金合計に含める
  const paymentTotal = useMemo(() => {
    return cashTotal + payPayTotal + cardManualTotal + qrChargeTotal + toNumber(adjustment) - toNumber(wordOfMouthDiscount);
  }, [cashTotal, payPayTotal, cardManualTotal, qrChargeTotal, adjustment, wordOfMouthDiscount]);

  const grandTotal = paymentTotal + ecTotal;

  const updateLineItem = (id: string, field: keyof LineItemState, value: string) => {
    setLineItemState(prev => ({
      ...prev,
      [id]: { ...(prev[id] || emptyLineItemState), [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const lineItems = salesItems.map(item => {
        const state = lineItemState[item._id] || emptyLineItemState;
        const isFixed = item.pricingType === 'fixed';
        return {
          salesItemId: item._id,
          cashQuantity: isFixed ? toNumber(state.cashQuantity) : undefined,
          cashAmount: isFixed ? undefined : toNumber(state.cashAmount),
          payPayQuantity: isFixed ? toNumber(state.payPayQuantity) : undefined,
          payPayAmount: isFixed ? undefined : toNumber(state.payPayAmount),
          cardQuantity: isFixed ? toNumber(state.cardQuantity) : undefined,
          cardAmount: isFixed ? undefined : toNumber(state.cardAmount),
        };
      });

      const response = await fetch(`/api/admin/sales/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorCount: toNumber(visitorCount),
          purchaseGroupCount: toNumber(purchaseGroupCount),
          lineItems,
          wordOfMouthDiscount: toNumber(wordOfMouthDiscount),
          adjustment: toNumber(adjustment),
          notes,
        }),
      });
      if (!response.ok) throw new Error('保存に失敗しました');
      alert('保存しました');
      loadDay(date);
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">売上管理</h1>
          <p className="text-gray-600 mt-1">その日の店舗売上を入力・確認します</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/admin/sales/charge" className="px-3 py-2 bg-moss-green text-white rounded-md hover:bg-moss-green/90">
            QR決済を発行
          </Link>
          <Link href="/admin/sales/items" className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            項目カタログ
          </Link>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <label className="block text-sm text-gray-600 mb-1">日付</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-3 text-lg border border-gray-300 rounded-md"
        />
      </div>

      {loading ? (
        <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
      ) : (
        <>
          <div className="bg-white shadow rounded-lg p-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">来店者数</label>
              <input
                type="number"
                inputMode="numeric"
                value={visitorCount}
                onChange={(e) => setVisitorCount(e.target.value)}
                className="w-full px-3 py-3 text-lg border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">購入組数</label>
              <input
                type="number"
                inputMode="numeric"
                value={purchaseGroupCount}
                onChange={(e) => setPurchaseGroupCount(e.target.value)}
                className="w-full px-3 py-3 text-lg border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            商品ごとに現金・PayPay・クレジット（手入力）の内訳を入力してください。クレジットのQR決済分（{'/admin/sales/charge'}で発行したもの）は自動で反映されるので入力不要です。
          </div>

          {categoryOrder.map(category => {
            const itemsInCategory = salesItems.filter(item => item.category === category && item.isActive);
            if (itemsInCategory.length === 0) return null;

            return (
              <details key={category} className="bg-white shadow rounded-lg overflow-hidden" open>
                <summary className="px-4 py-3 bg-gray-50 font-medium text-gray-900 cursor-pointer flex justify-between items-center">
                  <span>{categoryLabels[category]}</span>
                  <span className="text-sm text-gray-500">小計 ¥{categorySubtotal(category).toLocaleString()}</span>
                </summary>
                <ul className="divide-y">
                  {itemsInCategory.map(item => {
                    const state = lineItemState[item._id] || emptyLineItemState;
                    const isFixed = item.pricingType === 'fixed';
                    const qrAuto = qrChargeItemTotals[item._id];
                    return (
                      <li key={item._id} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          {isFixed && (
                            <p className="text-xs text-gray-500 whitespace-nowrap">単価 ¥{(item.unitPrice || 0).toLocaleString()}</p>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {(['cash', 'payPay', 'card'] as PaymentMethod[]).map(method => {
                            const qtyField = method === 'cash' ? 'cashQuantity' : method === 'payPay' ? 'payPayQuantity' : 'cardQuantity';
                            const amtField = method === 'cash' ? 'cashAmount' : method === 'payPay' ? 'payPayAmount' : 'cardAmount';
                            return (
                              <div key={method}>
                                <label className="block text-[10px] text-gray-500 mb-0.5">{paymentMethodLabels[method]}</label>
                                {isFixed ? (
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    value={state[qtyField]}
                                    onChange={(e) => updateLineItem(item._id, qtyField, e.target.value)}
                                    className="w-full px-1 py-2 text-sm text-right border border-gray-300 rounded-md"
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    value={state[amtField]}
                                    onChange={(e) => updateLineItem(item._id, amtField, e.target.value)}
                                    placeholder="金額"
                                    className="w-full px-1 py-2 text-sm text-right border border-gray-300 rounded-md"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {qrAuto && qrAuto.amount > 0 && (
                          <p className="text-[10px] text-emerald-600 mt-1">
                            QR自動集計: {qrAuto.quantity ? `${qrAuto.quantity}個 ` : ''}¥{qrAuto.amount.toLocaleString()}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}

          {salesItems.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              売上項目が登録されていません。<Link href="/admin/sales/items" className="underline">項目カタログ</Link>から初期データを投入してください。
            </div>
          )}

          {/* 調整項目 */}
          <div className="bg-white shadow rounded-lg p-4 space-y-3">
            <h2 className="font-medium text-gray-900">調整</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">調整</label>
                <input type="number" inputMode="numeric" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} className="w-full px-3 py-3 text-lg border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">口コミ割引</label>
                <input type="number" inputMode="numeric" value={wordOfMouthDiscount} onChange={(e) => setWordOfMouthDiscount(e.target.value)} className="w-full px-3 py-3 text-lg border border-gray-300 rounded-md" />
              </div>
            </div>
          </div>

          {/* 備考 */}
          <div className="bg-white shadow rounded-lg p-4">
            <label className="block text-sm text-gray-600 mb-1">備考</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {/* 集計サマリー */}
          <div className="bg-white shadow rounded-lg p-4 space-y-2">
            <h2 className="font-medium text-gray-900 mb-2">集計（すべて商品明細から自動計算）</h2>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">現金</span>
              <span>¥{cashTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">PayPay</span>
              <span>¥{payPayTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">クレジット（手入力分）</span>
              <span>¥{cardManualTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">クレジット（QR決済・自動集計）</span>
              <span>¥{qrChargeTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-medium border-t pt-2">
              <span className="text-gray-700">店舗売上合計（商品明細）</span>
              <span>¥{itemsTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">EC（オンライン）売上（自動集計）</span>
              <span>¥{ecTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>その日の総売上</span>
              <span>¥{grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-moss-green text-white text-lg font-medium rounded-md hover:bg-moss-green/90 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </>
      )}
    </div>
  );
}
