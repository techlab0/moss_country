'use client';

import { useEffect, useState } from 'react';

interface ConfigStatus {
  isValid: boolean;
  missingVariables: string[];
  warnings: string[];
}

export default function ProductionCheckPage() {
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkConfig() {
      try {
        const response = await fetch('/api/admin/config-check');
        const data = await response.json();
        setConfigStatus(data);
      } catch (error) {
        console.error('Failed to check config:', error);
      } finally {
        setLoading(false);
      }
    }
    
    checkConfig();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">設定をチェック中...</div>
        </div>
      </div>
    );
  }

  if (!configStatus) {
    return (
      <div className="min-h-screen bg-gray-100 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center text-red-600">設定チェックに失敗しました</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-20">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">本番環境設定チェック</h1>
        
        <div className="space-y-6">
          {/* 全体ステータス */}
          <div className={`p-6 rounded-lg ${configStatus.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h2 className={`text-xl font-semibold mb-2 ${configStatus.isValid ? 'text-green-800' : 'text-red-800'}`}>
              {configStatus.isValid ? '✅ 設定完了' : '❌ 設定不完全'}
            </h2>
            <p className={configStatus.isValid ? 'text-green-700' : 'text-red-700'}>
              {configStatus.isValid 
                ? '本番環境に移行可能です' 
                : '不足している環境変数があります'}
            </p>
          </div>

          {/* 不足している変数 */}
          {configStatus.missingVariables.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-3">❌ 不足している必須環境変数</h3>
              <ul className="space-y-2">
                {configStatus.missingVariables.map((variable) => (
                  <li key={variable} className="text-red-700 font-mono bg-red-100 px-2 py-1 rounded">
                    {variable}
                  </li>
                ))}
              </ul>
              <div className="mt-4 text-sm text-red-600">
                <p>これらの環境変数をVercelダッシュボードで設定してください。</p>
              </div>
            </div>
          )}

          {/* 警告 */}
          {configStatus.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">⚠️ 警告・推奨設定</h3>
              <ul className="space-y-2">
                {configStatus.warnings.map((warning, index) => (
                  <li key={index} className="text-yellow-700">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 現在の環境情報 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">📊 現在の環境情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Node環境:</span>
                <span className="ml-2 font-mono">{process.env.NODE_ENV}</span>
              </div>
              <div>
                <span className="font-medium">Vercel環境:</span>
                <span className="ml-2 font-mono">{process.env.VERCEL_ENV || 'local'}</span>
              </div>
            </div>
          </div>

          {/* 次のステップ */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">📋 本番移行チェックリスト</h3>
            <div className="space-y-3">
              <div className={`flex items-center ${configStatus.isValid ? 'text-green-600' : 'text-gray-500'}`}>
                <span className="mr-2">{configStatus.isValid ? '✅' : '☐'}</span>
                <span>必須環境変数の設定</span>
              </div>
              <div className="flex items-center text-gray-500">
                <span className="mr-2">☐</span>
                <span>Sanity Studio本番データの投入</span>
              </div>
              <div className="flex items-center text-gray-500">
                <span className="mr-2">☐</span>
                <span>Square決済の本番設定</span>
              </div>
              <div className="flex items-center text-gray-500">
                <span className="mr-2">☐</span>
                <span>EmailJSお問い合わせフォームの設定</span>
              </div>
              <div className="flex items-center text-gray-500">
                <span className="mr-2">☐</span>
                <span>ドメインの設定（カスタムドメイン）</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}