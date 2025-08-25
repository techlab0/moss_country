'use client';

import React, { useEffect, useState } from 'react';

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  lowStockItems: number;
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    lowStockItems: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: 実際のAPIから統計データを取得
    // 現在はモックデータを使用
    setTimeout(() => {
      setStats({
        totalOrders: 45,
        totalRevenue: 278500,
        totalProducts: 28,
        lowStockItems: 3,
      });
      setLoading(false);
    }, 1000);
  }, []);

  const statCards = [
    {
      title: '総注文数',
      value: stats.totalOrders,
      suffix: '件',
      icon: '📦',
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      title: '総売上',
      value: stats.totalRevenue,
      suffix: '円',
      icon: '💰',
      color: 'bg-green-500',
      change: '+8.2%',
      format: true,
    },
    {
      title: '商品数',
      value: stats.totalProducts,
      suffix: '点',
      icon: '🌱',
      color: 'bg-moss-green',
      change: '+2',
    },
    {
      title: '低在庫商品',
      value: stats.lowStockItems,
      suffix: '件',
      icon: '⚠️',
      color: 'bg-yellow-500',
      change: '要確認',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-4"></div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat) => (
        <div key={stat.title} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`${stat.color} rounded-lg p-3 mr-4`}>
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900">
                {stat.format ? stat.value.toLocaleString() : stat.value}
                <span className="text-sm font-normal text-gray-600 ml-1">
                  {stat.suffix}
                </span>
              </p>
              <p className={`text-sm ${
                stat.change.includes('+') ? 'text-green-600' : 
                stat.change.includes('要確認') ? 'text-yellow-600' : 'text-gray-600'
              }`}>
                {stat.change}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}