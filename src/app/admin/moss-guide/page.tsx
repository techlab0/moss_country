'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { MossSpecies } from '@/types/sanity';

interface AdminMossSpecies extends MossSpecies {
  _createdAt?: string;
  _updatedAt?: string;
}

export default function AdminMossGuidePage() {
  const [species, setSpecies] = useState<AdminMossSpecies[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchSpecies();
  }, []);

  const fetchSpecies = async () => {
    try {
      const response = await fetch('/api/admin/moss-guide');
      if (!response.ok) {
        throw new Error('Failed to fetch moss species');
      }
      const speciesData = await response.json();
      setSpecies(speciesData);
      setLoading(false);
    } catch (error) {
      console.error('苔データの取得に失敗:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (speciesId: string) => {
    if (!confirm('この苔データを削除しますか？')) return;
    
    try {
      const response = await fetch(`/api/admin/moss-guide/${speciesId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete species');
      }
      
      // リストから削除
      setSpecies(species.filter(s => s._id !== speciesId));
    } catch (error) {
      console.error('苔データの削除に失敗:', error);
      alert('苔データの削除に失敗しました');
    }
  };

  const handleToggleVisibility = async (speciesId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/moss-guide/${speciesId}/visibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isVisible: !currentStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update visibility status');
      }
      
      const updatedSpecies = await response.json();
      
      // リストを更新
      setSpecies(species.map(s => 
        s._id === speciesId 
          ? { ...s, isVisible: updatedSpecies.isVisible }
          : s
      ));
    } catch (error) {
      console.error('公開状態の変更に失敗:', error);
      alert('公開状態の変更に失敗しました');
    }
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'moss':
        return { label: '蘚類', color: 'bg-green-100 text-green-800' };
      case 'liverwort':
        return { label: '苔類', color: 'bg-emerald-100 text-emerald-800' };
      case 'hornwort':
        return { label: 'ツノゴケ類', color: 'bg-teal-100 text-teal-800' };
      default:
        return { label: '未分類', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getDifficultyConfig = (difficulty: number) => {
    const stars = '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty);
    switch (difficulty) {
      case 5:
        return { label: `${stars} とても簡単`, color: 'bg-green-100 text-green-800' };
      case 4:
        return { label: `${stars} 簡単`, color: 'bg-lime-100 text-lime-800' };
      case 3:
        return { label: `${stars} 普通`, color: 'bg-yellow-100 text-yellow-800' };
      case 2:
        return { label: `${stars} 難しい`, color: 'bg-orange-100 text-orange-800' };
      case 1:
        return { label: `${stars} とても難しい`, color: 'bg-red-100 text-red-800' };
      default:
        return { label: '未設定', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const filteredSpecies = species.filter(s => {
    if (filter === 'all') return true;
    if (filter === 'visible') return s.isVisible;
    if (filter === 'hidden') return !s.isVisible;
    if (filter === 'featured') return s.featured;
    if (filter === 'workshop') return s.practicalInfo?.workshopUsage;
    return s.category === filter;
  });

  const stats = {
    total: species.length,
    visible: species.filter(s => s.isVisible).length,
    hidden: species.filter(s => !s.isVisible).length,
    featured: species.filter(s => s.featured).length,
    workshop: species.filter(s => s.practicalInfo?.workshopUsage).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <span className="text-gray-600">苔図鑑データを読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">苔図鑑管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            テラリウム用苔の種類と育て方を管理します
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/admin/moss-guide/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            新しい苔を追加
          </Link>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">全</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">総数</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">公</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">公開中</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.visible}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">非</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">非公開</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.hidden}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-amber-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">★</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">おすすめ</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.featured}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">WS</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">WS使用</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.workshop}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全て ({stats.total})
            </button>
            <button
              onClick={() => setFilter('visible')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === 'visible'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              公開中 ({stats.visible})
            </button>
            <button
              onClick={() => setFilter('hidden')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === 'hidden'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              非公開 ({stats.hidden})
            </button>
            <button
              onClick={() => setFilter('featured')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === 'featured'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              おすすめ ({stats.featured})
            </button>
            <button
              onClick={() => setFilter('workshop')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === 'workshop'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              WS使用 ({stats.workshop})
            </button>
            <div className="border-l border-gray-300 mx-2"></div>
            <button
              onClick={() => setFilter('moss')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === 'moss'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              蘚類
            </button>
            <button
              onClick={() => setFilter('liverwort')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === 'liverwort'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              苔類
            </button>
            <button
              onClick={() => setFilter('hornwort')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === 'hornwort'
                  ? 'bg-teal-100 text-teal-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ツノゴケ類
            </button>
          </div>
        </div>
      </div>

      {/* 苔一覧 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredSpecies.length === 0 ? (
            <li className="px-6 py-12 text-center">
              <div className="space-y-3">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500">
                  {filter === 'all' ? '苔データがありません' : '条件に一致する苔データがありません'}
                </p>
              </div>
            </li>
          ) : (
            filteredSpecies.map((s) => {
              const categoryConfig = getCategoryConfig(s.category);
              const difficultyConfig = getDifficultyConfig(s.characteristics?.beginnerFriendly || 3);
              
              return (
                <li key={s._id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        {/* 基本情報 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {s.name}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryConfig.color}`}>
                              {categoryConfig.label}
                            </span>
                            {s.featured && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                おすすめ
                              </span>
                            )}
                            {s.practicalInfo?.workshopUsage && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                WS使用
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${difficultyConfig.color}`}>
                              {difficultyConfig.label}
                            </span>
                            <span>公開日: {new Date(s.publishedAt).toLocaleDateString('ja-JP')}</span>
                            {s._updatedAt && (
                              <span>更新: {new Date(s._updatedAt).toLocaleDateString('ja-JP')}</span>
                            )}
                          </div>
                        </div>

                        {/* ステータス */}
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            s.isVisible 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {s.isVisible ? '公開中' : '非公開'}
                          </span>
                        </div>
                      </div>

                      {/* アクション */}
                      <div className="flex items-center space-x-2 ml-4">
                        <Link
                          href={`/moss-guide/${s.slug.current}`}
                          target="_blank"
                          className="text-emerald-600 hover:text-emerald-900 text-sm font-medium"
                        >
                          プレビュー
                        </Link>
                        <Link
                          href={`/admin/moss-guide/${s._id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                        >
                          編集
                        </Link>
                        <button
                          onClick={() => handleToggleVisibility(s._id, s.isVisible)}
                          className={`text-sm font-medium ${
                            s.isVisible 
                              ? 'text-gray-600 hover:text-gray-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {s.isVisible ? '非公開' : '公開'}
                        </button>
                        <button
                          onClick={() => handleDelete(s._id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}