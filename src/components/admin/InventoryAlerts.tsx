'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface InventoryAlert {
  id: string;
  productName: string;
  currentStock: number;
  minStock: number;
  status: 'low' | 'out';
  slug?: string;
}

export function InventoryAlerts() {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/alerts');
      if (!response.ok) {
        throw new Error('在庫アラートデータの取得に失敗しました');
      }
      const data = await response.json();
      setAlerts(data.alerts);
      setLoading(false);
    } catch (error) {
      console.error('Alerts fetch error:', error);
      setAlerts([]);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">在庫アラート</h2>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 bg-gray-200 rounded w-8"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
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
          <h2 className="text-lg font-medium text-gray-900">在庫アラート</h2>
          <Link
            href="/admin/inventory"
            className="text-sm text-moss-green hover:text-moss-green/80"
          >
            在庫管理
          </Link>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {alerts.map((alert) => (
          <div key={alert.id} className="px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                alert.status === 'out' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {alert.productName}
                </p>
                <p className="text-sm text-gray-600">
                  現在: {alert.currentStock}個 / 最低: {alert.minStock}個
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  alert.status === 'out'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {alert.status === 'out' ? '在庫切れ' : '在庫少'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {alerts.length === 0 && (
        <div className="px-6 py-8 text-center">
          <div className="text-green-600 text-4xl mb-2">✅</div>
          <p className="text-gray-500">在庫は十分あります</p>
        </div>
      )}
    </div>
  );
}