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

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
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

      <div className="flex space-x-2">
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
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig[order.status].color}`}>
                        {statusConfig[order.status].label}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        {order.customerName} ({order.customerEmail})
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        ¥{order.total.toLocaleString()} - {order.paymentMethod}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex space-x-2">
                      <Link 
                        href={`/admin/orders/${order.id}`}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                      >
                        詳細
                      </Link>
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])}
                        className="text-sm border-gray-300 rounded-md"
                      >
                        {Object.entries(statusConfig).map(([status, config]) => (
                          <option key={status} value={status}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdminOrdersPage;