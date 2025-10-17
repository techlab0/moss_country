'use client';

import { useState, useEffect } from 'react';

interface SecuritySettings {
  id: string;
  loginAttemptLimit: number;
  loginAttemptWindow: number;
  lockoutDuration: number;
  ipWhitelist: string[];
  ipBlacklist: string[];
  sessionTimeout: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventReuse: number;
  };
}

interface SecurityStatistics {
  totalLoginAttempts: number;
  recentFailureRate: number;
  activeIPRestrictions: number;
  suspiciousActivityCount: number;
  lastReportGenerated?: string;
}

interface SecurityReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'incident';
  title: string;
  summary: string;
  data: {
    loginAttempts: {
      total: number;
      successful: number;
      failed: number;
      blocked: number;
    };
    ipAnalysis: {
      uniqueIPs: number;
      suspiciousIPs: string[];
      blockedIPs: string[];
    };
    userActivity: {
      activeUsers: number;
      newUsers: number;
      lockedAccounts: number;
    };
    threatDetection: {
      bruteForceAttempts: number;
      suspiciousActivity: number;
      geoAnomalies: number;
    };
    recommendations: string[];
  };
  generatedAt: string;
}

interface IPRestriction {
  id: string;
  type: 'whitelist' | 'blacklist';
  ipAddress: string;
  cidrNotation?: string;
  description: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export default function AdvancedSecurityPage() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [statistics, setStatistics] = useState<SecurityStatistics | null>(null);
  const [reports, setReports] = useState<SecurityReport[]>([]);
  const [ipRestrictions, setIPRestrictions] = useState<IPRestriction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'reports'>('overview');
  
  // 設定変更用の状態
  const [tempSettings, setTempSettings] = useState<SecuritySettings | null>(null);
  const [settingsChanged, setSettingsChanged] = useState(false);
  
  
  // パスワード強度チェック用の状態
  const [testPassword, setTestPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<any>(null);
  
  // レポート生成用の状態
  const [reportGenerating, setReportGenerating] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/security');
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        setTempSettings(data.settings);
        setStatistics(data.statistics);
        setReports(data.recentReports || []);
      } else {
        setError('セキュリティ情報の取得に失敗しました');
      }
    } catch (err) {
      setError('セキュリティ情報の取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async () => {
    if (!tempSettings) return;

    try {
      const response = await fetch('/api/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-settings',
          data: tempSettings
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSettings(result.settings);
        setTempSettings(result.settings);
        setSettingsChanged(false);
        setSuccess('セキュリティ設定を更新しました');
      } else {
        const errorData = await response.json();
        setError(errorData.error || '設定の更新に失敗しました');
      }
    } catch (err) {
      setError('設定の更新中にエラーが発生しました');
    }
  };


  const generateReport = async (type: 'daily' | 'weekly' | 'monthly') => {
    setReportGenerating(true);
    try {
      const response = await fetch('/api/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-report',
          data: { type }
        })
      });

      if (response.ok) {
        const result = await response.json();
        setReports(prev => [result.report, ...prev]);
        setSuccess(`${type === 'daily' ? '日次' : type === 'weekly' ? '週次' : '月次'}レポートを生成しました`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'レポート生成に失敗しました');
      }
    } catch (err) {
      setError('レポート生成中にエラーが発生しました');
    } finally {
      setReportGenerating(false);
    }
  };

  const checkPasswordStrength = async () => {
    if (!testPassword) return;

    try {
      const response = await fetch(`/api/admin/security?action=password-strength&password=${encodeURIComponent(testPassword)}`);
      
      if (response.ok) {
        const result = await response.json();
        setPasswordStrength(result.passwordCheck);
      } else {
        setError('パスワード強度チェックに失敗しました');
      }
    } catch (err) {
      setError('パスワード強度チェック中にエラーが発生しました');
    }
  };

  const handleTempSettingsChange = (field: string, value: any) => {
    if (!tempSettings) return;
    
    setTempSettings({
      ...tempSettings,
      [field]: value
    });
    setSettingsChanged(true);
  };

  const handlePasswordPolicyChange = (field: string, value: any) => {
    if (!tempSettings) return;
    
    setTempSettings({
      ...tempSettings,
      passwordPolicy: {
        ...tempSettings.passwordPolicy,
        [field]: value
      }
    });
    setSettingsChanged(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-lg font-semibold text-gray-800">セキュリティ情報を読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">高度なセキュリティ管理</h1>
            <p className="text-gray-700 mt-2 text-base font-medium">ログイン制限・IP制御・脅威検出・セキュリティレポート</p>
          </div>
        </div>

        {/* エラー・成功メッセージ */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-base font-medium">
            {error}
            <button onClick={() => setError('')} className="float-right font-bold text-red-900">×</button>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-base font-medium">
            {success}
            <button onClick={() => setSuccess('')} className="float-right font-bold text-green-900">×</button>
          </div>
        )}

        {/* 統計情報カード */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{statistics.totalLoginAttempts}</div>
              <div className="text-sm text-gray-700 font-medium">総ログイン試行数</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-red-600">
                {(statistics.recentFailureRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-700 font-medium">直近失敗率</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-orange-600">-</div>
              <div className="text-sm text-gray-700 font-medium">予約済み</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">{statistics.suspiciousActivityCount}</div>
              <div className="text-sm text-gray-700 font-medium">疑わしいアクティビティ</div>
            </div>
          </div>
        )}

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: '概要', icon: '📊' },
              { key: 'settings', label: 'セキュリティ設定', icon: '⚙️' },
              { key: 'reports', label: 'レポート', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 概要タブ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 現在のセキュリティ設定 */}
              {settings && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-semibold">現在のセキュリティ設定</h3>
                  </div>
                  <div className="p-6 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ログイン試行制限</span>
                      <span className="font-medium">{settings.loginAttemptLimit}回 / {settings.loginAttemptWindow}分</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ロック時間</span>
                      <span className="font-medium">{settings.lockoutDuration}分</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">セッションタイムアウト</span>
                      <span className="font-medium">{settings.sessionTimeout}分</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">パスワード最低長</span>
                      <span className="font-medium">{settings.passwordPolicy.minLength}文字</span>
                    </div>
                  </div>
                </div>
              )}

              {/* パスワード強度チェッカー */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-lg font-semibold">パスワード強度チェッカー</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <input
                      type="password"
                      value={testPassword}
                      onChange={(e) => setTestPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="テストするパスワードを入力..."
                    />
                  </div>
                  <button
                    onClick={checkPasswordStrength}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    強度をチェック
                  </button>
                  
                  {passwordStrength && (
                    <div className="mt-4">
                      <div className="flex items-center mb-2">
                        <span className="text-sm font-medium">強度スコア: </span>
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                          passwordStrength.score >= 80 ? 'bg-green-100 text-green-800' :
                          passwordStrength.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {passwordStrength.score}/100
                        </span>
                      </div>
                      
                      {passwordStrength.issues.length > 0 && (
                        <div className="mb-2">
                          <div className="text-sm font-medium text-red-600 mb-1">問題点:</div>
                          <ul className="text-xs text-red-600 list-disc list-inside space-y-1">
                            {passwordStrength.issues.map((issue: string, index: number) => (
                              <li key={index}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {passwordStrength.suggestions.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-blue-600 mb-1">推奨事項:</div>
                          <ul className="text-xs text-blue-600 list-disc list-inside space-y-1">
                            {passwordStrength.suggestions.map((suggestion: string, index: number) => (
                              <li key={index}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 最近のレポート */}
            {reports.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-lg font-semibold">最近のセキュリティレポート</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {reports.slice(0, 3).map((report) => (
                      <div key={report.id} className="border-l-4 border-blue-400 pl-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{report.title}</h4>
                            <p className="text-sm text-gray-600">{report.summary}</p>
                            <div className="mt-2 text-xs text-gray-500">
                              生成日時: {new Date(report.generatedAt).toLocaleString('ja-JP')}
                            </div>
                          </div>
                          <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {report.type === 'daily' ? '日次' : 
                             report.type === 'weekly' ? '週次' : 
                             report.type === 'monthly' ? '月次' : 'インシデント'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* セキュリティ設定タブ */}
        {activeTab === 'settings' && tempSettings && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold">セキュリティ設定</h3>
                {settingsChanged && (
                  <button
                    onClick={updateSettings}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    設定を保存
                  </button>
                )}
              </div>
              <div className="p-6 space-y-6">
                {/* ログイン試行制限 */}
                <div>
                  <h4 className="text-md font-medium mb-4">ログイン試行制限</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        試行制限回数
                      </label>
                      <input
                        type="number"
                        value={tempSettings.loginAttemptLimit}
                        onChange={(e) => handleTempSettingsChange('loginAttemptLimit', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        min="1"
                        max="20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        時間窓（分）
                      </label>
                      <input
                        type="number"
                        value={tempSettings.loginAttemptWindow}
                        onChange={(e) => handleTempSettingsChange('loginAttemptWindow', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        min="1"
                        max="120"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ロック時間（分）
                      </label>
                      <input
                        type="number"
                        value={tempSettings.lockoutDuration}
                        onChange={(e) => handleTempSettingsChange('lockoutDuration', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        min="1"
                        max="1440"
                      />
                    </div>
                  </div>
                </div>

                {/* パスワードポリシー */}
                <div>
                  <h4 className="text-md font-medium mb-4">パスワードポリシー</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        最低文字数
                      </label>
                      <input
                        type="number"
                        value={tempSettings.passwordPolicy.minLength}
                        onChange={(e) => handlePasswordPolicyChange('minLength', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        min="4"
                        max="50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        パスワード再利用禁止数
                      </label>
                      <input
                        type="number"
                        value={tempSettings.passwordPolicy.preventReuse}
                        onChange={(e) => handlePasswordPolicyChange('preventReuse', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        min="0"
                        max="20"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={tempSettings.passwordPolicy.requireUppercase}
                        onChange={(e) => handlePasswordPolicyChange('requireUppercase', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">大文字を必須とする</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={tempSettings.passwordPolicy.requireLowercase}
                        onChange={(e) => handlePasswordPolicyChange('requireLowercase', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">小文字を必須とする</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={tempSettings.passwordPolicy.requireNumbers}
                        onChange={(e) => handlePasswordPolicyChange('requireNumbers', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">数字を必須とする</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={tempSettings.passwordPolicy.requireSpecialChars}
                        onChange={(e) => handlePasswordPolicyChange('requireSpecialChars', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">特殊文字を必須とする</span>
                    </label>
                  </div>
                </div>

                {/* その他の設定 */}
                <div>
                  <h4 className="text-md font-medium mb-4">その他の設定</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        セッションタイムアウト（分）
                      </label>
                      <input
                        type="number"
                        value={tempSettings.sessionTimeout}
                        onChange={(e) => handleTempSettingsChange('sessionTimeout', parseInt(e.target.value))}
                        className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md"
                        min="10"
                        max="1440"
                      />
                    </div>
                    
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* レポートタブ */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">セキュリティレポート</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => generateReport('daily')}
                  disabled={reportGenerating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  日次レポート生成
                </button>
                <button
                  onClick={() => generateReport('weekly')}
                  disabled={reportGenerating}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  週次レポート生成
                </button>
                <button
                  onClick={() => generateReport('monthly')}
                  disabled={reportGenerating}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
                >
                  月次レポート生成
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="bg-white rounded-lg shadow">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-semibold">{report.title}</h4>
                        <p className="text-gray-600">{report.summary}</p>
                        <div className="text-sm text-gray-500 mt-1">
                          生成日時: {new Date(report.generatedAt).toLocaleString('ja-JP')}
                        </div>
                      </div>
                      <div className="text-sm bg-gray-100 px-3 py-1 rounded">
                        {report.type === 'daily' ? '日次' : 
                         report.type === 'weekly' ? '週次' : 
                         report.type === 'monthly' ? '月次' : 'インシデント'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {report.data.loginAttempts.total}
                        </div>
                        <div className="text-xs text-gray-600">総ログイン試行</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {report.data.loginAttempts.successful}
                        </div>
                        <div className="text-xs text-gray-600">成功</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {report.data.loginAttempts.failed}
                        </div>
                        <div className="text-xs text-gray-600">失敗</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {report.data.ipAnalysis.uniqueIPs}
                        </div>
                        <div className="text-xs text-gray-600">ユニークIP</div>
                      </div>
                    </div>

                    {report.data.recommendations.length > 0 && (
                      <div className="border-t pt-4">
                        <h5 className="font-medium text-gray-900 mb-2">推奨事項:</h5>
                        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                          {report.data.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {reports.length === 0 && (
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                  まだレポートが生成されていません。<br />
                  上のボタンから初回レポートを生成してください。
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}