'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  value: string;
  description: string;
  postCount: number;
}

interface CategoryStats {
  category: string;
  count: number;
}

const CATEGORY_DEFINITIONS = [
  {
    id: '1',
    name: 'お知らせ',
    value: 'news',
    description: '新商品やイベントなどのお知らせ',
  },
  {
    id: '2',
    name: 'テラリウムの作り方',
    value: 'howto',
    description: 'テラリウム制作のガイドやチュートリアル',
  },
  {
    id: '3',
    name: '植物について',
    value: 'plants',
    description: '植物の特徴や育て方について',
  },
  {
    id: '4',
    name: 'メンテナンス',
    value: 'maintenance',
    description: 'テラリウムのお手入れ方法',
  },
  {
    id: '5',
    name: 'イベント',
    value: 'events',
    description: 'ワークショップや展示会の情報',
  },
  {
    id: '6',
    name: 'その他',
    value: 'other',
    description: 'その他の記事',
  },
];

export default function BlogCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategoryStats();
  }, []);

  const fetchCategoryStats = async () => {
    try {
      const response = await fetch('/api/admin/blog/categories/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch category stats');
      }
      const stats: CategoryStats[] = await response.json();
      
      // カテゴリ定義と実際の統計を結合
      const categoriesWithStats = CATEGORY_DEFINITIONS.map(def => {
        const stat = stats.find(s => s.category === def.value);
        return {
          ...def,
          postCount: stat ? stat.count : 0,
        };
      });
      
      setCategories(categoriesWithStats);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch category stats:', error);
      // エラー時はデフォルト値を使用
      setCategories(CATEGORY_DEFINITIONS.map(def => ({ ...def, postCount: 0 })));
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ブログカテゴリ管理</h1>
          <p className="text-gray-600 mt-2">記事のカテゴリ設定と管理</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/blog"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-xs text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            ← ブログ管理に戻る
          </Link>
        </div>
      </div>

      {/* カテゴリ一覧 */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium">カテゴリ一覧</h2>
              <p className="text-sm text-gray-600 mt-1">
                現在のカテゴリはSanity CMSのスキーマで定義されています
              </p>
            </div>
            <button
              onClick={fetchCategoryStats}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? '読込中...' : '🔄 更新'}
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  カテゴリ名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  識別子
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  説明
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  記事数
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-moss-green"></div>
                    </div>
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {category.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded-sm">
                        {category.value}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {category.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {category.postCount}件
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/blog?filter=${category.value}`}
                        className="text-moss-green hover:text-moss-green/80"
                      >
                        記事を表示
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 設定情報 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex">
          <div className="shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              カテゴリの編集について
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                カテゴリの追加・編集・削除はSanity CMSのスキーマファイルで行います。
                カテゴリを変更する場合は、開発者にお問い合わせください。
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>ファイル場所: <code className="bg-blue-100 px-1 rounded-sm">sanity/schemas/blogPost.ts</code></li>
                <li>変更後は、Sanity Studioの再起動が必要です</li>
                <li>既存記事のカテゴリも確認・更新してください</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* カテゴリ別記事数グラフ */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">カテゴリ別記事数</h3>
        <div className="space-y-4">
          {categories.map((category) => {
            const maxCount = Math.max(...categories.map(c => c.postCount));
            const percentage = (category.postCount / maxCount) * 100;
            
            return (
              <div key={category.id} className="flex items-center">
                <div className="w-32 text-sm font-medium text-gray-900">
                  {category.name}
                </div>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-moss-green h-3 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-12 text-sm text-gray-600 text-right">
                  {category.postCount}件
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* クイックアクション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-2">📝 新記事作成</h3>
          <p className="text-gray-600 text-sm mb-4">カテゴリを指定して新しい記事を作成</p>
          <Link
            href="/admin/cms/structure/blogPost"
            target="_blank"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-moss-green hover:bg-moss-green/90 w-full justify-center"
          >
            記事を作成
          </Link>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-2">📊 記事管理</h3>
          <p className="text-gray-600 text-sm mb-4">すべての記事を確認・管理</p>
          <Link
            href="/admin/blog"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 w-full justify-center"
          >
            記事一覧を見る
          </Link>
        </div>
      </div>
    </div>
  );
}