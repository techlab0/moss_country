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

// 管理画面ではサイト用ヘッダーを表示しないため、サイト内ページへはこのメニューから移動する
const siteNavigation = [
  { name: 'ホーム', href: '/', icon: '🏠' },
  { name: '商品', href: '/products', icon: '🛍️' },
  { name: '苔図鑑', href: '/moss-guide', icon: '📗' },
  { name: 'ワークショップ', href: '/workshop', icon: '🧑‍🏫' },
  { name: 'ブログ', href: '/blog', icon: '✍️' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

function LogoutButton({ className }: { className?: string }) {
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
      className={className || 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50'}
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

  // ページ遷移時にモバイルのドロワーを閉じる
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // ログイン/2FA画面では管理メニュー等を表示しない
  if (isAuthPage) {
    return <>{children}</>;
  }

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* サイドバー（モバイルではハンバーガーで開くドロワー） */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:relative lg:z-auto lg:transform-none lg:w-64 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 overflow-y-auto flex flex-col`}>
        <div className="flex items-center justify-between h-16 bg-moss-green px-4 shrink-0">
          <Link href="/admin/dashboard" className="text-white text-xl font-bold" onClick={closeSidebar}>
            MOSS COUNTRY
          </Link>
          <button
            type="button"
            className="lg:hidden p-2 text-white/80 hover:text-white"
            onClick={closeSidebar}
          >
            <span className="sr-only">メニューを閉じる</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="mt-4 px-4 pb-6 flex-1">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={closeSidebar}
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

          {/* サイトのページへ */}
          <p className="mt-6 mb-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">サイトのページ</p>
          <ul className="space-y-1">
            {siteNavigation.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={closeSidebar}
                  className="flex items-center px-4 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>

          {/* アカウント操作（デスクトップでは上部バーにあるため、ドロワー内はモバイルのみ表示） */}
          <div className="lg:hidden mt-6 pt-4 border-t border-gray-200 space-y-2">
            <Link
              href="/admin/change-password"
              onClick={closeSidebar}
              className="flex items-center px-4 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <span className="mr-3 text-lg">🔑</span>
              パスワード変更
            </Link>
            <LogoutButton className="w-full flex items-center justify-center px-4 py-2.5 text-base font-semibold rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50" />
          </div>
        </nav>
      </div>

      {/* モバイル用オーバーレイ */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* メインコンテンツエリア（横はみ出しは非表示） */}
      <div className="flex flex-col flex-1 min-w-0 min-h-screen overflow-x-hidden">
        {/* ヘッダー */}
        <header className="relative z-10 bg-white shadow-sm border-b">
          <div className="px-4 lg:px-6 py-3 lg:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
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
                {/* モバイルではサイト用ヘッダーを出さないため、ここがページの唯一のタイトルになる */}
                <span className="lg:hidden text-base font-bold text-gray-900">MOSS COUNTRY 管理</span>
              </div>

              {/* アカウント操作はデスクトップのみ表示（モバイルはドロワー内に集約） */}
              <div className="hidden lg:flex items-center space-x-4">
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
        <main className="flex-1 px-4 lg:px-6 py-6 lg:py-8 bg-gray-50 overflow-x-hidden min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
