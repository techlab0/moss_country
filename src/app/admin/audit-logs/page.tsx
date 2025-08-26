'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface AuditStats {
  total: number;
  today: number;
  thisWeek: number;
  bySeverity: Record<string, number>;
}

interface SecurityAlert {
  type: string;
  severity: 'medium' | 'high' | 'critical';
  message: string;
  count: number;
  users: string[];
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    severity: '',
    action: '',
    user: '',
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      // 監査ログを取得
      const logsResponse = await fetch('/api/admin/audit-logs?' + new URLSearchParams({
        ...(filter.severity && { severity: filter.severity }),
        ...(filter.action && { action: filter.action }),
        ...(filter.user && { userId: filter.user }),
      }));
      
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setLogs(logsData.logs);
      }

      // 統計を取得
      const statsResponse = await fetch('/api/admin/audit-logs/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      // セキュリティアラートを取得
      const alertsResponse = await fetch('/api/admin/audit-logs/alerts');
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.alerts);
      }
    } catch (error) {
      console.error('監査ログの取得に失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-gray-600 bg-gray-100';
      case 'medium': return 'text-blue-600 bg-blue-100';
      case 'high': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'login.success': 'ログイン成功',
      'login.failed': 'ログイン失敗',
      'logout': 'ログアウト',
      '2fa.setup': '2FA設定',
      '2fa.verify.success': '2FA認証成功',
      '2fa.verify.failed': '2FA認証失敗',
      'password.changed': 'パスワード変更',
      'user.created': 'ユーザー作成',
      'user.updated': 'ユーザー更新',
      'user.deleted': 'ユーザー削除',
      'admin.access': '管理画面アクセス',
      'settings.changed': '設定変更',
    };
    return labels[action] || action;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <div className="text-lg">読み込み中...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">監査ログ</h1>
          <p className="text-gray-600 mt-2">システムの操作履歴とセキュリティ監視</p>
        </div>

        {/* 統計情報 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">総ログ数</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
              <div className="text-sm text-gray-600">今日</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{stats.thisWeek}</div>
              <div className="text-sm text-gray-600">今週</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-red-600">{stats.bySeverity.critical || 0}</div>
              <div className="text-sm text-gray-600">重要なイベント</div>
            </div>
          </div>
        )}

        {/* セキュリティアラート */}
        {alerts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-800 mb-3">🚨 セキュリティアラート</h3>
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div key={index} className={`p-3 rounded ${
                  alert.severity === 'critical' ? 'bg-red-100' :
                  alert.severity === 'high' ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                  <div className="font-medium">{alert.message}</div>
                  <div className="text-sm text-gray-600">
                    影響ユーザー: {alert.users.join(', ')} ({alert.count}件)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* フィルター */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">フィルター</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">重要度</label>
              <select
                value={filter.severity}
                onChange={(e) => setFilter({...filter, severity: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">すべて</option>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="critical">緊急</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">アクション</label>
              <select
                value={filter.action}
                onChange={(e) => setFilter({...filter, action: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">すべて</option>
                <option value="login.success">ログイン成功</option>
                <option value="login.failed">ログイン失敗</option>
                <option value="user.created">ユーザー作成</option>
                <option value="user.deleted">ユーザー削除</option>
                <option value="password.changed">パスワード変更</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilter({severity: '', action: '', user: ''})}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                リセット
              </button>
            </div>
          </div>
        </div>

        {/* ログ一覧 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">操作ログ</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">時刻</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ユーザー</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">リソース</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">重要度</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">詳細</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(log.timestamp).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.userEmail}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{getActionLabel(log.action)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.resource}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(log.severity)}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {log.ipAddress && <div>IP: {log.ipAddress}</div>}
                      {Object.keys(log.details).length > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          {JSON.stringify(log.details, null, 2).substring(0, 100)}...
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {logs.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">ログが見つかりませんでした</div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}