'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  createdAt: Date;
}

const statusConfig = {
  pending: { label: '未処理', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: '処理中', color: 'bg-blue-100 text-blue-800' },
  shipped: { label: '発送済', color: 'bg-green-100 text-green-800' },
  delivered: { label: '配達完了', color: 'bg-gray-100 text-gray-800' },
};

export function RecentOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: 実際のAPIから注文データを取得
    // 現在はモックデータを使用
    setTimeout(() => {
      setOrders([
        {
          id: '1',
          orderNumber: 'ORD-20241224-001',
          customerName: '田中 花子',
          total: 8500,
          status: 'pending',
          createdAt: new Date('2024-12-24T10:30:00'),
        },
        {
          id: '2',
          orderNumber: 'ORD-20241224-002',
          customerName: '山田 太郎',
          total: 12000,
          status: 'processing',
          createdAt: new Date('2024-12-24T09:15:00'),
        },
        {
          id: '3',
          orderNumber: 'ORD-20241223-015',
          customerName: '佐藤 美樹',
          total: 6800,
          status: 'shipped',
          createdAt: new Date('2024-12-23T16:45:00'),
        },
        {
          id: '4',
          orderNumber: 'ORD-20241223-014',
          customerName: '鈴木 健一',
          total: 15200,
          status: 'delivered',
          createdAt: new Date('2024-12-23T14:20:00'),
        },
      ]);
      setLoading(false);
    }, 1200);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">最近の注文</h2>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">最近の注文</h2>
          <Link
            href="/admin/orders"
            className="text-sm text-moss-green hover:text-moss-green/80"
          >
            すべて表示
          </Link>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {orders.map((order) => (
          <div key={order.id} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-moss-green"
                  >
                    {order.orderNumber}
                  </Link>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      statusConfig[order.status].color
                    }`}
                  >
                    {statusConfig[order.status].label}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {order.customerName} • {order.createdAt.toLocaleDateString('ja-JP')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  ¥{order.total.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {orders.length === 0 && (
        <div className="px-6 py-8 text-center">
          <p className="text-gray-500">最近の注文がありません</p>
        </div>
      )}
    </div>
  );
}