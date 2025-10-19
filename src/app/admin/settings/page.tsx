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
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

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

  const handleSaveSettings = async () => {
    if (!maintenanceSettings.password.trim()) {
      setMessage('メンテナンスパスワードを入力してください');
      setMessageType('error');
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/maintenance/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(maintenanceSettings),
      });

      if (response.ok) {
        setMessage('設定を保存しました');
        setMessageType('success');
      } else {
        const data = await response.json();
        setMessage(data.error || '設定の保存に失敗しました');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('設定の保存に失敗しました');
      setMessageType('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-moss-green"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">サイト設定</h1>
            <p className="text-gray-600 mt-2">サイトの基本設定を管理します</p>
          </div>

          {message && (
            <div className={`p-4 rounded-md mb-6 ${
              messageType === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* メンテナンスモード設定 */}
          <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">メンテナンスモード</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                <div>
                  <h3 className="font-medium text-gray-900">メンテナンスモード</h3>
                  <p className="text-sm text-gray-600">
                    有効にすると、パスワードを入力したユーザーのみサイトにアクセスできます
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={maintenanceSettings.isEnabled}
                    onChange={(e) => setMaintenanceSettings({
                      ...maintenanceSettings,
                      isEnabled: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-moss-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-moss-green"></div>
                </label>
              </div>

              <div>
                <label htmlFor="maintenance-password" className="block text-sm font-medium text-gray-700 mb-2">
                  メンテナンスパスワード
                </label>
                <input
                  type="password"
                  id="maintenance-password"
                  value={maintenanceSettings.password}
                  onChange={(e) => setMaintenanceSettings({
                    ...maintenanceSettings,
                    password: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-moss-green focus:border-transparent"
                  placeholder="メンテナンスパスワードを入力"
                />
                <p className="text-sm text-gray-500 mt-1">
                  メンテナンス中にサイトにアクセスするためのパスワードです
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="bg-moss-green hover:bg-moss-green/90 text-white px-6 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '設定を保存'}
              </Button>
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
    </AdminLayout>
  );
}