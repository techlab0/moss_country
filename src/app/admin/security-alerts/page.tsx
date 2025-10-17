'use client';

import { useState, useEffect } from 'react';

interface SecurityAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  type: 'failed_logins' | 'suspicious_activity' | 'privilege_escalation' | 'unusual_access' | 'brute_force';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  affectedUsers: string[];
  affectedIPs: string[];
  count: number;
  firstOccurrence: string;
  lastOccurrence: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'false_positive';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  notes?: string;
  createdAt: string;
}

interface SecurityAlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
}

export default function SecurityAlertsPage() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [stats, setStats] = useState<SecurityAlertStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [filter, setFilter] = useState({
    status: '',
    severity: '',
  });
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      // アラート一覧を取得
      const params = new URLSearchParams({
        ...(filter.status && { status: filter.status }),
        ...(filter.severity && { severity: filter.severity }),
      });
      
      const alertsResponse = await fetch('/api/admin/security-alerts?' + params);
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.alerts);
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

  const detectNewAlerts = async () => {
    setIsDetecting(true);
    try {
      const response = await fetch('/api/admin/security-alerts?action=detect');
      if (response.ok) {
        const data = await response.json();
        alert(`${data.alerts.length}件の新しいアラートを検出しました`);
        fetchData(); // データを再取得
      }
    } catch (error) {
      console.error('アラート検出に失敗:', error);
      alert('アラート検出に失敗しました');
    } finally {
      setIsDetecting(false);
    }
  };

  const updateAlertStatus = async (alertId: string, status: string, notes?: string) => {
    try {
      const response = await fetch('/api/admin/security-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_status',
          alertId,
          status,
          notes
        }),
      });

      if (response.ok) {
        fetchData(); // データを再取得
        setShowDetails(false);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'ステータス更新に失敗しました');
      }
    } catch (error) {
      console.error('ステータス更新に失敗:', error);
      alert('ステータス更新に失敗しました');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-600 bg-red-100';
      case 'acknowledged': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'false_positive': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'アクティブ',
      acknowledged: '確認済み',
      resolved: '解決済み',
      false_positive: '誤検知',
    };
    return labels[status] || status;
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
        {/* ヘッダー */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">セキュリティアラート</h1>
            <p className="text-gray-600 mt-2">自動検出されたセキュリティ脅威とインシデント</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={detectNewAlerts}
              disabled={isDetecting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isDetecting ? '検出中...' : '🔍 新しいアラートを検出'}
            </button>
          </div>
        </div>

        {/* 統計情報 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-red-600">{stats.active}</div>
              <div className="text-sm text-gray-600">アクティブ</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-yellow-600">{stats.acknowledged}</div>
              <div className="text-sm text-gray-600">確認済み</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
              <div className="text-sm text-gray-600">解決済み</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">総計</div>
            </div>
          </div>
        )}

        {/* フィルター */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">フィルター</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
              <select
                value={filter.status}
                onChange={(e) => setFilter({...filter, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">すべて</option>
                <option value="active">アクティブ</option>
                <option value="acknowledged">確認済み</option>
                <option value="resolved">解決済み</option>
                <option value="false_positive">誤検知</option>
              </select>
            </div>
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
            <div className="flex items-end">
              <button
                onClick={() => setFilter({status: '', severity: ''})}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                リセット
              </button>
            </div>
          </div>
        </div>

        {/* アラート一覧 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">セキュリティアラート</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">時刻</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">種類</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">重要度</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">メッセージ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">影響ユーザー</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(alert.lastOccurrence).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {getTypeLabel(alert.type)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(alert.status)}`}>
                        {getStatusLabel(alert.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                      {alert.message}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {alert.affectedUsers.slice(0, 2).join(', ')}
                      {alert.affectedUsers.length > 2 && ` +${alert.affectedUsers.length - 2}`}
                    </td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      <button
                        onClick={() => {
                          setSelectedAlert(alert);
                          setShowDetails(true);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        詳細
                      </button>
                      {alert.status === 'active' && (
                        <button
                          onClick={() => updateAlertStatus(alert.id, 'acknowledged')}
                          className="text-yellow-600 hover:text-yellow-800"
                        >
                          確認
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {alerts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">アラートが見つかりませんでした</div>
            </div>
          )}
        </div>

        {/* アラート詳細モーダル */}
        {showDetails && selectedAlert && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">アラート詳細</h3>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong>種類:</strong> {getTypeLabel(selectedAlert.type)}
                    </div>
                    <div>
                      <strong>重要度:</strong> 
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(selectedAlert.severity)}`}>
                        {selectedAlert.severity}
                      </span>
                    </div>
                    <div>
                      <strong>検出回数:</strong> {selectedAlert.count}
                    </div>
                    <div>
                      <strong>ステータス:</strong>
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedAlert.status)}`}>
                        {getStatusLabel(selectedAlert.status)}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <strong>メッセージ:</strong>
                    <p className="mt-1">{selectedAlert.message}</p>
                  </div>
                  
                  <div>
                    <strong>影響を受けたユーザー:</strong>
                    <p className="mt-1">{selectedAlert.affectedUsers.join(', ')}</p>
                  </div>
                  
                  {selectedAlert.affectedIPs.length > 0 && (
                    <div>
                      <strong>関連IPアドレス:</strong>
                      <p className="mt-1">{selectedAlert.affectedIPs.join(', ')}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong>初回発生:</strong>
                      <p className="mt-1">{new Date(selectedAlert.firstOccurrence).toLocaleString('ja-JP')}</p>
                    </div>
                    <div>
                      <strong>最終発生:</strong>
                      <p className="mt-1">{new Date(selectedAlert.lastOccurrence).toLocaleString('ja-JP')}</p>
                    </div>
                  </div>
                  
                  {selectedAlert.notes && (
                    <div>
                      <strong>メモ:</strong>
                      <p className="mt-1">{selectedAlert.notes}</p>
                    </div>
                  )}
                  
                  <div className="flex space-x-2 pt-4">
                    {selectedAlert.status === 'active' && (
                      <>
                        <button
                          onClick={() => updateAlertStatus(selectedAlert.id, 'acknowledged')}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                        >
                          確認済みにする
                        </button>
                        <button
                          onClick={() => updateAlertStatus(selectedAlert.id, 'resolved')}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          解決済みにする
                        </button>
                        <button
                          onClick={() => updateAlertStatus(selectedAlert.id, 'false_positive')}
                          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                          誤検知にする
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}