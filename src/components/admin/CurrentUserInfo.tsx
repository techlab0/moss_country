'use client';

import React, { useEffect, useState } from 'react';

interface CurrentUser {
  id: string;
  email: string;
  role: string;
  lastLogin?: string;
  twoFactorEnabled: boolean;
}

export function CurrentUserInfo() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/admin/current-user');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      } else {
        setError('ユーザー情報の取得に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded mb-4"></div>
        <div className="h-6 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </div>
    );
  }

  if (error || !currentUser) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">現在のユーザー</h3>
        <p className="text-red-600">{error || 'ユーザー情報を取得できませんでした'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">現在のユーザー</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">メールアドレス:</span>
          <span className="text-sm font-medium text-gray-900">{currentUser.email}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">役割:</span>
          <span className={`text-sm font-medium px-2 py-1 rounded-full text-xs ${
            currentUser.role === 'admin' 
              ? 'bg-red-100 text-red-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {currentUser.role === 'admin' ? '管理者' : '編集者'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">二段階認証:</span>
          <span className={`text-sm font-medium ${
            currentUser.twoFactorEnabled ? 'text-green-600' : 'text-gray-600'
          }`}>
            {currentUser.twoFactorEnabled ? '有効' : '無効'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">最終ログイン:</span>
          <span className="text-sm font-medium text-gray-900">
            {currentUser.lastLogin 
              ? new Date(currentUser.lastLogin).toLocaleString('ja-JP')
              : '未ログイン'
            }
          </span>
        </div>
      </div>
    </div>
  );
}