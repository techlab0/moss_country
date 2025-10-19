'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/layout/Container';

export function MaintenancePage() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/maintenance/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        // パスワードが正しい場合、ページをリロード
        window.location.reload();
      } else {
        setError('パスワードが正しくありません');
      }
    } catch (error) {
      setError('認証に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage: `url('/images/misc/moss01.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/50" />
      
      <Container className="relative z-10">
        <div className="max-w-md mx-auto">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
            {/* ロゴ */}
            <div className="text-center mb-8">
              <div className="text-moss-green text-4xl font-bold mb-2">
                MOSS COUNTRY
              </div>
              <div className="text-gray-600 text-sm">
                モスカントリー
              </div>
            </div>

            {/* メンテナンス情報 */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🔧</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                メンテナンス中
              </h1>
              <p className="text-gray-600 mb-4">
                現在、サイトのメンテナンスを行っております。<br />
                ご不便をおかけして申し訳ございません。
              </p>
              <p className="text-sm text-gray-500">
                関係者の方は下記パスワードを入力してください
              </p>
            </div>

            {/* パスワード入力フォーム */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  パスワード
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-moss-green focus:border-transparent"
                  placeholder="パスワードを入力してください"
                  required
                />
              </div>
              
              {error && (
                <div className="text-red-600 text-sm text-center">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-moss-green hover:bg-moss-green/90 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50"
              >
                {isLoading ? '認証中...' : 'サイトに入る'}
              </Button>
            </form>

            {/* お問い合わせ情報 */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600 mb-2">
                お急ぎの方はお電話にてお問い合わせください
              </p>
              <a 
                href="tel:080-3605-6340" 
                className="text-moss-green hover:underline font-medium"
              >
                080-3605-6340
              </a>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}