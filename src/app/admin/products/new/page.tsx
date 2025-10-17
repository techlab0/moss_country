'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  materials: string[];
  careInstructions: string;
  dimensions: {
    width?: number;
    height?: number;
    depth?: number;
  };
  weight?: number;
}

const categories = [
  '初心者向け',
  'プレミアム', 
  'カスタム',
  'ギフト',
  'セット商品',
  'メンテナンス',
];

const NewProductPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    slug: '',
    description: '',
    price: 0,
    category: '初心者向け',
    materials: [],
    careInstructions: '',
    dimensions: {},
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('商品作成データ:', formData);
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('商品が正常に登録されました！');
      router.push('/admin/products');
    } catch (error) {
      console.error('商品作成エラー:', error);
      alert('商品の登録に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  const handleMaterialsChange = (materialsString: string) => {
    const materials = materialsString
      .split(',')
      .map(m => m.trim())
      .filter(m => m.length > 0);
    setFormData(prev => ({ ...prev, materials }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">新商品登録</h1>
        <p className="text-gray-600 mt-2">商品情報を入力して新しい商品を登録します</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                商品名 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                スラッグ (URL用)
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="product-slug"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              商品説明 *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                価格 (円) *
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                カテゴリ *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              使用材料 (カンマ区切り)
            </label>
            <input
              type="text"
              value={formData.materials.join(', ')}
              onChange={(e) => handleMaterialsChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="苔, ガラス容器, 土"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              お手入れ方法
            </label>
            <textarea
              value={formData.careInstructions}
              onChange={(e) => setFormData(prev => ({ ...prev, careInstructions: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="水やりの頻度や置き場所などの注意点を記載"
            />
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
              {loading ? '登録中...' : '商品を登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewProductPage;