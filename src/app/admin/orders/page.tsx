'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: string;
  paymentMethod?: string;
  createdAt: string;
  itemCount: number;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '未処理', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: '支払い済み', color: 'bg-emerald-100 text-emerald-800' },
  processing: { label: '処理中', color: 'bg-blue-100 text-blue-800' },
  shipped: { label: '発送済', color: 'bg-green-100 text-green-800' },
  delivered: { label: '配達完了', color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: 'キャンセル', color: 'bg-red-100 text-red-800' },
  refunded: { label: '返金済み', color: 'bg-orange-100 text-orange-800' },
};

const paymentMethodLabels: Record<string, string> = {
  credit_card: 'クレジットカード',
  bank_transfer: '銀行振込',
  cash_on_delivery: '代金引換',
};

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/orders');
      if (!response.ok) {
        throw new Error('注文一覧の取得に失敗しました');
      }
      const data = await response.json();
      const fetchedOrders: Order[] = (data.orders || []).map((order: {
        _id: string;
        orderNumber: string;
        customer?: { firstName?: string; lastName?: string; email?: string };
        total?: number;
        status?: string;
        paymentMethod?: string;
        createdAt?: string;
        itemCount?: number;
      }) => ({
        id: order._id,
        orderNumber: order.orderNumber,
        customerName: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || '不明',
        customerEmail: order.customer?.email || '不明',
        total: order.total || 0,
        status: order.status || 'pending',
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt || new Date().toISOString(),
        itemCount: order.itemCount || 0,
      }));
      setOrders(fetchedOrders);
    } catch (err) {
      console.error('Orders fetch error:', err);
      setError(err instanceof Error ? err.message : '注文一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const previousOrders = orders;
    setOrders(orders.map(order =>
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
    setUpdatingId(orderId);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        throw new Error('ステータスの更新に失敗しました');
      }
    } catch (err) {
      console.error('Status update error:', err);
      alert(err instanceof Error ? err.message : 'ステータスの更新に失敗しました');
      setOrders(previousOrders);
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteOrder = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`注文「${orderNumber}」を完全に削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('注文の削除に失敗しました');
      }
      setOrders(orders.filter(order => order.id !== orderId));
    } catch (err) {
      console.error('Order delete error:', err);
      alert(err instanceof Error ? err.message : '注文の削除に失敗しました');
    }
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          すべて ({orders.length})
        </button>
        {Object.entries(statusConfig).map(([status, config]) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {config.label} ({orders.filter(order => order.status === status).length})
          </button>
        ))}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredOrders.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            該当する注文がありません
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <li key={order.id}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {order.orderNumber}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${(statusConfig[order.status] || statusConfig.pending).color}`}>
                          {(statusConfig[order.status] || { label: order.status }).label}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap justify-between gap-2">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          {order.customerName} ({order.customerEmail})
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          ¥{order.total.toLocaleString()} - {order.paymentMethod ? (paymentMethodLabels[order.paymentMethod] || order.paymentMethod) : '不明'} - {order.itemCount}点
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex items-center space-x-2">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                        >
                          詳細
                        </Link>
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          disabled={updatingId === order.id}
                          className="text-sm border-gray-300 rounded-md"
                        >
                          {Object.entries(statusConfig).map(([status, config]) => (
                            <option key={status} value={status}>
                              {config.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => deleteOrder(order.id, order.orderNumber)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminOrdersPage;
