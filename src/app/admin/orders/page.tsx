'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: string;
  createdAt: Date;
  items: OrderItem[];
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

const statusConfig = {
  pending: { label: '未処理', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: '処理中', color: 'bg-blue-100 text-blue-800' },
  shipped: { label: '発送済', color: 'bg-green-100 text-green-800' },
  delivered: { label: '配達完了', color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: 'キャンセル', color: 'bg-red-100 text-red-800' },
};

export default function AdminOrdersPage(): JSX.Element {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    // TODO: 実際のAPIから注文データを取得
    // 現在はモックデータを使用
    setTimeout(() => {
      setOrders([
        {
          id: '1',
          orderNumber: 'ORD-20241224-001',
          customerName: '田中 花子',
          customerEmail: 'tanaka@example.com',
          total: 8500,
          status: 'pending',
          paymentMethod: 'クレジットカード',
          createdAt: new Date('2024-12-24T10:30:00'),
          items: [
            { id: '1', name: 'ミニカプセルテラリウム', quantity: 1, price: 5500 },
            { id: '2', name: '送料', quantity: 1, price: 800 },
          ],
        },
        {
          id: '2',
          orderNumber: 'ORD-20241224-002',
          customerName: '山田 太郎',
          customerEmail: 'yamada@example.com',
          total: 12000,
          status: 'processing',
          paymentMethod: '銀行振込',
          createdAt: new Date('2024-12-24T09:15:00'),
          items: [
            { id: '3', name: 'プレミアムテラリウム', quantity: 1, price: 12000 },
          ],
        },
        {
          id: '3',
          orderNumber: 'ORD-20241223-015',
          customerName: '佐藤 美樹',
          customerEmail: 'sato@example.com',
          total: 6800,
          status: 'shipped',
          paymentMethod: '代金引換',
          createdAt: new Date('2024-12-23T16:45:00'),
          items: [
            { id: '4', name: '苔玉テラリウム', quantity: 2, price: 3200 },
            { id: '5', name: '送料', quantity: 1, price: 400 },
          ],
        },
      ]);
      setLoading(false);
    }, 1000);
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    // TODO: APIでステータス更新
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  const filteredOrders = orders.filter(order => 
    filter === 'all' || order.status === filter
  );

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">注文管理</h1>
            <p className="text-gray-600 mt-2">すべての注文を管理</p>
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
            すべて ({orders.length})
          </button>
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = orders.filter(order => order.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  filter === status
                    ? 'bg-moss-green text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {config.label} ({count})
              </button>
            );
          })}
        </div>

        {/* 注文一覧 */}
        <div className="bg-white shadow rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    注文番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    顧客情報
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    支払方法
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    注文日
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-sm font-medium text-moss-green hover:text-moss-green/80"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.customerName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.customerEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ¥{order.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.paymentMethod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])}
                        className={`text-xs font-medium rounded-full px-2 py-1 border-0 ${statusConfig[order.status].color}`}
                      >
                        {Object.entries(statusConfig).map(([status, config]) => (
                          <option key={status} value={status}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.createdAt.toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-moss-green hover:text-moss-green/80"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">注文がありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}