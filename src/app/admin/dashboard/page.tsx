'use client';

import React from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DashboardStats } from '@/components/admin/DashboardStats';
import { RecentOrders } from '@/components/admin/RecentOrders';
import { InventoryAlerts } from '@/components/admin/InventoryAlerts';

export default function AdminDashboardPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600 mt-2">MOSS COUNTRY 管理画面へようこそ</p>
        </div>
        
        {/* 統計情報 */}
        <DashboardStats />
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* 最近の注文 */}
          <RecentOrders />
          
          {/* 在庫アラート */}
          <InventoryAlerts />
        </div>
      </div>
    </AdminLayout>
  );
}