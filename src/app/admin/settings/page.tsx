'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/layout/Container';

type MaintenanceSettings = {
  isEnabled: boolean;
  password: string;
};

export default function SettingsPage() {
  const [maintenanceSettings, setMaintenanceSettings] = useState<MaintenanceSettings>({
    isEnabled: false,
    password: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMaintenanceSettings();
  }, []);

  const fetchMaintenanceSettings = async () => {
    try {
      const response = await fetch('/api/admin/maintenance/settings');
      if (response.ok) {
        const data = await response.json();
        setMaintenanceSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch maintenance settings:', error);
    } finally {
      setIsLoading(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-moss-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">サイト設定</h1>
            <p className="text-gray-600 mt-2">サイトの基本設定を管理します</p>
          </div>


          {/* メンテナンスモード設定 */}
          <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">メンテナンスモード</h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-yellow-600">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    本番環境での設定方法
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>メンテナンスモードを有効にするには、Vercelダッシュボードで以下の環境変数を設定してください：</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><code className="bg-yellow-100 px-2 py-1 rounded">MAINTENANCE_MODE=true</code></li>
                      <li><code className="bg-yellow-100 px-2 py-1 rounded">MAINTENANCE_PASSWORD=your-password</code></li>
                    </ul>
                    <p className="mt-2">設定後、デプロイメントを再実行してください。</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md bg-gray-50">
                <div>
                  <h3 className="font-medium text-gray-900">メンテナンスモード</h3>
                  <p className="text-sm text-gray-600">
                    現在の状態: {maintenanceSettings.isEnabled ? 'メンテナンス中' : '通常運用中'}
                  </p>
                </div>
                <div className={`w-11 h-6 rounded-full flex items-center px-1 ${
                  maintenanceSettings.isEnabled ? 'bg-yellow-500' : 'bg-green-500'
                }`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    maintenanceSettings.isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}></div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メンテナンスパスワード
                </label>
                <input
                  type="password"
                  value={maintenanceSettings.password}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  placeholder={maintenanceSettings.password ? '設定済み' : '未設定'}
                />
                <p className="text-sm text-gray-500 mt-1">
                  メンテナンス中にサイトにアクセスするためのパスワードです（読み取り専用）
                </p>
              </div>
            </div>
          </div>

          {/* 現在の状態表示 */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">現在の状態</h3>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                maintenanceSettings.isEnabled ? 'bg-yellow-500' : 'bg-green-500'
              }`}></div>
              <span className="text-gray-900 font-medium">
                {maintenanceSettings.isEnabled ? 'メンテナンス中' : '公開中'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {maintenanceSettings.isEnabled 
                ? 'サイトはメンテナンスモードです。一般ユーザーはアクセスできません。'
                : 'サイトは通常運用中です。すべてのユーザーがアクセスできます。'
              }
            </p>
        </div>
    </div>
  );
}