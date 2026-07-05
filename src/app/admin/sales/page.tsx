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

interface CustomItemRow {
  id: string;
  name: string;
  amount: string;
  paymentMethod: PaymentMethod;
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

const categoryLabels: Record<string, string> = {
  moss: 'コケ',
  product: '商品',
  figure: 'フィギュア',
  workshop: 'ワークショップ',
  gacha: 'ガチャ',
  other: 'その他',
};

const categoryOrder = ['moss', 'product', 'figure', 'workshop', 'gacha', 'other'];

// 数値入力欄の共通スタイル（何が入力されているか一目でわかるよう青太字にする）
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

// 0はスマホで入力しにくいので空欄表示にし、マイナスは入力させない
function displayStr(value: string): string {
  return value === '0' ? '' : value;
}

function sanitizeNonNegative(value: string): string {
  return value.replace(/-/g, '');
}

function sortByNameJa(items: SalesItem[]): SalesItem[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

function newCustomItemRow(): CustomItemRow {
  return { id: `${Date.now()}-${Math.random()}`, name: '', amount: '0', paymentMethod: 'cash' };
}

// 数量入力(fixed)なら単価×数量、金額直接入力(variable)ならその金額を返す（手入力分のみ、QR分は含まない）
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
  const [customItems, setCustomItems] = useState<CustomItemRow[]>([]);
  const [visitorCount, setVisitorCount] = useState('0');
  const [purchaseGroupCount, setPurchaseGroupCount] = useState('0');
  const [wordOfMouthDiscount, setWordOfMouthDiscount] = useState('0');
  const [adjustment, setAdjustment] = useState('0');
  const [notes, setNotes] = useState('');
  const [ecTotal, setEcTotal] = useState(0);
  const [qrChargeTotal, setQrChargeTotal] = useState(0);
  const [qrChargeItemTotals, setQrChargeItemTotals] = useState<Record<string, { quantity: number; amount: number }>>({});
  const [qrChargeCustomItems, setQrChargeCustomItems] = useState<Array<{ name: string; amount: number }>>([]);
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
      const dayData = dayRes.ok
        ? await dayRes.json()
        : { dailySales: null, ecTotal: 0, qrChargeTotal: 0, qrChargeItemTotals: {}, qrChargeCustomItems: [] };

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

      const existingCustomItems: Array<{ name: string; amount: number; paymentMethod: PaymentMethod }> =
        dayData.dailySales?.customLineItems || [];
      setCustomItems(existingCustomItems.map(ci => ({
        id: `${Date.now()}-${Math.random()}`,
        name: ci.name,
        amount: String(ci.amount ?? 0),
        paymentMethod: ci.paymentMethod || 'cash',
      })));

      const d = dayData.dailySales;
      setVisitorCount(String(d?.visitorCount ?? 0));
      setPurchaseGroupCount(String(d?.purchaseGroupCount ?? 0));
      setWordOfMouthDiscount(String(d?.wordOfMouthDiscount ?? 0));
      setAdjustment(String(d?.adjustment ?? 0));
      setNotes(d?.notes || '');
      setEcTotal(dayData.ecTotal || 0);
      setQrChargeTotal(dayData.qrChargeTotal || 0);
      setQrChargeItemTotals(dayData.qrChargeItemTotals || {});
      setQrChargeCustomItems(dayData.qrChargeCustomItems || []);
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

  const customItemsTotal = useMemo(() => {
    return customItems.reduce((sum, row) => sum + toNumber(row.amount), 0);
  }, [customItems]);

  const qrCustomItemsTotal = useMemo(() => {
    return qrChargeCustomItems.reduce((sum, ci) => sum + (ci.amount || 0), 0);
  }, [qrChargeCustomItems]);

  const itemsTotal = useMemo(() => {
    return categoryOrder.reduce((sum, cat) => sum + categorySubtotal(cat), 0) + customItemsTotal + qrCustomItemsTotal;
  }, [categorySubtotal, customItemsTotal, qrCustomItemsTotal]);

  const methodTotal = useCallback((method: PaymentMethod) => {
    const fromItems = salesItems.reduce((sum, item) => {
      const state = lineItemState[item._id] || emptyLineItemState;
      return sum + methodAmount(item, state, method);
    }, 0);
    const fromCustom = customItems
      .filter(row => row.paymentMethod === method)
      .reduce((sum, row) => sum + toNumber(row.amount), 0);
    return fromItems + fromCustom;
  }, [salesItems, lineItemState, customItems]);

  const cashTotal = useMemo(() => methodTotal('cash'), [methodTotal]);
  const payPayTotal = useMemo(() => methodTotal('payPay'), [methodTotal]);
  const cardManualTotal = useMemo(() => methodTotal('card'), [methodTotal]);
  const creditTotal = cardManualTotal + qrChargeTotal;

  // 店頭QR決済も店舗での支払い手段の一つのため、店舗入金合計に含める
  const paymentTotal = useMemo(() => {
    return cashTotal + payPayTotal + cardManualTotal + qrChargeTotal + toNumber(adjustment) - toNumber(wordOfMouthDiscount);
  }, [cashTotal, payPayTotal, cardManualTotal, qrChargeTotal, adjustment, wordOfMouthDiscount]);

  const grandTotal = paymentTotal + ecTotal;

  const updateLineItem = (id: string, field: keyof LineItemState, value: string) => {
    setLineItemState(prev => ({
      ...prev,
      [id]: { ...(prev[id] || emptyLineItemState), [field]: sanitizeNonNegative(value) },
    }));
  };

  const addCustomItem = () => setCustomItems(prev => [...prev, newCustomItemRow()]);
  const removeCustomItem = (id: string) => setCustomItems(prev => prev.filter(row => row.id !== id));
  const updateCustomItem = (id: string, field: 'name' | 'amount' | 'paymentMethod', value: string) => {
    const clean = field === 'amount' ? sanitizeNonNegative(value) : value;
    setCustomItems(prev => prev.map(row => row.id === id ? { ...row, [field]: clean } : row));
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

      const customLineItems = customItems
        .filter(row => row.name.trim() && toNumber(row.amount) > 0)
        .map(row => ({ name: row.name.trim(), amount: toNumber(row.amount), paymentMethod: row.paymentMethod }));

      const response = await fetch(`/api/admin/sales/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorCount: toNumber(visitorCount),
          purchaseGroupCount: toNumber(purchaseGroupCount),
          lineItems,
          customLineItems,
          wordOfMouthDiscount: toNumber(wordOfMouthDiscount),
          adjustment: toNumber(adjustment),
          notes,
        }),
      });
      if (!response.ok) throw new Error('保存に失敗しました');

      alert('保存しました');
      // サーバー側で再計算された確定値を取り直す（GETの射影に合わせて取得し直すのが確実なため）
      await loadDay(date);
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
                min="0"
                value={displayStr(visitorCount)}
                onChange={(e) => setVisitorCount(sanitizeNonNegative(e.target.value))}
                placeholder="0"
                className={numberInputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">購入組数</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={displayStr(purchaseGroupCount)}
                onChange={(e) => setPurchaseGroupCount(sanitizeNonNegative(e.target.value))}
                placeholder="0"
                className={numberInputClass}
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            商品ごとに現金・PayPay・クレジットの内訳を入力してください。クレジット欄の下に、QR決済（{'/admin/sales/charge'}で発行したもの）の自動集計分を表示しています。QR以外のカード決済があれば、クレジット欄にその分だけ追加で入力してください。
          </div>

          {categoryOrder.map(category => {
            const itemsInCategory = sortByNameJa(salesItems.filter(item => item.category === category && item.isActive));
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
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">現金</label>
                            {isFixed ? (
                              <input
                                type="number" inputMode="numeric" min="0"
                                value={displayStr(state.cashQuantity)}
                                onChange={(e) => updateLineItem(item._id, 'cashQuantity', e.target.value)}
                                placeholder="0"
                                className={numberInputClass}
                              />
                            ) : (
                              <input
                                type="number" inputMode="numeric" min="0"
                                value={displayStr(state.cashAmount)}
                                onChange={(e) => updateLineItem(item._id, 'cashAmount', e.target.value)}
                                placeholder="金額"
                                className={numberInputClass}
                              />
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">PayPay</label>
                            {isFixed ? (
                              <input
                                type="number" inputMode="numeric" min="0"
                                value={displayStr(state.payPayQuantity)}
                                onChange={(e) => updateLineItem(item._id, 'payPayQuantity', e.target.value)}
                                placeholder="0"
                                className={numberInputClass}
                              />
                            ) : (
                              <input
                                type="number" inputMode="numeric" min="0"
                                value={displayStr(state.payPayAmount)}
                                onChange={(e) => updateLineItem(item._id, 'payPayAmount', e.target.value)}
                                placeholder="金額"
                                className={numberInputClass}
                              />
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">クレジット</label>
                            {isFixed ? (
                              <input
                                type="number" inputMode="numeric" min="0"
                                value={displayStr(state.cardQuantity)}
                                onChange={(e) => updateLineItem(item._id, 'cardQuantity', e.target.value)}
                                placeholder="0"
                                className={numberInputClass}
                              />
                            ) : (
                              <input
                                type="number" inputMode="numeric" min="0"
                                value={displayStr(state.cardAmount)}
                                onChange={(e) => updateLineItem(item._id, 'cardAmount', e.target.value)}
                                placeholder="金額"
                                className={numberInputClass}
                              />
                            )}
                            {qrAuto && qrAuto.amount > 0 && (
                              <p className="text-[10px] text-emerald-600 mt-0.5 whitespace-nowrap">
                                +QR {qrAuto.quantity ? `${qrAuto.quantity}個 ` : ''}¥{qrAuto.amount.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
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

          {/* 都度入力の商品（カタログにない単発商品） */}
          <div className="bg-white shadow rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-gray-900">その他（普段売っていない商品）</h2>
              <button onClick={addCustomItem} className="text-sm px-3 py-1.5 bg-moss-green text-white rounded-md hover:bg-moss-green/90">
                + 追加
              </button>
            </div>
            {customItems.length === 0 && (
              <p className="text-xs text-gray-500">単発で販売した、カタログにない商品があれば追加してください。</p>
            )}
            <ul className="space-y-2">
              {customItems.map(row => (
                <li key={row.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateCustomItem(row.id, 'name', e.target.value)}
                    placeholder="商品名"
                    className="flex-1 min-w-0 px-2 py-2 text-sm border border-gray-300 rounded-md"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={displayStr(row.amount)}
                    onChange={(e) => updateCustomItem(row.id, 'amount', e.target.value)}
                    placeholder="金額"
                    className="w-20 px-2 py-2 text-sm text-right text-blue-700 font-bold border border-gray-300 rounded-md"
                  />
                  <select
                    value={row.paymentMethod}
                    onChange={(e) => updateCustomItem(row.id, 'paymentMethod', e.target.value)}
                    className="px-1 py-2 text-sm border border-gray-300 rounded-md"
                  >
                    <option value="cash">現金</option>
                    <option value="payPay">PayPay</option>
                    <option value="card">クレジット</option>
                  </select>
                  <button onClick={() => removeCustomItem(row.id)} className="text-red-500 text-sm px-2">✕</button>
                </li>
              ))}
            </ul>
            {qrChargeCustomItems.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500 mb-1">QR決済で販売されたカタログ外の商品（自動集計・入力不要）</p>
                <ul className="text-xs text-emerald-600 space-y-0.5">
                  {qrChargeCustomItems.map((ci, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>{ci.name}</span>
                      <span>¥{ci.amount.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 調整項目 */}
          <div className="bg-white shadow rounded-lg p-4 space-y-3">
            <h2 className="font-medium text-gray-900">調整</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">調整（マイナス可）</label>
                <input
                  type="number" inputMode="numeric"
                  value={displayStr(adjustment)}
                  onChange={(e) => setAdjustment(e.target.value)}
                  placeholder="0"
                  className={numberInputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">口コミ割引</label>
                <input
                  type="number" inputMode="numeric" min="0"
                  value={displayStr(wordOfMouthDiscount)}
                  onChange={(e) => setWordOfMouthDiscount(sanitizeNonNegative(e.target.value))}
                  placeholder="0"
                  className={numberInputClass}
                />
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
              <span className="text-gray-600">クレジット（QR決済分含む）</span>
              <span>¥{creditTotal.toLocaleString()}</span>
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
