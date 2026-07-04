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
  quantity: string;
  amount: string;
}

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

export default function SalesPage() {
  const [date, setDate] = useState(todayJstString());
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [lineItemState, setLineItemState] = useState<Record<string, LineItemState>>({});
  const [visitorCount, setVisitorCount] = useState('0');
  const [purchaseGroupCount, setPurchaseGroupCount] = useState('0');
  const [cashAmount, setCashAmount] = useState('0');
  const [payPayAmount, setPayPayAmount] = useState('0');
  const [manualCardAmount, setManualCardAmount] = useState('0');
  const [wordOfMouthDiscount, setWordOfMouthDiscount] = useState('0');
  const [adjustment, setAdjustment] = useState('0');
  const [notes, setNotes] = useState('');
  const [ecTotal, setEcTotal] = useState(0);
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
      const dayData = dayRes.ok ? await dayRes.json() : { dailySales: null, ecTotal: 0 };

      const items: SalesItem[] = itemsData.items || [];
      setSalesItems(items);

      const existingLineItems: Array<{ salesItemId: string; quantity?: number; amount?: number }> =
        dayData.dailySales?.lineItems || [];
      const byId = new Map(existingLineItems.map(li => [li.salesItemId, li]));

      const nextState: Record<string, LineItemState> = {};
      for (const item of items) {
        const existing = byId.get(item._id);
        nextState[item._id] = {
          quantity: String(existing?.quantity ?? 0),
          amount: String(existing?.amount ?? 0),
        };
      }
      setLineItemState(nextState);

      const d = dayData.dailySales;
      setVisitorCount(String(d?.visitorCount ?? 0));
      setPurchaseGroupCount(String(d?.purchaseGroupCount ?? 0));
      setCashAmount(String(d?.cashAmount ?? 0));
      setPayPayAmount(String(d?.payPayAmount ?? 0));
      setManualCardAmount(String(d?.manualCardAmount ?? 0));
      setWordOfMouthDiscount(String(d?.wordOfMouthDiscount ?? 0));
      setAdjustment(String(d?.adjustment ?? 0));
      setNotes(d?.notes || '');
      setEcTotal(dayData.ecTotal || 0);
    } catch (err) {
      console.error('売上データ取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDay(date);
  }, [date, loadDay]);

  const categorySubtotal = useCallback((category: string) => {
    return salesItems
      .filter(item => item.category === category)
      .reduce((sum, item) => {
        const state = lineItemState[item._id];
        if (!state) return sum;
        if (item.pricingType === 'fixed') {
          return sum + toNumber(state.quantity) * (item.unitPrice || 0);
        }
        return sum + toNumber(state.amount);
      }, 0);
  }, [salesItems, lineItemState]);

  const itemsTotal = useMemo(() => {
    return categoryOrder.reduce((sum, cat) => sum + categorySubtotal(cat), 0);
  }, [categorySubtotal]);

  const paymentTotal = useMemo(() => {
    return (
      toNumber(cashAmount) +
      toNumber(payPayAmount) +
      toNumber(manualCardAmount) +
      toNumber(adjustment) -
      toNumber(wordOfMouthDiscount)
    );
  }, [cashAmount, payPayAmount, manualCardAmount, adjustment, wordOfMouthDiscount]);

  const discrepancy = itemsTotal - paymentTotal;
  const grandTotal = paymentTotal + ecTotal;

  const updateLineItem = (id: string, field: 'quantity' | 'amount', value: string) => {
    setLineItemState(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const lineItems = salesItems.map(item => {
        const state = lineItemState[item._id] || { quantity: '0', amount: '0' };
        return {
          salesItemId: item._id,
          quantity: item.pricingType === 'fixed' ? toNumber(state.quantity) : undefined,
          amount: item.pricingType === 'variable' ? toNumber(state.amount) : undefined,
        };
      });

      const response = await fetch(`/api/admin/sales/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorCount: toNumber(visitorCount),
          purchaseGroupCount: toNumber(purchaseGroupCount),
          lineItems,
          cashAmount: toNumber(cashAmount),
          payPayAmount: toNumber(payPayAmount),
          manualCardAmount: toNumber(manualCardAmount),
          wordOfMouthDiscount: toNumber(wordOfMouthDiscount),
          adjustment: toNumber(adjustment),
          notes,
        }),
      });
      if (!response.ok) throw new Error('保存に失敗しました');
      alert('保存しました');
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
                    const state = lineItemState[item._id] || { quantity: '0', amount: '0' };
                    return (
                      <li key={item._id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          {item.pricingType === 'fixed' && (
                            <p className="text-xs text-gray-500">単価 ¥{(item.unitPrice || 0).toLocaleString()}</p>
                          )}
                        </div>
                        {item.pricingType === 'fixed' ? (
                          <input
                            type="number"
                            inputMode="numeric"
                            value={state.quantity}
                            onChange={(e) => updateLineItem(item._id, 'quantity', e.target.value)}
                            className="w-20 px-2 py-2 text-lg text-right border border-gray-300 rounded-md"
                          />
                        ) : (
                          <input
                            type="number"
                            inputMode="numeric"
                            value={state.amount}
                            onChange={(e) => updateLineItem(item._id, 'amount', e.target.value)}
                            placeholder="金額"
                            className="w-28 px-2 py-2 text-lg text-right border border-gray-300 rounded-md"
                          />
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

          {/* 入金内訳 */}
          <div className="bg-white shadow rounded-lg p-4 space-y-3">
            <h2 className="font-medium text-gray-900">入金内訳</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">現金</label>
                <input type="number" inputMode="numeric" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} className="w-full px-3 py-3 text-lg border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">PayPay</label>
                <input type="number" inputMode="numeric" value={payPayAmount} onChange={(e) => setPayPayAmount(e.target.value)} className="w-full px-3 py-3 text-lg border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">クレジットカード（手入力）</label>
                <input type="number" inputMode="numeric" value={manualCardAmount} onChange={(e) => setManualCardAmount(e.target.value)} className="w-full px-3 py-3 text-lg border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">調整</label>
                <input type="number" inputMode="numeric" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} className="w-full px-3 py-3 text-lg border border-gray-300 rounded-md" />
              </div>
              <div className="col-span-2">
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
            <h2 className="font-medium text-gray-900 mb-2">集計</h2>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">店舗売上（商品明細の合計）</span>
              <span>¥{itemsTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">店舗入金合計（現金+PayPay+カード+調整-割引）</span>
              <span>¥{paymentTotal.toLocaleString()}</span>
            </div>
            {discrepancy !== 0 && (
              <div className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                ⚠️ 明細合計と入金合計が¥{Math.abs(discrepancy).toLocaleString()}ズレています。入力を確認してください。
              </div>
            )}
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
