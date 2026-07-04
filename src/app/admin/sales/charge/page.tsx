'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

interface ChargeLineItem {
  name: string;
  quantity?: number;
  amount?: number;
}

interface Charge {
  _id: string;
  amount: number;
  description?: string;
  status: 'pending' | 'paid' | 'cancelled';
  lineItems?: ChargeLineItem[];
  qrCodeDataUrl?: string;
  paymentUrl?: string;
  receiptUrl?: string;
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

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function InStoreChargePage() {
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [lineItemState, setLineItemState] = useState<Record<string, LineItemState>>({});
  const [description, setDescription] = useState('');
  const [loadingItems, setLoadingItems] = useState(true);
  const [creating, setCreating] = useState(false);
  const [charge, setCharge] = useState<Charge | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      setLoadingItems(true);
      try {
        const response = await fetch('/api/admin/sales-items');
        const data = response.ok ? await response.json() : { items: [] };
        const items: SalesItem[] = data.items || [];
        setSalesItems(items);
        const nextState: Record<string, LineItemState> = {};
        for (const item of items) {
          nextState[item._id] = { quantity: '0', amount: '0' };
        }
        setLineItemState(nextState);
      } catch (err) {
        console.error('売上項目取得エラー:', err);
      } finally {
        setLoadingItems(false);
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

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

  const total = useMemo(() => {
    return categoryOrder.reduce((sum, cat) => sum + categorySubtotal(cat), 0);
  }, [categorySubtotal]);

  const updateLineItem = (id: string, field: 'quantity' | 'amount', value: string) => {
    setLineItemState(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleCreate = async () => {
    if (total <= 0) {
      alert('数量または金額を1つ以上入力してください');
      return;
    }

    setCreating(true);
    try {
      const lineItems = salesItems
        .map(item => {
          const state = lineItemState[item._id] || { quantity: '0', amount: '0' };
          return {
            salesItemId: item._id,
            quantity: item.pricingType === 'fixed' ? toNumber(state.quantity) : undefined,
            amount: item.pricingType === 'variable' ? toNumber(state.amount) : undefined,
          };
        })
        .filter(item => (item.quantity || 0) > 0 || (item.amount || 0) > 0);

      const response = await fetch('/api/admin/in-store-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItems, description }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '決済リンクの発行に失敗しました');
      }
      const data = await response.json();
      const newCharge: Charge = {
        _id: data.charge._id,
        amount: data.charge.amount,
        description: data.charge.description,
        status: 'pending',
        lineItems: data.charge.lineItems,
        qrCodeDataUrl: data.qrCodeDataUrl,
        paymentUrl: data.paymentUrl,
        receiptUrl: data.receiptUrl,
      };
      setCharge(newCharge);
      startPolling(newCharge._id);
    } catch (err) {
      alert(err instanceof Error ? err.message : '決済リンクの発行に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const startPolling = (id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/in-store-charge/${id}`);
        if (!response.ok) return;
        const data = await response.json();
        if (data.charge.status !== 'pending') {
          setCharge(prev => prev ? { ...prev, status: data.charge.status } : prev);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // ポーリング中の一時的なエラーは無視して次回に再試行する
      }
    }, 3000);
  };

  const handleReset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setCharge(null);
    setDescription('');
    setLineItemState(prev => {
      const next: Record<string, LineItemState> = {};
      for (const id of Object.keys(prev)) {
        next[id] = { quantity: '0', amount: '0' };
      }
      return next;
    });
  };

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <Link href="/admin/sales" className="text-moss-green hover:underline text-sm font-medium">
          ← 売上管理に戻る
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">店頭QRコード決済</h1>
        <p className="text-gray-600 mt-1">
          商品を選んでQRコードを発行し、お客様のスマホで読み取ってお支払いいただきます。
        </p>
      </div>

      {!charge && (
        <>
          {loadingItems ? (
            <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
          ) : (
            <>
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

              <div className="bg-white shadow rounded-lg p-4">
                <label className="block text-sm text-gray-600 mb-1">備考（任意）</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="例: 常連のお客様"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div className="bg-white shadow rounded-lg p-4 flex justify-between items-center">
                <span className="font-medium text-gray-900">合計金額</span>
                <span className="text-2xl font-bold text-gray-900">¥{total.toLocaleString()}</span>
              </div>

              <button
                onClick={handleCreate}
                disabled={creating || total <= 0}
                className="w-full py-4 bg-moss-green text-white text-lg font-medium rounded-md hover:bg-moss-green/90 disabled:opacity-50"
              >
                {creating ? '発行中...' : 'QRコードを発行'}
              </button>
            </>
          )}
        </>
      )}

      {charge && (
        <div className="bg-white shadow rounded-lg p-6 text-center space-y-4">
          <p className="text-3xl font-bold text-gray-900">¥{charge.amount.toLocaleString()}</p>
          {charge.description && <p className="text-gray-600">{charge.description}</p>}

          {charge.lineItems && charge.lineItems.length > 0 && (
            <ul className="text-left text-sm text-gray-600 divide-y border rounded-md">
              {charge.lineItems.map((li, idx) => (
                <li key={idx} className="px-3 py-2 flex justify-between">
                  <span>{li.name}{li.quantity ? ` × ${li.quantity}` : ''}</span>
                  <span>¥{(li.amount || 0).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}

          {charge.status === 'pending' && (
            <>
              {charge.qrCodeDataUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={charge.qrCodeDataUrl} alt="決済用QRコード" className="mx-auto w-64 h-64" />
              )}
              <p className="text-sm text-gray-500">お客様のスマホでQRコードを読み取ってお支払いください</p>
              <p className="text-sm text-moss-green animate-pulse">支払い待ち...</p>
            </>
          )}

          {charge.status === 'paid' && (
            <div className="space-y-2">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">✓</span>
              </div>
              <p className="text-emerald-600 font-medium">支払いが完了しました</p>
            </div>
          )}

          {charge.status === 'cancelled' && (
            <p className="text-red-600 font-medium">支払いがキャンセル・失敗しました</p>
          )}

          <button
            onClick={handleReset}
            className="w-full py-3 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {charge.status === 'pending' ? '取り消して新しく発行' : '新しい決済を発行'}
          </button>
        </div>
      )}
    </div>
  );
}
