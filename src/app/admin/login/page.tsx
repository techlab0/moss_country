'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ButtonLoading } from '@/components/ui/LoadingScreen';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiresTwoFactor) {
          // 2FA認証が必要な場合
          router.push('/admin/verify-2fa');
        } else {
          // 通常のログイン成功
          router.push('/admin/dashboard');
          router.refresh(); // セッション情報を更新
        }
      } else {
        setError(data.error || 'ログインに失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            MOSS COUNTRY
          </h2>
          <p className="mt-2 text-center text-lg text-gray-800 font-semibold">
            管理画面ログイン
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-600 text-gray-900 focus:outline-none focus:ring-moss-green focus:border-moss-green focus:z-10 text-base"
                placeholder="メールアドレス"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-600 text-gray-900 focus:outline-none focus:ring-moss-green focus:border-moss-green focus:z-10 text-base"
                placeholder="パスワード"
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-base font-medium">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-md text-white bg-moss-green hover:bg-moss-green/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-moss-green disabled:opacity-50 disabled:cursor-not-allowed"
            >
{isLoading ? (
                <>
                  <ButtonLoading />
                  ログイン中...
                </>
              ) : (
                'ログイン'
              )}
            </button>
          </div>
        </form>

        <div className="text-center">
          <a
            href="/"
            className="font-semibold text-base text-moss-green hover:text-moss-green/80"
          >
            ← サイトに戻る
          </a>
        </div>
      </div>
    </div>
  );
}