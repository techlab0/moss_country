'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface SetupData {
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
}

export default function Setup2FAPage() {
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const router = useRouter();

  useEffect(() => {
    generateSetup();
  }, []);

  const generateSetup = async () => {
    try {
      const response = await fetch('/api/admin/2fa/setup', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setSetupData(data);
      } else {
        setError('2FA設定の生成に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const verifySetup = async () => {
    if (!verificationCode || !setupData) return;
    
    setIsVerifying(true);
    setError('');

    try {
      const response = await fetch('/api/admin/2fa/verify-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: verificationCode,
          secret: setupData.secret,
        }),
      });

      if (response.ok) {
        setStep('backup');
      } else {
        const data = await response.json();
        setError(data.error || '認証コードが正しくありません');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsVerifying(false);
    }
  };

  const completSetup = async () => {
    try {
      const response = await fetch('/api/admin/2fa/complete-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: setupData?.secret,
          backupCodes: setupData?.backupCodes,
        }),
      });

      if (response.ok) {
        router.push('/admin/dashboard');
      } else {
        setError('2FA設定の完了に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-lg">2FA設定を準備中...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            二段階認証の設定
          </h1>

          {step === 'setup' && setupData && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-blue-800">
                  ステップ1: 認証アプリでQRコードをスキャン
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Google Authenticator、Authy、1Password等の認証アプリでQRコードをスキャンしてください。
                </p>
              </div>

              <div className="text-center">
                <img
                  src={setupData.qrCodeUrl}
                  alt="2FA QR Code"
                  className="mx-auto border rounded-lg"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  手動設定用シークレットキー:
                </h4>
                <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                  {setupData.secret}
                </code>
              </div>

              <button
                onClick={() => setStep('verify')}
                className="w-full bg-moss-green text-white py-2 px-4 rounded-md hover:bg-moss-green/90"
              >
                次へ進む
              </button>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-yellow-800">
                  ステップ2: 認証コードを入力
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  認証アプリに表示されている6桁のコードを入力してください。
                </p>
              </div>

              <div>
                <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 mb-2">
                  認証コード (6桁)
                </label>
                <input
                  id="verification-code"
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-lg font-mono"
                  placeholder="123456"
                  disabled={isVerifying}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={() => setStep('setup')}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  戻る
                </button>
                <button
                  onClick={verifySetup}
                  disabled={verificationCode.length !== 6 || isVerifying}
                  className="flex-1 bg-moss-green text-white py-2 px-4 rounded-md hover:bg-moss-green/90 disabled:opacity-50"
                >
                  {isVerifying ? '確認中...' : '確認'}
                </button>
              </div>
            </div>
          )}

          {step === 'backup' && setupData && (
            <div className="space-y-6">
              <div className="bg-red-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-red-800">
                  ステップ3: バックアップコードの保存
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  認証アプリが利用できない場合に使用できるバックアップコードです。
                  安全な場所に保存してください。
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  バックアップコード:
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {setupData.backupCodes.map((code, index) => (
                    <code key={index} className="text-sm font-mono bg-white px-3 py-2 rounded border">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-md">
                <p className="text-sm text-yellow-700">
                  ⚠️ これらのコードは一度しか表示されません。必ず安全な場所に保存してください。
                </p>
              </div>

              <button
                onClick={completSetup}
                className="w-full bg-moss-green text-white py-3 px-4 rounded-md hover:bg-moss-green/90 font-medium"
              >
                2FA設定を完了する
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}