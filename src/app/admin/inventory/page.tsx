'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { getProductsWithInventory } from '@/lib/sanity';

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  category: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minStock: number;
  maxStock: number;
  lastRestocked: Date;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  price: number;
}

interface InventoryLog {
  id: string;
  productId: string;
  type: 'restock' | 'sale' | 'reservation' | 'adjustment';
  quantity: number;
  previousStock: number;
  newStock: number;
  note: string;
  timestamp: Date;
}

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{[key: string]: number}>({});

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      // Sanityから実際の商品・在庫データを取得
      const products = await getProductsWithInventory();
      
      if (products.length === 0) {
        console.log('No products found in Sanity, using mock data');
        // モックデータを使用
        setInventory([
          {
            id: '1',
            productId: 'mock-1',
            productName: 'ミニカプセルテラリウム（モック）',
            category: '初心者向け',
            currentStock: 15,
            reservedStock: 3,
            availableStock: 12,
            minStock: 5,
            maxStock: 50,
            lastRestocked: new Date('2024-12-20'),
            status: 'in_stock',
            price: 5500,
          },
        ]);
      } else {
        // Sanityデータを在庫管理形式に変換
        const inventoryItems: InventoryItem[] = products.map(product => ({
          id: product._id,
          productId: product._id,
          productName: product.name,
          category: product.category || '未分類',
          currentStock: product.stockQuantity || 0,
          reservedStock: product.reserved || 0,
          availableStock: (product.stockQuantity || 0) - (product.reserved || 0),
          minStock: product.lowStockThreshold || 5,
          maxStock: 100, // デフォルト値
          lastRestocked: new Date(), // TODO: 実際の最終入荷日を追加
          status: getStockStatus(product.stockQuantity || 0, product.lowStockThreshold || 5),
          price: product.price,
        }));
        
        setInventory(inventoryItems);
      }

      // モックログデータ（TODO: 実際のログシステム実装）
      setLogs([
        {
          id: '1',
          productId: products[0]?._id || 'mock-1',
          type: 'adjustment',
          quantity: 5,
          previousStock: 10,
          newStock: 15,
          note: 'システム連携テスト',
          timestamp: new Date(),
        },
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch inventory data:', error);
      setLoading(false);
    }
  };

  const updateStock = async (itemId: string, newStock: number, note: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    try {
      // APIで在庫更新（Sanityに保存）
      const response = await fetch('/api/inventory/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: item.productId,
          stockQuantity: newStock,
          reserved: item.reservedStock,
          note,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update inventory');
      }

      const result = await response.json();

      // UI更新
      const updatedItem = {
        ...item,
        currentStock: newStock,
        availableStock: newStock - item.reservedStock,
        status: getStockStatus(newStock, item.minStock),
        lastRestocked: new Date(),
      };

      setInventory(inventory.map(i => 
        i.id === itemId ? updatedItem : i
      ));

      // ログに追加
      const newLog: InventoryLog = {
        id: Date.now().toString(),
        productId: item.productId,
        type: 'adjustment',
        quantity: newStock - item.currentStock,
        previousStock: item.currentStock,
        newStock,
        note,
        timestamp: new Date(),
      };

      setLogs([newLog, ...logs]);
      setEditingItem(null);

      // 成功メッセージ
      alert('在庫が正常に更新されました！');

    } catch (error) {
      console.error('Failed to update stock:', error);
      alert('在庫更新に失敗しました。もう一度お試しください。');
    }
  };

  const getStockStatus = (current: number, min: number): InventoryItem['status'] => {
    if (current === 0) return 'out_of_stock';
    if (current <= min) return 'low_stock';
    return 'in_stock';
  };

  const getStatusConfig = (status: InventoryItem['status']) => {
    switch (status) {
      case 'in_stock':
        return { label: '在庫あり', color: 'bg-green-100 text-green-800' };
      case 'low_stock':
        return { label: '在庫少', color: 'bg-yellow-100 text-yellow-800' };
      case 'out_of_stock':
        return { label: '在庫切れ', color: 'bg-red-100 text-red-800' };
      default:
        return { label: '不明', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const startEdit = (itemId: string, currentStock: number) => {
    setEditingItem(itemId);
    setEditValues({ [itemId]: currentStock });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditValues({});
  };

  const saveEdit = (itemId: string) => {
    const newStock = editValues[itemId];
    if (typeof newStock === 'number' && newStock >= 0) {
      const note = prompt('在庫変更の理由を入力してください:');
      if (note !== null) {
        updateStock(itemId, newStock, note || '手動調整');
      }
    }
  };

  const filteredInventory = inventory.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">在庫管理</h1>
            <p className="text-gray-600 mt-2">商品の在庫状況を管理</p>
          </div>
        </div>

        {/* フィルター */}
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'all'
                ? 'bg-moss-green text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            すべて ({inventory.length})
          </button>
          <button
            onClick={() => setFilter('in_stock')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'in_stock'
                ? 'bg-moss-green text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            在庫あり ({inventory.filter(i => i.status === 'in_stock').length})
          </button>
          <button
            onClick={() => setFilter('low_stock')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'low_stock'
                ? 'bg-moss-green text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            在庫少 ({inventory.filter(i => i.status === 'low_stock').length})
          </button>
          <button
            onClick={() => setFilter('out_of_stock')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'out_of_stock'
                ? 'bg-moss-green text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            在庫切れ ({inventory.filter(i => i.status === 'out_of_stock').length})
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* 在庫一覧 */}
          <div className="xl:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-medium">在庫状況</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        商品名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        現在庫数
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        予約済
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        利用可能
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ステータス
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredInventory.map((item) => {
                      const statusConfig = getStatusConfig(item.status);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.productName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {item.category}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingItem === item.id ? (
                              <input
                                type="number"
                                min="0"
                                value={editValues[item.id] || 0}
                                onChange={(e) => setEditValues({
                                  ...editValues,
                                  [item.id]: parseInt(e.target.value) || 0
                                })}
                                className="w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-moss-green focus:border-moss-green"
                                autoFocus
                              />
                            ) : (
                              <span className="text-sm text-gray-900">
                                {item.currentStock}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.reservedStock}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.availableStock}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {editingItem === item.id ? (
                              <div className="space-x-2">
                                <button
                                  onClick={() => saveEdit(item.id)}
                                  className="text-green-600 hover:text-green-500"
                                >
                                  保存
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="text-gray-600 hover:text-gray-500"
                                >
                                  キャンセル
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEdit(item.id, item.currentStock)}
                                className="text-moss-green hover:text-moss-green/80"
                              >
                                編集
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 在庫変更ログ */}
          <div>
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-medium">最近の在庫変更</h2>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <div className="divide-y divide-gray-200">
                  {logs.map((log) => {
                    const typeConfig = {
                      restock: { label: '補充', color: 'text-green-600', icon: '📦' },
                      sale: { label: '販売', color: 'text-blue-600', icon: '💰' },
                      reservation: { label: '予約', color: 'text-yellow-600', icon: '📋' },
                      adjustment: { label: '調整', color: 'text-gray-600', icon: '⚙️' },
                    };

                    const config = typeConfig[log.type];

                    return (
                      <div key={log.id} className="px-6 py-4">
                        <div className="flex items-start space-x-3">
                          <span className="text-lg">{config.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              <span className={config.color}>{config.label}</span>
                              <span className="ml-2">
                                {log.quantity > 0 ? '+' : ''}{log.quantity}
                              </span>
                            </p>
                            <p className="text-sm text-gray-600">
                              {inventory.find(i => i.productId === log.productId)?.productName}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {log.timestamp.toLocaleDateString('ja-JP')} {log.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {log.note && (
                              <p className="text-xs text-gray-500">
                                {log.note}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              {log.previousStock} → {log.newStock}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}