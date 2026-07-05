'use client';

import { DashboardStats } from '@/components/admin/DashboardStats';
import { RecentOrders } from '@/components/admin/RecentOrders';
import { InventoryAlerts } from '@/components/admin/InventoryAlerts';
import { CurrentUserInfo } from '@/components/admin/CurrentUserInfo';
import { SecurityAlertsSummary } from '@/components/admin/SecurityAlertsSummary';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
            <p className="text-gray-700 mt-2 text-base font-medium">MOSS COUNTRY 管理画面へようこそ</p>
          </div>
          <Link
            href="/admin/sales"
            className="inline-flex items-center gap-2 px-5 py-3 bg-moss-green text-white text-base font-semibold rounded-lg shadow hover:bg-moss-green/90 transition-colors"
          >
            💰 売上を入力する
          </Link>
        </div>

        {/* 統計情報 */}
        <DashboardStats />
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* セキュリティアラート */}
          <SecurityAlertsSummary />
          
          {/* 現在のユーザー情報 */}
          <CurrentUserInfo />
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* 最近の注文 */}
          <RecentOrders />
          
          {/* 在庫アラート */}
          <InventoryAlerts />
        </div>

        {/* ブログ・コンテンツ管理セクション */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* ブログ管理 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">ブログ・ニュース管理</h3>
                <div className="text-2xl">📝</div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                ブログ記事、ニュース、お知らせの投稿・編集ができます
              </p>
              <div className="space-y-2">
                <Link
                  href="/admin/cms"
                  className="block w-full px-4 py-2 text-center bg-moss-green text-white rounded-md hover:bg-moss-green/90 transition-colors text-sm font-medium"
                >
                  記事の投稿・編集
                </Link>
                <Link
                  href="/blog"
                  target="_blank"
                  className="block w-full px-4 py-2 text-center border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                >
                  公開ページを確認
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* カレンダー管理 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">カレンダー管理</h3>
                <div className="text-2xl">📅</div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                営業日・休業日・イベント出店の管理
              </p>
              <div className="space-y-2">
                <Link
                  href="/admin/calendar"
                  className="block w-full px-4 py-2 text-center bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium"
                >
                  カレンダー編集
                </Link>
                <Link
                  href="/store"
                  target="_blank"
                  className="block w-full px-4 py-2 text-center border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                >
                  店舗ページで確認
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* FAQ管理 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">FAQ管理</h3>
                <div className="text-2xl">❓</div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                よくあるご質問の追加・編集・削除
              </p>
              <div className="space-y-2">
                <Link
                  href="/admin/faqs"
                  className="block w-full px-4 py-2 text-center bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  FAQ編集
                </Link>
                <Link
                  href="/store#faq"
                  target="_blank"
                  className="block w-full px-4 py-2 text-center border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                >
                  店舗ページで確認
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 画像管理 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">画像管理</h3>
                <div className="text-2xl">🖼️</div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                各ページのヒーロー画像・背景画像の管理
              </p>
              <div className="space-y-2">
                <Link
                  href="/admin/images"
                  className="block w-full px-4 py-2 text-center bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  画像編集
                </Link>
                <Link
                  href="/"
                  target="_blank"
                  className="block w-full px-4 py-2 text-center border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                >
                  サイトで確認
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}