'use client';

import { useState, useEffect, useCallback } from 'react';

type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
type InventoryOperation = 'reserve' | 'release' | 'purchase' | 'restock' | 'adjustment';

interface InventoryProductResponse {
  _id: string;
  name: string;
  category?: string;
  price: number;
  stockQuantity?: number;
  reserved?: number;
  lowStockThreshold?: number;
}

interface InventoryLogResponse {
  _id: string;
  productId: string;
  quantityChange: number;
  operation: InventoryOperation;
  reason?: string;
  timestamp: string;
  user?: string;
  previousStock?: number;
  newStock?: number;
}

interface InventoryApiResponse {
  products: InventoryProductResponse[];
  logs: InventoryLogResponse[];
  error?: string;
}

interface InventoryItem {
  id: string;
  productName: string;
  category: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minStock: number;
  status: InventoryStatus;
}

const getStockStatus = (available: number, min: number): InventoryStatus => {
  if (available === 0) return 'out_of_stock';
  if (available <= min) return 'low_stock';
  return 'in_stock';
};

const operationConfig: Record<InventoryOperation, { label: string; color: string; icon: string }> = {
  reserve: { label: '予約', color: 'text-yellow-600', icon: '📋' },
  release: { label: '予約解放', color: 'text-sky-600', icon: '↩️' },
  purchase: { label: '購入確定', color: 'text-blue-600', icon: '💰' },
  restock: { label: '補充', color: 'text-green-600', icon: '📦' },
  adjustment: { label: '手動調整', color: 'text-gray-600', icon: '⚙️' },
};

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | InventoryStatus>('all');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const [savingItem, setSavingItem] = useState<string | null>(null);

  const fetchInventoryData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/inventory', { cache: 'no-store' });
      const data = (await response.json().catch(() => ({}))) as Partial<InventoryApiResponse>;
      if (!response.ok) {
        throw new Error(data.error || '在庫データの取得に失敗しました');
      }

      const items = (data.products || []).map((product): InventoryItem => {
        const currentStock = product.stockQuantity ?? 0;
        const reservedStock = product.reserved ?? 0;
        const availableStock = Math.max(0, currentStock - reservedStock);
        const minStock = product.lowStockThreshold ?? 5;
        return {
          id: product._id,
          productName: product.name,
          category: product.category || '未分類',
          currentStock,
          reservedStock,
          availableStock,
          minStock,
          status: getStockStatus(availableStock, minStock),
        };
      });

      setInventory(items);
      setLogs(data.logs || []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '在庫データの取得に失敗しました');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInventoryData();
  }, [fetchInventoryData]);

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item.id);
    setEditValues({ [item.id]: String(item.currentStock) });
    setEditNotes({ [item.id]: '' });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditValues({});
    setEditNotes({});
  };

  const saveEdit = async (item: InventoryItem) => {
    const newStock = Number(editValues[item.id]);
    const note = (editNotes[item.id] || '').trim();
    if (!Number.isSafeInteger(newStock) || newStock < item.reservedStock || newStock > 1_000_000) {
      setError(`在庫数は予約済在庫${item.reservedStock}個以上、1,000,000個以下の整数で入力してください`);
      return;
    }
    if (!note || note.length > 200) {
      setError('在庫変更理由は1〜200文字で入力してください');
      return;
    }

    setSavingItem(item.id);
    setError(null);
    try {
      const response = await fetch('/api/admin/inventory/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: item.id, stockQuantity: newStock, note }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || '在庫更新に失敗しました');
      }

      cancelEdit();
      await fetchInventoryData(false);
      alert('在庫を更新し、変更履歴を保存しました。');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : '在庫更新に失敗しました');
    } finally {
      setSavingItem(null);
    }
  };

  const getStatusConfig = (status: InventoryStatus) => {
    switch (status) {
      case 'in_stock':
        return { label: '在庫あり', color: 'bg-green-100 text-green-800' };
      case 'low_stock':
        return { label: '在庫少', color: 'bg-yellow-100 text-yellow-800' };
      case 'out_of_stock':
        return { label: '在庫切れ', color: 'bg-red-100 text-red-800' };
    }
  };

  const filteredInventory = inventory.filter((item) => filter === 'all' || item.status === filter);
  const productNameById = new Map(inventory.map((item) => [item.id, item.productName]));

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">在庫管理</h1>
          <p className="text-gray-600 mt-2">在庫の入荷・棚卸し・手動調整を履歴付きで管理</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchInventoryData()}
          className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        >
          最新データを取得
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        在庫数の変更はこの画面に集約されています。予約済在庫は注文処理が自動管理するため、手動では変更できません。
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
      )}

      <div className="flex flex-wrap gap-2">
        {([
          ['all', 'すべて'],
          ['in_stock', '在庫あり'],
          ['low_stock', '在庫少'],
          ['out_of_stock', '在庫切れ'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === value ? 'bg-moss-green text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label} ({value === 'all' ? inventory.length : inventory.filter((item) => item.status === value).length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-medium">在庫状況</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['商品名', '現在庫数', '予約済', '利用可能', 'ステータス', '操作'].map((heading) => (
                      <th
                        key={heading}
                        className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase ${
                          heading === '操作' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredInventory.map((item) => {
                    const statusConfig = getStatusConfig(item.status);
                    const isEditing = editingItem === item.id;
                    const note = editNotes[item.id] || '';
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 align-top">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                          <div className="text-sm text-gray-500">{item.category}</div>
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <div className="space-y-2 min-w-[220px]">
                              <input
                                type="number"
                                min={item.reservedStock}
                                max={1_000_000}
                                step={1}
                                value={editValues[item.id] ?? ''}
                                onChange={(event) =>
                                  setEditValues((previous) => ({ ...previous, [item.id]: event.target.value }))
                                }
                                className="w-24 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-moss-green focus:border-moss-green"
                                aria-label={`${item.productName}の在庫数`}
                                autoFocus
                              />
                              <div>
                                <label htmlFor={`inventory-note-${item.id}`} className="block text-xs font-medium text-gray-600 mb-1">
                                  在庫変更理由（必須）
                                </label>
                                <input
                                  id={`inventory-note-${item.id}`}
                                  type="text"
                                  maxLength={200}
                                  value={note}
                                  onChange={(event) =>
                                    setEditNotes((previous) => ({ ...previous, [item.id]: event.target.value }))
                                  }
                                  placeholder="例：7月棚卸し、入荷"
                                  className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-moss-green focus:border-moss-green"
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-900">{item.currentStock}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.reservedStock}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.availableStock}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {isEditing ? (
                            <div className="space-x-2">
                              <button
                                type="button"
                                onClick={() => void saveEdit(item)}
                                disabled={savingItem === item.id || !note.trim()}
                                className="text-green-600 hover:text-green-500 disabled:opacity-40"
                              >
                                {savingItem === item.id ? '保存中...' : '保存'}
                              </button>
                              <button type="button" onClick={cancelEdit} className="text-gray-600 hover:text-gray-500">
                                キャンセル
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="text-moss-green hover:text-moss-green/80"
                            >
                              在庫を調整
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredInventory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                        対象の商品はありません。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-medium">最近の在庫変更</h2>
              <p className="text-xs text-gray-500 mt-1">最新50件</p>
            </div>
            <div className="max-h-[640px] overflow-y-auto divide-y divide-gray-200">
              {logs.map((log) => {
                const config = operationConfig[log.operation] || operationConfig.adjustment;
                const timestamp = new Date(log.timestamp);
                return (
                  <div key={log._id} className="px-6 py-4">
                    <div className="flex items-start space-x-3">
                      <span className="text-lg">{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          <span className={config.color}>{config.label}</span>
                          <span className="ml-2">
                            {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                          </span>
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          {productNameById.get(log.productId) || log.productId}
                        </p>
                        {Number.isFinite(timestamp.getTime()) && (
                          <p className="text-xs text-gray-500 mt-1">
                            {timestamp.toLocaleDateString('ja-JP')}{' '}
                            {timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {log.reason && <p className="text-xs text-gray-600 mt-1 break-words">理由: {log.reason}</p>}
                        {log.user && <p className="text-xs text-gray-400 mt-1">実行者: {log.user}</p>}
                      </div>
                      {typeof log.previousStock === 'number' && typeof log.newStock === 'number' && (
                        <div className="text-right text-xs text-gray-500 whitespace-nowrap">
                          {log.previousStock} → {log.newStock}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {logs.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-gray-500">在庫変更履歴はまだありません。</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
