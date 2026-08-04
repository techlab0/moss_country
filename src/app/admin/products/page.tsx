'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import Link from 'next/link';
import { getProductSlug } from '@/lib/adapters';
import { compareByReading } from '@/lib/productSort';
import { PRODUCT_CATEGORIES, resolveCategory } from '@/lib/productCategories';
import type { Product } from '@/types/sanity';
import { useSalesItems, SalesItemSelect } from '@/components/admin/SalesItemPicker';

interface ProductWithInventory extends Product {
  currentStock?: number;
  reservedStock?: number;
  availableStock?: number;
  status?: 'in_stock' | 'low_stock' | 'out_of_stock';
}

interface QuickEditData {
  slug: string;
  nameReading: string;
  category: string;
  isVisible: boolean;
  // 店頭売上との紐付け。未設定なら在庫連動もされないため、ここから直せるようにしている
  salesItemId: string | null;
}

// 状態に依存しない純粋関数。コンポーネント内に置くと毎描画で
// 別の関数になり、useCallbackの依存に入れられなくなるため外に出す。
const getStockStatus = (stock: number, threshold: number): 'in_stock' | 'low_stock' | 'out_of_stock' => {
  if (stock === 0) return 'out_of_stock';
  if (stock <= threshold) return 'low_stock';
  return 'in_stock';
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [repairing, setRepairing] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'priceAsc' | 'priceDesc' | 'stockAsc'>('default');
  const [nameQuery, setNameQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quickEditData, setQuickEditData] = useState<QuickEditData>({
    slug: '',
    nameReading: '',
    category: PRODUCT_CATEGORIES[0],
    isVisible: true,
    salesItemId: null,
  });
  const { items: salesItems, loading: salesItemsLoading } = useSalesItems();
  const [savingQuickEdit, setSavingQuickEdit] = useState(false);
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      // API経由で取得（useCdn: false で登録直後の商品も即時反映）
      const res = await fetch('/api/admin/products');
      if (!res.ok) throw new Error('商品の取得に失敗しました');
      const sanityProducts: Product[] = await res.json();

      // 在庫ステータスを計算
      const productsWithInventory: ProductWithInventory[] = sanityProducts.map((product) => {
        const currentStock = product.stockQuantity || 0;
        const reservedStock = product.reserved || 0;
        const availableStock = Math.max(0, currentStock - reservedStock);
        return {
          ...product,
          currentStock,
          reservedStock,
          availableStock,
          status: getStockStatus(availableStock, product.lowStockThreshold || 5),
        };
      });

      setProducts(productsWithInventory);
    } catch (error) {
      console.error('商品データの取得に失敗:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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

  const openQuickEdit = (product: ProductWithInventory) => {
    setEditingId(product._id);
    setQuickEditData({
      slug: getProductSlug(product),
      nameReading: product.nameReading || '',
      category: resolveCategory(product.category),
      isVisible: product.isVisible !== false,
      salesItemId: product.salesItemId ?? null,
    });
  };

  const cancelQuickEdit = () => {
    setEditingId(null);
  };

  const handleQuickEditSave = async (productId: string) => {
    const trimmedSlug = quickEditData.slug.trim();
    if (!trimmedSlug || trimmedSlug === '-') {
      alert('スラッグ（URL用）を入力してください。');
      return;
    }

    setSavingQuickEdit(true);
    // 楽観更新：保存中でも編集内容を即座に一覧へ反映する。失敗したら再取得で戻す。
    setProducts((prev) =>
      prev.map((p) =>
        p._id === productId
          ? {
              ...p,
              slug: { _type: 'slug', current: trimmedSlug },
              nameReading: quickEditData.nameReading,
              category: quickEditData.category,
              isVisible: quickEditData.isVisible,
              salesItemId: quickEditData.salesItemId,
            }
          : p
      )
    );
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: { _type: 'slug', current: trimmedSlug },
          nameReading: quickEditData.nameReading,
          category: quickEditData.category,
          isVisible: quickEditData.isVisible,
          salesItemId: quickEditData.salesItemId,
        }),
      });

      if (!response.ok) {
        throw new Error('更新に失敗しました');
      }

      setEditingId(null);
    } catch (error) {
      console.error('クイック編集の保存エラー:', error);
      alert('保存に失敗しました');
      // 失敗時はサーバーの正データで戻す
      fetchProducts();
    } finally {
      setSavingQuickEdit(false);
    }
  };

  const handleToggleVisibility = async (product: ProductWithInventory) => {
    const nextVisible = !(product.isVisible !== false);
    // 楽観更新：Sanityの書き込み反映を待たず、管理画面のUIを即座に切り替える。
    // 失敗したら元の状態に戻す。
    setProducts((prev) =>
      prev.map((p) => (p._id === product._id ? { ...p, isVisible: nextVisible } : p))
    );
    setTogglingVisibilityId(product._id);
    try {
      const response = await fetch(`/api/admin/products/${product._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: nextVisible }),
      });

      if (!response.ok) {
        throw new Error('表示状態の更新に失敗しました');
      }
    } catch (error) {
      console.error('表示状態の更新エラー:', error);
      alert('表示状態の更新に失敗しました');
      // 失敗時のみ元に戻す
      setProducts((prev) =>
        prev.map((p) => (p._id === product._id ? { ...p, isVisible: !nextVisible } : p))
      );
    } finally {
      setTogglingVisibilityId(null);
    }
  };

  const handleRepairSlugs = async () => {
    if (!confirm('スラッグ（URL用）が未設定の商品を自動修復します。よろしいですか？')) {
      return;
    }

    setRepairing(true);
    try {
      const response = await fetch('/api/admin/products/repair-slugs', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('修復に失敗しました');
      }

      const data = await response.json();
      alert(`${data.count}件修復しました`);
      fetchProducts(); // 商品一覧を再取得
    } catch (error) {
      console.error('スラッグ修復エラー:', error);
      alert('スラッグの修復に失敗しました');
    } finally {
      setRepairing(false);
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
    if (filter !== 'all' && product.status !== filter) return false;

    if (categoryFilter !== 'all' && resolveCategory(product.category) !== categoryFilter) {
      return false;
    }

    const isVisible = product.isVisible !== false;
    if (visibilityFilter === 'visible' && !isVisible) return false;
    if (visibilityFilter === 'hidden' && isVisible) return false;

    const query = nameQuery.trim().toLowerCase();
    if (query && !(product.name || '').toLowerCase().includes(query)) {
      return false;
    }

    return true;
  });

  // 元配列（filteredProducts）は壊さずコピーしてソート
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return compareByReading(a, b);
      case 'priceAsc':
        return a.price - b.price;
      case 'priceDesc':
        return b.price - a.price;
      case 'stockAsc':
        return (a.availableStock ?? 0) - (b.availableStock ?? 0);
      default:
        return 0; // 登録順（現状の並びを維持）
    }
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
          <p className="text-gray-600 mt-2">商品の登録・編集・公開設定</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-moss-green hover:bg-moss-green/90"
          >
            新商品登録
          </Link>
          <Link
            href="/admin/products/bulk"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            一括編集
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

      {/* 検索・カテゴリ・表示状態の絞り込み */}
      <div className="bg-white shadow rounded-lg p-4 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="admin-product-search" className="block text-xs font-medium text-gray-500 mb-1">
            商品名検索
          </label>
          <input
            id="admin-product-search"
            type="text"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="商品名で検索"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-moss-green focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="admin-product-category-filter" className="block text-xs font-medium text-gray-500 mb-1">
            カテゴリ絞り込み
          </label>
          <select
            id="admin-product-category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-moss-green focus:border-transparent"
          >
            <option value="all">すべてのカテゴリ</option>
            {PRODUCT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="admin-product-visibility-filter" className="block text-xs font-medium text-gray-500 mb-1">
            表示状態
          </label>
          <select
            id="admin-product-visibility-filter"
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value as typeof visibilityFilter)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-moss-green focus:border-transparent"
          >
            <option value="all">すべて</option>
            <option value="visible">公開のみ</option>
            <option value="hidden">非表示のみ</option>
          </select>
        </div>
      </div>

      {/* フィルター・並び替え */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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
        <div className="flex items-center gap-2">
          <label htmlFor="admin-product-sort" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            並び替え
          </label>
          <select
            id="admin-product-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-moss-green focus:border-transparent"
          >
            <option value="default">登録順</option>
            <option value="name">あいうえお順</option>
            <option value="priceAsc">価格が安い順</option>
            <option value="priceDesc">価格が高い順</option>
            <option value="stockAsc">在庫が少ない順</option>
          </select>
        </div>
      </div>

      {/* 商品一覧 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-medium">商品一覧</h2>
          <button
            onClick={handleRepairSlugs}
            disabled={repairing}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            {repairing ? '修復中...' : 'スラッグ未設定の商品を修復'}
          </button>
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
              {sortedProducts.map((product) => {
                const statusConfig = getStatusConfig(product.status || 'in_stock');
                const isVisible = product.isVisible !== false;
                const isEditingRow = editingId === product._id;

                return (
                  <Fragment key={product._id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12">
                            <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                              🌱
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {product.name}
                              </span>
                              {!isVisible && (
                                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-800 text-white">
                                  非表示
                                </span>
                              )}
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
                        <div className="font-medium">{product.currentStock || 0}個</div>
                        <div className="text-xs text-gray-500">
                          予約 {product.reservedStock || 0} / 利用可能 {product.availableStock || 0}
                        </div>
                        <Link
                          href="/admin/inventory"
                          className="inline-block mt-1 text-xs text-moss-green hover:underline"
                        >
                          在庫管理で調整
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end items-center space-x-2">
                          <button
                            onClick={() => handleToggleVisibility(product)}
                            disabled={togglingVisibilityId === product._id}
                            className={`px-2 py-1 text-xs rounded border disabled:opacity-50 ${
                              isVisible
                                ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                : 'border-gray-800 bg-gray-800 text-white hover:bg-gray-700'
                            }`}
                          >
                            {togglingVisibilityId === product._id ? '更新中...' : isVisible ? '非表示にする' : '表示にする'}
                          </button>
                          <button
                            onClick={() => (isEditingRow ? cancelQuickEdit() : openQuickEdit(product))}
                            className="text-gray-700 hover:text-gray-900"
                          >
                            クイック編集
                          </button>
                          <Link
                            href={`/shop/${getProductSlug(product)}`}
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
                    {isEditingRow && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                スラッグ (URL用)
                              </label>
                              <input
                                type="text"
                                value={quickEditData.slug}
                                onChange={(e) =>
                                  setQuickEditData((prev) => ({ ...prev, slug: e.target.value }))
                                }
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-moss-green focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                ふりがな（ひらがな）
                              </label>
                              <input
                                type="text"
                                value={quickEditData.nameReading}
                                onChange={(e) =>
                                  setQuickEditData((prev) => ({ ...prev, nameReading: e.target.value }))
                                }
                                placeholder="こけだま"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-moss-green focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                カテゴリ
                              </label>
                              <select
                                value={quickEditData.category}
                                onChange={(e) =>
                                  setQuickEditData((prev) => ({ ...prev, category: e.target.value }))
                                }
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-moss-green focus:border-transparent"
                              >
                                {PRODUCT_CATEGORIES.map((category) => (
                                  <option key={category} value={category}>
                                    {category}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                売上明細の項目
                              </label>
                              <SalesItemSelect
                                items={salesItems}
                                loading={salesItemsLoading}
                                value={quickEditData.salesItemId}
                                onChange={(salesItemId) =>
                                  setQuickEditData((prev) => ({ ...prev, salesItemId }))
                                }
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-moss-green focus:border-transparent disabled:bg-gray-100"
                              />
                              <p className="text-xs text-gray-400 mt-1">
                                店頭で売れた分の在庫を減らすには、この項目の設定が必要です
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`quick-edit-visible-${product._id}`}
                                checked={quickEditData.isVisible}
                                onChange={(e) =>
                                  setQuickEditData((prev) => ({ ...prev, isVisible: e.target.checked }))
                                }
                                className="h-4 w-4 text-moss-green focus:ring-moss-green border-gray-300 rounded"
                              />
                              <label htmlFor={`quick-edit-visible-${product._id}`} className="text-sm text-gray-900">
                                公開する（表示）
                              </label>
                            </div>
                          </div>
                          <div className="flex justify-end gap-3 mt-4">
                            <button
                              type="button"
                              onClick={cancelQuickEdit}
                              className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                            >
                              キャンセル
                            </button>
                            <button
                              type="button"
                              disabled={savingQuickEdit}
                              onClick={() => handleQuickEditSave(product._id)}
                              className="px-4 py-2 text-sm bg-moss-green text-white rounded-md hover:bg-moss-green/90 disabled:opacity-50"
                            >
                              {savingQuickEdit ? '保存中...' : '保存'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
