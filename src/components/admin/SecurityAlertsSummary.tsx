'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  status: string;
  lastOccurrence: string;
}

interface SecurityAlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  bySeverity: Record<string, number>;
}

export function SecurityAlertsSummary() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [stats, setStats] = useState<SecurityAlertStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 最新のアクティブなアラートを取得
      const alertsResponse = await fetch('/api/admin/security-alerts?status=active&limit=5');
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.alerts || []);
      }

      // 統計を取得
      const statsResponse = await fetch('/api/admin/security-alerts?action=stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('セキュリティアラートの取得に失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-gray-600';
      case 'medium': return 'text-blue-600';
      case 'high': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      failed_logins: 'ログイン失敗',
      brute_force: 'ブルートフォース',
      suspicious_activity: '疑わしい活動',
      privilege_escalation: '権限昇格',
      unusual_access: '異常アクセス',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded-sm mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded-sm"></div>
            <div className="h-4 bg-gray-200 rounded-sm"></div>
            <div className="h-4 bg-gray-200 rounded-sm"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            🚨 セキュリティアラート
          </h3>
          <Link 
            href="/admin/security-alerts"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            すべて表示 →
          </Link>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.active}</div>
              <div className="text-xs text-gray-600">アクティブ</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.bySeverity.critical || 0}</div>
              <div className="text-xs text-gray-600">緊急</div>
            </div>
          </div>
        )}

        {alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="border-l-4 border-red-400 bg-red-50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${getSeverityColor(alert.severity)}`}>
                      {getTypeLabel(alert.type)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(alert.lastOccurrence).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                  {alert.message}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-green-600 text-4xl mb-2">✅</div>
            <div className="text-sm text-gray-600">
              現在アクティブなセキュリティアラートはありません
            </div>
          </div>
        )}
      </div>

      {stats && stats.active > 0 && (
        <div className="bg-gray-50 px-6 py-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {stats.active}件のアラートが未対応です
            </span>
            <Link 
              href="/admin/security-alerts"
              className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors"
            >
              対応する
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}