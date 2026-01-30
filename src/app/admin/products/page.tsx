'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getProductSlug } from '@/lib/adapters';
import type { Product } from '@/types/sanity';

interface ProductWithInventory extends Product {
  currentStock?: number;
  reservedStock?: number;
  availableStock?: number;
  status?: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // API経由で取得（useCdn: false で登録直後の商品も即時反映）
      const res = await fetch('/api/admin/products');
      if (!res.ok) throw new Error('商品の取得に失敗しました');
      const sanityProducts: Product[] = await res.json();

      // 在庫ステータスを計算
      const productsWithInventory: ProductWithInventory[] = sanityProducts.map(product => ({
        ...product,
        currentStock: product.stockQuantity || 0,
        reservedStock: product.reserved || 0,
        availableStock: (product.stockQuantity || 0) - (product.reserved || 0),
        status: getStockStatus(product.stockQuantity || 0, product.lowStockThreshold || 5),
      }));

      setProducts(productsWithInventory);
    } catch (error) {
      console.error('商品データの取得に失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (stock: number, threshold: number): string => {
    if (stock === 0) return 'out_of_stock';
    if (stock <= threshold) return 'low_stock';
    return 'in_stock';
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`「${productName}」を削除してもよろしいですか？この操作は取り消せません。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }

      alert('商品を削除しました');
      fetchProducts(); // 商品一覧を再取得
    } catch (error) {
      console.error('削除エラー:', error);
      alert('商品の削除に失敗しました');
    }
  };

  const handleStockUpdate = async (productId: string, newStock: number) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockQuantity: newStock
        }),
      });

      if (!response.ok) {
        throw new Error('在庫更新に失敗しました');
      }

      fetchProducts(); // 商品一覧を再取得
    } catch (error) {
      console.error('在庫更新エラー:', error);
      alert('在庫の更新に失敗しました');
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'in_stock':
        return { label: '在庫あり', color: 'bg-green-100 text-green-800' };
      case 'low_stock':
        return { label: '在庫少', color: 'bg-yellow-100 text-yellow-800' };
      case 'out_of_stock':
        return { label: '在庫切れ', color: 'bg-red-100 text-red-800' };
      default:
        return { label: '不明', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const filteredProducts = products.filter(product => {
    if (filter === 'all') return true;
    return product.status === filter;
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
          <h1 className="text-3xl font-bold text-gray-900">商品管理</h1>
          <p className="text-gray-600 mt-2">商品の登録・編集・在庫管理</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-moss-green hover:bg-moss-green/90"
          >
            新商品登録
          </Link>
          <Link
            href="/admin/cms"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            詳細CMS管理
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            データ更新
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
          すべて ({products.length})
        </button>
        <button
          onClick={() => setFilter('in_stock')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            filter === 'in_stock'
              ? 'bg-moss-green text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          在庫あり ({products.filter(p => p.status === 'in_stock').length})
        </button>
        <button
          onClick={() => setFilter('low_stock')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            filter === 'low_stock'
              ? 'bg-moss-green text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          在庫少 ({products.filter(p => p.status === 'low_stock').length})
        </button>
      </div>

      {/* 商品一覧 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium">商品一覧</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  商品
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  カテゴリ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  価格
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  在庫数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const statusConfig = getStatusConfig(product.status || 'in_stock');
                
                return (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                            🌱
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {getProductSlug(product)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.category || '未分類'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ¥{product.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <input
                        type="number"
                        min="0"
                        value={product.currentStock || 0}
                        onChange={(e) => {
                          const newStock = parseInt(e.target.value) || 0;
                          handleStockUpdate(product._id, newStock);
                        }}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-moss-green focus:border-transparent"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/products/${getProductSlug(product)}`}
                          target="_blank"
                          className="text-moss-green hover:text-moss-green/80"
                        >
                          確認
                        </Link>
                        <Link
                          href={`/admin/products/${product._id}/edit`}
                          className="text-blue-600 hover:text-blue-500"
                        >
                          編集
                        </Link>
                        <button
                          onClick={() => handleDeleteProduct(product._id, product.name)}
                          className="text-red-600 hover:text-red-500"
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

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">商品がありません</h3>
            <p className="text-gray-500 mb-6">
              {filter === 'all' ? 'まだ商品が登録されていません' : `${filter}の商品がありません`}
            </p>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-moss-green hover:bg-moss-green/90"
            >
              新しい商品を追加
            </Link>
          </div>
        )}
      </div>

      {/* クイックアクション */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">商品登録</h3>
          <p className="text-gray-600 text-sm mb-4">新しい商品を追加</p>
          <div className="space-y-2">
            <Link
              href="/admin/products/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-moss-green hover:bg-moss-green/90 w-full justify-center"
            >
              簡易登録
            </Link>
            <Link
              href="/admin/cms/structure/product"
              target="_blank"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 w-full justify-center"
            >
              詳細登録
            </Link>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">在庫管理</h3>
          <p className="text-gray-600 text-sm mb-4">在庫の確認・更新</p>
          <Link
            href="/admin/inventory"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            在庫を管理
          </Link>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">カテゴリ管理</h3>
          <p className="text-gray-600 text-sm mb-4">商品カテゴリは各商品の登録・編集画面で選択できます。スキーマ変更は Sanity Studio で行います。</p>
          <Link
            href="/admin/cms"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
          >
            Sanity Studio を開く
          </Link>
        </div>
      </div>
    </div>
  );
}