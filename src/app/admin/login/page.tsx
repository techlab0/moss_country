'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ButtonLoading } from '@/components/ui/LoadingScreen';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full px-3 py-2 pr-12 border border-gray-300 rounded-md placeholder-gray-600 text-gray-900 focus:outline-none focus:ring-moss-green focus:border-moss-green focus:z-10 text-base"
                placeholder="パスワード"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={isLoading}
                tabIndex={-1}
                aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                title={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                className="absolute inset-y-0 right-0 z-20 flex items-center px-3 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showPassword ? (
                  // 目に斜線（非表示にする）
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  // 目（表示する）
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
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
          <Link
            href="/"
            className="font-semibold text-base text-moss-green hover:text-moss-green/80"
          >
            ← サイトに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}