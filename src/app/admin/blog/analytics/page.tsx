'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { BlogPost } from '@/types/sanity';

interface BlogStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  categoryStats: { category: string; count: number; label: string }[];
  recentPosts: BlogPost[];
  tagsStats: { tag: string; count: number }[];
}

export default function BlogAnalyticsPage() {
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/blog/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const data = await response.json();
      setStats(data);
      setLoading(false);
    } catch (error) {
      console.error('統計データの取得に失敗:', error);
      setLoading(false);
    }
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'news':
        return { label: 'お知らせ', color: 'bg-green-100 text-green-800' };
      case 'howto':
        return { label: 'テラリウムの作り方', color: 'bg-blue-100 text-blue-800' };
      case 'plants':
        return { label: '植物について', color: 'bg-green-100 text-green-800' };
      case 'maintenance':
        return { label: 'メンテナンス', color: 'bg-orange-100 text-orange-800' };
      case 'events':
        return { label: 'イベント', color: 'bg-purple-100 text-purple-800' };
      case 'other':
        return { label: 'その他', color: 'bg-gray-100 text-gray-800' };
      default:
        return { label: '未分類', color: 'bg-gray-100 text-gray-800' };
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">ブログ統計</h1>
          <Link
            href="/admin/blog"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            ← ブログ管理に戻る
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">統計データの取得に失敗しました</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ブログ統計</h1>
          <p className="text-gray-600 mt-2">記事の投稿状況とカテゴリ別統計</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchStats}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            🔄 更新
          </button>
          <Link
            href="/admin/blog"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            ← ブログ管理に戻る
          </Link>
        </div>
      </div>

      {/* 概要統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-moss-green rounded-md flex items-center justify-center">
                <span className="text-white font-medium text-sm">📝</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">総記事数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPosts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <span className="text-white font-medium text-sm">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">公開済み</p>
              <p className="text-2xl font-bold text-gray-900">{stats.publishedPosts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                <span className="text-white font-medium text-sm">📄</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">下書き</p>
              <p className="text-2xl font-bold text-gray-900">{stats.draftPosts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* カテゴリ別統計 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium text-gray-900">カテゴリ別記事数</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.categoryStats.map((category) => {
              const config = getCategoryConfig(category.category);
              return (
                <div key={category.category} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">{category.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 人気タグ */}
      {stats.tagsStats.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-medium text-gray-900">よく使われるタグ</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-3">
              {stats.tagsStats.slice(0, 20).map((tagStat) => (
                <span
                  key={tagStat.tag}
                  className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                >
                  {tagStat.tag}
                  <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    {tagStat.count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 最近の記事 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium text-gray-900">最近の記事</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {stats.recentPosts.slice(0, 5).map((post) => {
            const categoryConfig = getCategoryConfig(post.category);
            return (
              <div key={post._id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                      {post.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${categoryConfig.color}`}>
                        {categoryConfig.label}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        post.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {post.isPublished ? '公開中' : '下書き'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(post.publishedAt).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      href={`/blog/${post.slug?.current}`}
                      target="_blank"
                      className="text-moss-green hover:text-moss-green/80 text-sm"
                    >
                      確認
                    </Link>
                    <Link
                      href={`/admin/blog/${post._id}/edit`}
                      className="text-blue-600 hover:text-blue-500 text-sm"
                    >
                      編集
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}