'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface OrderDetail {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    zip: string;
    prefecture: string;
    city: string;
    address1: string;
    address2?: string;
  };
  total: number;
  subtotal: number;
  shippingFee: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: string;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
  statusHistory: StatusHistoryItem[];
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

interface StatusHistoryItem {
  status: string;
  timestamp: Date;
  note?: string;
}

const statusConfig = {
  pending: { label: '未処理', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: '処理中', color: 'bg-blue-100 text-blue-800' },
  shipped: { label: '発送済', color: 'bg-green-100 text-green-800' },
  delivered: { label: '配達完了', color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: 'キャンセル', color: 'bg-red-100 text-red-800' },
};

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      const { id } = await params;
      
      // TODO: 実際のAPIから注文詳細を取得
      // 現在はモックデータを使用
      setTimeout(() => {
        setOrder({
          id,
          orderNumber: 'ORD-20241224-001',
          customerName: '田中 花子',
          customerEmail: 'tanaka@example.com',
          customerPhone: '090-1234-5678',
          shippingAddress: {
            zip: '060-0001',
            prefecture: '北海道',
            city: '札幌市中央区',
            address1: '北1条西1丁目1-1',
            address2: 'マンション101',
          },
          total: 8500,
          subtotal: 7700,
          shippingFee: 800,
          status: 'pending',
          paymentMethod: 'クレジットカード',
          paymentStatus: '支払済み',
          createdAt: new Date('2024-12-24T10:30:00'),
          updatedAt: new Date('2024-12-24T10:30:00'),
          items: [
            {
              id: '1',
              name: 'ミニカプセルテラリウム',
              quantity: 1,
              price: 5500,
              image: '/images/products/mini-terrarium.jpg',
            },
            {
              id: '2',
              name: '苔玉セット',
              quantity: 1,
              price: 2200,
              image: '/images/products/moss-ball.jpg',
            },
          ],
          statusHistory: [
            {
              status: '注文受付',
              timestamp: new Date('2024-12-24T10:30:00'),
              note: '注文が正常に受け付けられました',
            },
          ],
        });
        setLoading(false);
      }, 1000);
    };

    fetchOrder();
  }, [params]);

  const updateStatus = async (newStatus: OrderDetail['status']) => {
    if (!order) return;
    
    setUpdating(true);
    
    // TODO: APIでステータス更新
    setTimeout(() => {
      setOrder({
        ...order,
        status: newStatus,
        updatedAt: new Date(),
        statusHistory: [
          ...order.statusHistory,
          {
            status: statusConfig[newStatus].label,
            timestamp: new Date(),
            note: `ステータスを${statusConfig[newStatus].label}に更新`,
          },
        ],
      });
      setUpdating(false);
    }, 500);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">注文が見つかりません</h2>
          <Link href="/admin/orders" className="mt-4 text-moss-green hover:underline">
            注文一覧に戻る
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/admin/orders"
              className="text-moss-green hover:underline text-sm font-medium"
            >
              ← 注文一覧に戻る
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">
              {order.orderNumber}
            </h1>
            <p className="text-gray-600">
              {order.createdAt.toLocaleDateString('ja-JP')} {order.createdAt.toLocaleTimeString('ja-JP')}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span
              className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                statusConfig[order.status].color
              }`}
            >
              {statusConfig[order.status].label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2 space-y-6">
            {/* 注文商品 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-medium">注文商品</h2>
              </div>
              <div className="divide-y">
                {order.items.map((item) => (
                  <div key={item.id} className="px-6 py-4 flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      🌱
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600">
                        単価: ¥{item.price.toLocaleString()} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        ¥{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 border-t bg-gray-50">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">小計</span>
                    <span>¥{order.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">送料</span>
                    <span>¥{order.shippingFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>合計</span>
                    <span>¥{order.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ステータス履歴 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-medium">ステータス履歴</h2>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  {order.statusHistory.map((item, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-moss-green rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.status}</p>
                        <p className="text-sm text-gray-600">
                          {item.timestamp.toLocaleDateString('ja-JP')} {item.timestamp.toLocaleTimeString('ja-JP')}
                        </p>
                        {item.note && (
                          <p className="text-sm text-gray-500 mt-1">{item.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* ステータス更新 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-medium">ステータス更新</h2>
              </div>
              <div className="px-6 py-4">
                <select
                  value={order.status}
                  onChange={(e) => updateStatus(e.target.value as OrderDetail['status'])}
                  disabled={updating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-moss-green focus:border-moss-green"
                >
                  {Object.entries(statusConfig).map(([status, config]) => (
                    <option key={status} value={status}>
                      {config.label}
                    </option>
                  ))}
                </select>
                {updating && (
                  <p className="text-sm text-gray-600 mt-2">更新中...</p>
                )}
              </div>
            </div>

            {/* 顧客情報 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-medium">顧客情報</h2>
              </div>
              <div className="px-6 py-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-600">氏名</p>
                  <p className="font-medium">{order.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">メールアドレス</p>
                  <p className="font-medium">{order.customerEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">電話番号</p>
                  <p className="font-medium">{order.customerPhone}</p>
                </div>
              </div>
            </div>

            {/* 配送先情報 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-medium">配送先情報</h2>
              </div>
              <div className="px-6 py-4">
                <p className="font-medium">
                  〒{order.shippingAddress.zip}
                </p>
                <p className="font-medium">
                  {order.shippingAddress.prefecture}
                  {order.shippingAddress.city}
                </p>
                <p className="font-medium">
                  {order.shippingAddress.address1}
                </p>
                {order.shippingAddress.address2 && (
                  <p className="font-medium">
                    {order.shippingAddress.address2}
                  </p>
                )}
              </div>
            </div>

            {/* 支払情報 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-medium">支払情報</h2>
              </div>
              <div className="px-6 py-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-600">支払方法</p>
                  <p className="font-medium">{order.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">支払状況</p>
                  <p className="font-medium">{order.paymentStatus}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}