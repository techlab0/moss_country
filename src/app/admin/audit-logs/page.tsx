'use client';

import { Fragment, useState, useEffect, useCallback } from 'react';

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
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
  const [hasMore, setHasMore] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // 入力中の値は下書きとして保持し、「検索」を押したときだけ filter に反映する。
  // filter を直接更新すると1文字打つごとにAPIを叩いてしまうため。
  const [draft, setDraft] = useState(filter);

  // 依存配列は描画時に評価されるため、fetchData は useEffect より前に定義する。
  // useCallback で包まないと毎描画で別関数になり、依存に入れた瞬間に取得が無限に走る。
  const fetchData = useCallback(async () => {
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
        // APIが想定外の形を返しても描画が落ちないようにする
        setLogs(Array.isArray(logsData.logs) ? logsData.logs : []);
        setHasMore(Boolean(logsData.pagination?.hasMore));
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
        setAlerts(Array.isArray(alertsData.alerts) ? alertsData.alerts : []);
      }
    } catch (error) {
      console.error('監査ログの取得に失敗:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, sortBy, sortOrder, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const emptyFilter = {
    severity: '',
    action: '',
    userEmail: '',
    startDate: '',
    endDate: '',
    ipAddress: '',
    resource: '',
    search: '',
  };

  const applyFilters = () => {
    setFilter(draft);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setDraft(emptyFilter);
    setFilter(emptyFilter);
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
      'contact.list_viewed': 'お問い合わせ一覧表示',
      'contact.viewed': 'お問い合わせ閲覧',
      'contact.updated': 'お問い合わせ更新',
      'contact.replied': 'お問い合わせ返信',
      'security.breach_attempt': '侵入試行',
      'security.suspicious_activity': '不審な操作',
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

  const SEVERITY_LABELS: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '緊急',
  };

  const sortableColumns: { key: typeof sortBy; label: string }[] = [
    { key: 'timestamp', label: '日時' },
    { key: 'action', label: '操作' },
    { key: 'userEmail', label: '実行者' },
    { key: 'severity', label: '重要度' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">監査ログ</h1>
          <p className="text-gray-600 mt-2">システムの操作履歴とセキュリティ監視</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportData('csv')}
            disabled={isExporting}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
          >
            {isExporting ? '出力中...' : 'CSVで出力'}
          </button>
          <button
            onClick={() => exportData('json')}
            disabled={isExporting}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
          >
            JSONで出力
          </button>
        </div>
      </div>

      {/* セキュリティアラート */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-4 rounded-md border ${
                alert.severity === 'critical'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : alert.severity === 'high'
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <p className="font-medium">{alert.message}（{alert.count}件）</p>
              {alert.users.length > 0 && (
                <p className="text-sm mt-1">対象: {alert.users.join(', ')}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 統計 */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white shadow rounded-lg px-6 py-4">
            <p className="text-sm text-gray-500">全期間</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
          </div>
          <div className="bg-white shadow rounded-lg px-6 py-4">
            <p className="text-sm text-gray-500">今日</p>
            <p className="text-2xl font-bold text-gray-900">{stats.today.toLocaleString()}</p>
          </div>
          <div className="bg-white shadow rounded-lg px-6 py-4">
            <p className="text-sm text-gray-500">直近7日</p>
            <p className="text-2xl font-bold text-gray-900">{stats.thisWeek.toLocaleString()}</p>
          </div>
          <div className="bg-white shadow rounded-lg px-6 py-4">
            <p className="text-sm text-gray-500">重要度の内訳</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(stats.bySeverity ?? {}).map(([severity, count]) => (
                <span
                  key={severity}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(severity)}`}
                >
                  {SEVERITY_LABELS[severity] || severity} {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 絞り込み */}
      <div className="bg-white shadow rounded-lg px-6 py-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-500 mb-1">キーワード</label>
            <input
              type="text"
              value={draft.search}
              onChange={(e) => setDraft({ ...draft, search: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              placeholder="操作・実行者・詳細から検索"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">重要度</label>
            <select
              value={draft.severity}
              onChange={(e) => setDraft({ ...draft, severity: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">すべて</option>
              {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-moss-green text-white rounded-md text-sm hover:opacity-90"
          >
            検索
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            条件をクリア
          </button>
          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className="px-4 py-2 text-sm text-moss-green hover:underline"
          >
            {showAdvancedSearch ? '詳細条件を隠す' : '詳細条件'}
          </button>
        </div>

        {showAdvancedSearch && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-gray-200">
            {([
              { key: 'action', label: '操作', type: 'text', placeholder: 'login.success など' },
              { key: 'userEmail', label: '実行者', type: 'text', placeholder: 'メールアドレス' },
              { key: 'resource', label: '対象', type: 'text', placeholder: 'contact_management など' },
              { key: 'ipAddress', label: 'IPアドレス', type: 'text', placeholder: '192.0.2.1' },
              { key: 'startDate', label: '開始日', type: 'date', placeholder: '' },
              { key: 'endDate', label: '終了日', type: 'date', placeholder: '' },
            ] as const).map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-500 mb-1">{label}</label>
                <input
                  type={type}
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 一覧 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {sortableColumns.map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                  >
                    {label} <span className="text-gray-400">{getSortIcon(key)}</span>
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  対象
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    条件に一致する監査ログはありません
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.timestamp).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getActionLabel(log.action)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.userEmail || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(log.severity)}`}>
                          {SEVERITY_LABELS[log.severity] || log.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.resource || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {log.ipAddress || '—'}
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="px-6 py-4">
                          <dl className="space-y-2 text-sm">
                            {log.resourceId && (
                              <div>
                                <dt className="inline font-medium text-gray-500">対象ID: </dt>
                                <dd className="inline text-gray-900 font-mono">{log.resourceId}</dd>
                              </div>
                            )}
                            {log.userAgent && (
                              <div>
                                <dt className="inline font-medium text-gray-500">UA: </dt>
                                <dd className="inline text-gray-900 break-all">{log.userAgent}</dd>
                              </div>
                            )}
                            <div>
                              <dt className="font-medium text-gray-500 mb-1">詳細</dt>
                              <dd>
                                <pre className="bg-white border border-gray-200 rounded p-3 overflow-x-auto text-xs">
                                  {JSON.stringify(log.details ?? {}, null, 2)}
                                </pre>
                              </dd>
                            </div>
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <span className="text-sm text-gray-500">{currentPage}ページ目</span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              前へ
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!hasMore}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              次へ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
