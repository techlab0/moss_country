'use client';

import { useState } from 'react';

const Setup2FAPage = () => {
  const [loading, setLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setSetupComplete(true);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          二段階認証の設定
        </h1>

        {!setupComplete ? (
          <div className="space-y-6">
            <div className="text-sm text-gray-600">
              セキュリティを強化するために二段階認証を設定してください。
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">SMS認証</h3>
              <p className="text-sm text-gray-600 mb-4">
                携帯電話のSMSで認証コードを受け取ります
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    電話番号
                  </label>
                  <input
                    type="tel"
                    placeholder="090-1234-5678"
                    className="block w-full border-gray-300 rounded-md shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Google Authenticator</h3>
              <p className="text-sm text-gray-600 mb-4">
                スマートフォンアプリで認証コードを生成します
              </p>
              
              <div className="bg-gray-100 p-4 rounded text-center">
                <div className="text-sm text-gray-600">QRコードがここに表示されます</div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSetup}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '設定中...' : '2FAを有効にする'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-green-600 text-4xl mb-4">✓</div>
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              二段階認証が有効になりました
            </h2>
            <p className="text-gray-600">
              今後のログインでは認証コードが必要になります
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Setup2FAPage;