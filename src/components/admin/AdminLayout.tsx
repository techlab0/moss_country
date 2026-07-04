'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navigation = [
  { name: 'ダッシュボード', href: '/admin/dashboard', icon: '📊' },
  { name: '注文管理', href: '/admin/orders', icon: '📦' },
  { name: '売上管理', href: '/admin/sales', icon: '💰' },
  { name: '在庫管理', href: '/admin/inventory', icon: '📋' },
  { name: '商品管理', href: '/admin/products', icon: '🌱' },
  { name: 'ブログ・ニュース管理', href: '/admin/blog', icon: '📝' },
  { name: 'カレンダー管理', href: '/admin/calendar', icon: '📅' },
  { name: 'FAQ管理', href: '/admin/faqs', icon: '❓' },
  { name: '苔図鑑管理', href: '/admin/moss-guide', icon: '🍃' },
  { name: '画像管理', href: '/admin/images', icon: '🖼️' },
  { name: 'お問い合わせ管理', href: '/admin/contacts', icon: '📧' },
  { name: '顧客管理', href: '/admin/customers', icon: '👥' },
  { name: 'ユーザー管理', href: '/admin/users', icon: '👤' },
  { name: '高度なユーザー管理', href: '/admin/users-advanced', icon: '👥' },
  { name: 'セキュリティアラート', href: '/admin/security-alerts', icon: '🚨' },
  { name: '高度なセキュリティ', href: '/admin/security-advanced', icon: '🛡️' },
  { name: '監査ログ', href: '/admin/audit-logs', icon: '🔍' },
  { name: 'データベース最適化', href: '/admin/database', icon: '🗄️' },
  { name: '詳細CMS', href: '/admin/cms', icon: '⚙️' },
  { name: '2FA設定', href: '/admin/setup-2fa', icon: '🔐' },
  { name: 'サイト設定', href: '/admin/settings', icon: '⚙️' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
      });
      router.push('/admin/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
    >
      {isLoading ? 'ログアウト中...' : 'ログアウト'}
    </button>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isAuthPage = pathname === '/admin/login' || pathname === '/admin/verify-2fa';

  useEffect(() => {
    // 管理画面用のCSSクラスを追加
    document.body.classList.add('admin-layout');
    
    // クリーンアップ関数
    return () => {
      document.body.classList.remove('admin-layout');
    };
  }, []);

  // ログイン/2FA画面では管理メニュー等を表示しない
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* サイドバー */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:relative lg:z-auto lg:transform-none ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 overflow-y-auto`}>
        <div className="flex items-center justify-center h-16 bg-moss-green">
          <Link href="/" className="text-white text-xl font-bold">
            MOSS COUNTRY
          </Link>
        </div>
        
        <nav className="mt-8 px-4 pb-6">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center px-4 py-2 text-base font-semibold rounded-md transition-colors ${
                      isActive
                        ? 'bg-moss-green text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* モバイル用オーバーレイ */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* メインコンテンツエリア（横はみ出しは非表示） */}
      <div className="flex flex-col flex-1 min-w-0 min-h-screen overflow-x-hidden">
        {/* ヘッダー */}
        <header className="relative z-10 bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  type="button"
                  className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <span className="sr-only">メニューを開く</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-base text-gray-700 font-medium">
                  管理者モード
                </div>
                <Link
                  href="/admin/change-password"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-semibold rounded-md text-gray-800 bg-white hover:bg-gray-50 transition-colors"
                >
                  🔑 パスワード変更
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-semibold rounded-md text-gray-800 bg-white hover:bg-gray-50 transition-colors"
                >
                  サイトを表示
                </Link>
                <LogoutButton />
              </div>
            </div>
          </div>
        </header>

        {/* メインコンテンツ（はみ出し部分は非表示） */}
        <main className="flex-1 px-6 py-8 bg-gray-50 overflow-x-hidden min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}