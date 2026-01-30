'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  materials: string[];
  careInstructions: string;
  dimensions: { width?: number; height?: number; depth?: number };
  weight?: number;
  stockQuantity: number;
  lowStockThreshold: number;
  featured: boolean;
}

const categories = [
  '初心者向け',
  'プレミアム',
  'カスタム',
  'ギフト',
  'セット商品',
  'メンテナンス',
];

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    slug: '',
    description: '',
    price: 0,
    category: '初心者向け',
    materials: [],
    careInstructions: '',
    dimensions: {},
    stockQuantity: 0,
    lowStockThreshold: 5,
    featured: false,
  });

  useEffect(() => {
    if (!id) {
      setFetching(false);
      return;
    }
    let mounted = true;
    fetch(`/api/admin/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('商品の取得に失敗しました');
        return res.json();
      })
      .then((product: Record<string, unknown>) => {
        if (!mounted) return;
        const slugStr =
          typeof product.slug === 'string'
            ? product.slug
            : (product.slug as { current?: string })?.current ?? '';
        const size = (product.size ?? product.dimensions) as
          | { width?: number; height?: number; depth?: number }
          | undefined;
        setFormData({
          name: String(product.name ?? ''),
          slug: slugStr,
          description: String(product.description ?? ''),
          price: Number(product.price ?? 0),
          category: String(product.category ?? '初心者向け'),
          materials: Array.isArray(product.materials) ? product.materials.map(String) : [],
          careInstructions: String(product.careInstructions ?? ''),
          dimensions: size
            ? {
                width: size.width,
                height: size.height,
                depth: size.depth,
              }
            : {},
          weight:
            typeof product.weight === 'number' ? product.weight : undefined,
          stockQuantity: Number(product.stockQuantity ?? 0),
          lowStockThreshold: Number(product.lowStockThreshold ?? 5),
          featured: Boolean(product.featured),
        });
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : 'エラーが発生しました');
      })
      .finally(() => {
        if (mounted) setFetching(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        slug: { _type: 'slug' as const, current: formData.slug },
        description: formData.description,
        price: formData.price,
        category: formData.category,
        materials: formData.materials,
        careInstructions: formData.careInstructions,
        stockQuantity: formData.stockQuantity,
        lowStockThreshold: formData.lowStockThreshold,
        featured: formData.featured,
        size: formData.dimensions,
      };
      if (formData.weight != null) (payload as Record<string, unknown>).weight = formData.weight;
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('更新に失敗しました');
      alert('商品を更新しました');
      router.push('/admin/products');
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : '商品の更新に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({ ...prev, name, slug: generateSlug(name) }));
  };

  const handleMaterialsChange = (materialsString: string) => {
    const materials = materialsString
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m.length > 0);
    setFormData((prev) => ({ ...prev, materials }));
  };

  if (fetching) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (error || !id) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-red-600 mb-4">{error ?? '商品IDがありません'}</p>
        <Link href="/admin/products" className="text-moss-green hover:underline">
          ← 商品一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/products" className="text-moss-green hover:underline text-sm mb-2 inline-block">
          ← 商品一覧に戻る
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">商品を編集</h1>
        <p className="text-gray-600 mt-2">商品情報を変更して保存します</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">商品名 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">スラッグ (URL用)</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="product-slug"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">商品説明 *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">価格 (円) *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={0}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリ *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">使用材料 (カンマ区切り)</label>
            <input
              type="text"
              value={formData.materials.join(', ')}
              onChange={(e) => handleMaterialsChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="苔, ガラス容器, 土"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">お手入れ方法</label>
            <textarea
              value={formData.careInstructions}
              onChange={(e) => setFormData((prev) => ({ ...prev, careInstructions: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="水やりの頻度や置き場所などの注意点を記載"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-medium text-gray-900">在庫・管理設定</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">在庫数量</label>
                <input
                  type="number"
                  min={0}
                  value={formData.stockQuantity}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, stockQuantity: parseInt(e.target.value) || 0 }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">低在庫しきい値</label>
                <input
                  type="number"
                  min={1}
                  value={formData.lowStockThreshold}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 5 }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5"
                />
                <p className="text-xs text-gray-500 mt-1">この数以下になると「在庫少」表示</p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => setFormData((prev) => ({ ...prev, featured: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="featured" className="ml-2 block text-sm text-gray-900">
                  おすすめ商品として表示
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '更新中...' : '変更を保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
