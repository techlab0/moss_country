'use client';

import { useState, Suspense, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function Verify2FAContent() {
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const code = useBackupCode ? backupCode : verificationCode;
      const response = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code,
          isBackupCode: useBackupCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const redirectTo = searchParams.get('redirect') || '/admin/dashboard';
        router.push(redirectTo);
        router.refresh();
      } else {
        setError(data.error || '認証に失敗しました');
      }
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            二段階認証
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            認証アプリからコードを入力してください
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {!useBackupCode ? (
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-2xl font-mono tracking-widest"
                placeholder="123456"
                disabled={isLoading}
                required
              />
            </div>
          ) : (
            <div>
              <label htmlFor="backup-code" className="block text-sm font-medium text-gray-700 mb-2">
                バックアップコード (8桁)
              </label>
              <input
                id="backup-code"
                type="text"
                maxLength={8}
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-xl font-mono tracking-widest"
                placeholder="12345678"
                disabled={isLoading}
                required
              />
            </div>
          )}

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setUseBackupCode(!useBackupCode)}
              className="text-sm text-moss-green hover:text-moss-green/80 underline"
            >
              {useBackupCode ? '認証アプリを使用' : 'バックアップコードを使用'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || (!useBackupCode && verificationCode.length !== 6) || (useBackupCode && backupCode.length !== 8)}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-moss-green hover:bg-moss-green/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-moss-green disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '認証中...' : '認証する'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/admin/login"
              className="font-medium text-gray-600 hover:text-gray-500"
            >
              ← ログイン画面に戻る
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Verify2FAPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"><div className="text-lg">読み込み中...</div></div>}>
      <Verify2FAContent />
    </Suspense>
  );
}