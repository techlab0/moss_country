import React from 'react';
import Link from 'next/link';

interface CMSLayoutProps {
  children: React.ReactNode;
}

export default function CMSLayout({ children }: CMSLayoutProps) {
  return (
    <div className="min-h-screen">
      {/* バックリンク */}
      <div className="bg-moss-green text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center text-white hover:text-gray-200 transition-colors"
          >
            ← 管理画面に戻る
          </Link>
          <span className="text-sm opacity-75">詳細CMS管理 (Sanity Studio)</span>
        </div>
        <div className="text-sm opacity-75">
          開発者向け高度設定
        </div>
      </div>
      {children}
    </div>
  );
}