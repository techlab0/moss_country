'use client';

import { useState, useEffect } from 'react';

const UsersAdvancedPage = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">高度なユーザー管理</h1>
          <p className="text-gray-600 mt-2">ユーザーの権限・セキュリティ・活動状況を管理</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-medium">👤</span>
              </div>
              <div className="ml-5">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">総ユーザー数</dt>
                  <dd className="text-lg font-medium text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-medium">✓</span>
              </div>
              <div className="ml-5">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">アクティブユーザー</dt>
                  <dd className="text-lg font-medium text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-medium">🔒</span>
              </div>
              <div className="ml-5">
                <dl>
                  <dt className="text-sm font-medium text-gray-500">2FA有効ユーザー</dt>
                  <dd className="text-lg font-medium text-gray-900">0</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            ユーザー管理機能
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">権限管理</h4>
              <p className="text-sm text-gray-600 mb-4">
                ユーザーの役割と権限を管理します
              </p>
              <button className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                権限設定
              </button>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">一括操作</h4>
              <p className="text-sm text-gray-600 mb-4">
                複数ユーザーの一括管理を行います
              </p>
              <button className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">
                一括操作
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersAdvancedPage;