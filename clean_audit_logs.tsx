'use client';

import { useState, useEffect } from 'react';

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

export default function AuditLogsPage(): JSX.Element {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    severity: '',
    action: '',
    userEmail: '',
    startDate: '',
    endDate: '',
    ipAddress: '',
    resource: '',
    search: '',
  });
  const [sortBy, setSortBy] = useState<'timestamp' | 'action' | 'severity' | 'userEmail'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filter, sortBy, sortOrder, currentPage]);

  const fetchData = async () => {
    try {
      // 監査ログを取得
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
        sortBy,
        sortOrder,
        ...(filter.severity && { severity: filter.severity }),
        ...(filter.action && { action: filter.action }),
        ...(filter.userEmail && { userEmail: filter.userEmail }),
        ...(filter.startDate && { startDate: filter.startDate }),
        ...(filter.endDate && { endDate: filter.endDate }),
        ...(filter.ipAddress && { ipAddress: filter.ipAddress }),
        ...(filter.resource && { resource: filter.resource }),
        ...(filter.search && { search: filter.search }),
      });
      const logsResponse = await fetch('/api/admin/audit-logs?' + params);
      
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

  const exportData = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        export: format,
        ...(filter.severity && { severity: filter.severity }),
        ...(filter.action && { action: filter.action }),
        ...(filter.userEmail && { userEmail: filter.userEmail }),
        ...(filter.startDate && { startDate: filter.startDate }),
        ...(filter.endDate && { endDate: filter.endDate }),
        ...(filter.ipAddress && { ipAddress: filter.ipAddress }),
        ...(filter.resource && { resource: filter.resource }),
        ...(filter.search && { search: filter.search }),
      });
      
      const response = await fetch('/api/admin/audit-logs?' + params);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || `audit-logs.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('エクスポートに失敗:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const resetFilters = () => {
    setFilter({
      severity: '',
      action: '',
      userEmail: '',
      startDate: '',
      endDate: '',
      ipAddress: '',
      resource: '',
      search: '',
    });
    setCurrentPage(1);
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (column: typeof sortBy) => {
    if (sortBy === column) {
      return sortOrder === 'asc' ? '↑' : '↓';
    }
    return '↕';
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
      <div className="flex justify-center py-12">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">監査ログ</h1>
          <p className="text-gray-600 mt-2">システムの操作履歴とセキュリティ監視</p>
        </div>
      </div>
    </div>
  );
}
