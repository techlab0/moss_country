'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { BlogPost } from '@/types/sanity';

interface AdminBlogPost extends BlogPost {
  _createdAt?: string;
  _updatedAt?: string;
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/admin/blog');
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      const postsData = await response.json();
      setPosts(postsData);
      setLoading(false);
    } catch (error) {
      console.error('ブログ記事の取得に失敗:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('この記事を削除しますか？')) return;
    
    try {
      const response = await fetch(`/api/admin/blog/${postId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete post');
      }
      
      // リストから削除
      setPosts(posts.filter(post => post._id !== postId));
    } catch (error) {
      console.error('記事の削除に失敗:', error);
      alert('記事の削除に失敗しました');
    }
  };

  const handleTogglePublish = async (postId: string, currentStatus: boolean) => {
    try {
      const action = currentStatus ? 'unpublish' : 'publish';
      const response = await fetch(`/api/admin/blog/${postId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update publish status');
      }
      
      const updatedPost = await response.json();
      
      // リストを更新
      setPosts(posts.map(post => 
        post._id === postId 
          ? { ...post, isPublished: updatedPost.isPublished, publishedAt: updatedPost.publishedAt }
          : post
      ));
    } catch (error) {
      console.error('公開状態の変更に失敗:', error);
      alert('公開状態の変更に失敗しました');
    }
  };

  const getCategoryConfig = (category: string | undefined) => {
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

  const getStatusConfig = (isPublished: boolean) => {
    return isPublished 
      ? { label: '公開中', color: 'bg-green-100 text-green-800' }
      : { label: '下書き', color: 'bg-yellow-100 text-yellow-800' };
  };

  const filteredPosts = posts.filter(post => {
    if (filter === 'all') return true;
    if (filter === 'published') return post.isPublished;
    if (filter === 'draft') return !post.isPublished;
    return post.category === filter;
  });

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ブログ・ニュース管理</h1>
          <p className="text-gray-600 mt-2">記事の作成・編集・公開管理</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/blog/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-moss-green hover:bg-moss-green/90"
          >
            📝 新記事作成
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            🔄 更新
          </button>
        </div>
      </div>

      {/* フィルター */}
      <div className="flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            filter === 'all'
              ? 'bg-moss-green text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          すべて ({posts.length})
        </button>
        <button
          onClick={() => setFilter('news')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            filter === 'news'
              ? 'bg-moss-green text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          お知らせ ({posts.filter(p => p.category === 'news').length})
        </button>
        <button
          onClick={() => setFilter('howto')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            filter === 'howto'
              ? 'bg-moss-green text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          作り方 ({posts.filter(p => p.category === 'howto').length})
        </button>
        <button
          onClick={() => setFilter('published')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            filter === 'published'
              ? 'bg-moss-green text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          公開中 ({posts.filter(p => p.isPublished).length})
        </button>
        <button
          onClick={() => setFilter('draft')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            filter === 'draft'
              ? 'bg-moss-green text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          下書き ({posts.filter(p => !p.isPublished).length})
        </button>
      </div>

      {/* 記事一覧 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium">記事一覧</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイトル
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  カテゴリ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  投稿日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タグ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPosts.map((post) => {
                const categoryConfig = getCategoryConfig(post.category);
                const statusConfig = getStatusConfig(post.isPublished);
                
                return (
                  <tr key={post._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {post.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {post.excerpt}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${categoryConfig.color}`}>
                        {categoryConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        <button
                          onClick={() => handleTogglePublish(post._id, post.isPublished)}
                          className={`px-2 py-1 text-xs rounded ${
                            post.isPublished 
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {post.isPublished ? '非公開' : '公開'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(post.publishedAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {post.tags?.map((tag, index) => (
                          <span key={index} className="inline-flex px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/blog/${post.slug?.current}`}
                          target="_blank"
                          className="text-moss-green hover:text-moss-green/80"
                        >
                          確認
                        </Link>
                        <Link
                          href={`/admin/blog/${post._id}/edit`}
                          className="text-blue-600 hover:text-blue-500"
                        >
                          編集
                        </Link>
                        <button
                          className="text-red-600 hover:text-red-500"
                          onClick={() => handleDelete(post._id)}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">記事がありません</h3>
            <p className="text-gray-500 mb-6">
              {filter === 'all' ? 'まだ記事が投稿されていません' : `${filter}の記事がありません`}
            </p>
            <Link
              href="/admin/blog/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-moss-green hover:bg-moss-green/90"
            >
              新しい記事を作成
            </Link>
          </div>
        )}
      </div>

      {/* クイックアクション */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">📝 新記事作成</h3>
          <p className="text-gray-600 text-sm mb-4">ブログ記事やニュースを投稿</p>
          <Link
            href="/admin/blog/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-moss-green hover:bg-moss-green/90 w-full justify-center"
          >
            記事を作成
          </Link>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">🏷️ カテゴリ管理</h3>
          <p className="text-gray-600 text-sm mb-4">記事カテゴリの設定</p>
          <Link
            href="/admin/blog/categories"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            カテゴリ設定
          </Link>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">📊 記事統計</h3>
          <p className="text-gray-600 text-sm mb-4">アクセス数や人気記事</p>
          <Link
            href="/admin/blog/analytics"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
          >
            統計を見る
          </Link>
        </div>
      </div>
    </div>
  );
}