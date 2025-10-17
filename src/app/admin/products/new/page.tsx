'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createProduct } from '@/lib/sanity';

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

const NewProductPage = (): JSX.Element => {
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
      // TODO: 実際のSanity API連携
      console.log('商品作成データ:', formData);
      
      // モック処理（実際はSanityに保存）
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
            {/* 基本情報 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  商品名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-moss-green focus:border-moss-green"
                  placeholder="例: ミニカプセルテラリウム"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL スラッグ
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-moss-green focus:border-moss-green"
                  placeholder="mini-capsule-terrarium"
                />
                <p className="text-xs text-gray-500 mt-1">
                  商品ページのURL: /products/{formData.slug}
                </p>
              </div>
            </div>

            {/* 価格とカテゴリ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  価格 (円) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-moss-green focus:border-moss-green"
                  placeholder="5500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カテゴリ
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-moss-green focus:border-moss-green"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 説明文 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                商品説明
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-moss-green focus:border-moss-green"
                placeholder="この商品の特徴や魅力を説明してください..."
              />
            </div>

            {/* 素材 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                使用素材
              </label>
              <input
                type="text"
                value={formData.materials.join(', ')}
                onChange={(e) => handleMaterialsChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-moss-green focus:border-moss-green"
                placeholder="苔, 流木, 石, ガラス容器 (カンマ区切り)"
              />
            </div>

            {/* サイズ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                サイズ (cm)
              </label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.dimensions.width || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, width: parseFloat(e.target.value) || undefined }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-moss-green focus:border-moss-green"
                    placeholder="幅"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.dimensions.height || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, height: parseFloat(e.target.value) || undefined }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-moss-green focus:border-moss-green"
                    placeholder="高さ"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.dimensions.depth || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, depth: parseFloat(e.target.value) || undefined }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-moss-green focus:border-moss-green"
                    placeholder="奥行"
                  />
                </div>
              </div>
            </div>

            {/* お手入れ方法 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                お手入れ方法
              </label>
              <textarea
                value={formData.careInstructions}
                onChange={(e) => setFormData(prev => ({ ...prev, careInstructions: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-moss-green focus:border-moss-green"
                placeholder="週に1-2回霧吹きで水を与えてください..."
              />
            </div>

            {/* ボタン */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-moss-green text-white rounded-md hover:bg-moss-green/90 disabled:opacity-50"
              >
                {loading ? '登録中...' : '商品を登録'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">💡 ヒント</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 商品画像の追加は登録後に詳細CMS管理で行えます</li>
            <li>• 在庫数は在庫管理ページで設定できます</li>
            <li>• より詳細な設定は詳細CMS管理をご利用ください</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NewProductPage;