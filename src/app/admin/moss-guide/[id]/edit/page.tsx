'use client';

import { useState, useEffect, use, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { urlFor } from '@/lib/sanity';
import { generateSEOFriendlySlug } from '@/lib/slugUtils';

interface EditMossSpeciesPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditMossSpeciesPage({ params }: EditMossSpeciesPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [images, setImages] = useState<any[]>([]);
  const [slugError, setSlugError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    commonNames: [''],
    description: '',
    characteristics: {
      beginnerFriendly: 3,
      waterRequirement: 'medium',
      lightRequirement: 'medium',
      temperatureAdaptability: 'temperate',
      growthSpeed: 'normal'
    },
    basicInfo: '',
    supplementaryInfo: '',
    practicalAdvice: {
      workshopUsage: false,
      difficultyPoints: [''],
      successTips: [''],
      careInstructions: ''
    },
    category: 'moss',
    tags: [''],
    featured: false,
    isVisible: true
  });

  // 苔データを取得
  useEffect(() => {
    fetchMossSpecies();
  }, [resolvedParams.id]);

  const fetchMossSpecies = async () => {
    try {
      const response = await fetch(`/api/admin/moss-guide/${resolvedParams.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch moss species');
      }
      
      const data = await response.json();
      
      // フォームデータを設定（新旧データ構造の互換性を保つ）
      setFormData({
        name: data.name || '',
        slug: data.slug?.current || '',
        commonNames: data.commonNames?.length > 0 ? data.commonNames : [''],
        description: data.description || '',
        characteristics: {
          beginnerFriendly: data.characteristics?.beginnerFriendly || 3,
          waterRequirement: data.characteristics?.waterRequirement || 'medium',
          lightRequirement: data.characteristics?.lightRequirement || 'medium',
          temperatureAdaptability: data.characteristics?.temperatureAdaptability || 'temperate',
          growthSpeed: data.characteristics?.growthSpeed || 'normal'
        },
        basicInfo: data.basicInfo || '',
        supplementaryInfo: data.supplementaryInfo || '',
        practicalAdvice: {
          workshopUsage: data.practicalAdvice?.workshopUsage || data.practicalInfo?.workshopUsage || false,
          difficultyPoints: (data.practicalAdvice?.difficultyPoints || data.practicalInfo?.difficultyPoints)?.length > 0 ? (data.practicalAdvice?.difficultyPoints || data.practicalInfo?.difficultyPoints) : [''],
          successTips: (data.practicalAdvice?.successTips || data.practicalInfo?.successTips)?.length > 0 ? (data.practicalAdvice?.successTips || data.practicalInfo?.successTips) : [''],
          careInstructions: data.practicalAdvice?.careInstructions || data.practicalInfo?.careInstructions || ''
        },
        category: data.category || 'moss',
        tags: data.tags?.length > 0 ? data.tags : [''],
        featured: data.featured || false,
        isVisible: data.isVisible !== false
      });
      
      // 既存の画像を設定
      setImages(data.images || []);
      
    } catch (error) {
      console.error('苔データの取得に失敗:', error);
      alert('苔データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // データを整理（空の配列要素を削除など）
      const cleanedData = {
        ...formData,
        images: images, // アップロードされた画像を追加
        commonNames: formData.commonNames.filter(name => name.trim() !== ''),
        tags: formData.tags.filter(tag => tag.trim() !== ''),
        practicalAdvice: {
          ...formData.practicalAdvice,
          difficultyPoints: (formData.practicalAdvice?.difficultyPoints || []).filter(point => point.trim() !== ''),
          successTips: (formData.practicalAdvice?.successTips || []).filter(tip => tip.trim() !== '')
        },
        supplementaryInfo: {
          ...formData.supplementaryInfo,
          collectionSeason: (formData.supplementaryInfo?.collectionSeason || []).filter(season => season !== '')
        }
      };

      const response = await fetch(`/api/admin/moss-guide/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) {
        throw new Error('Failed to update moss species');
      }

      const updatedSpecies = await response.json();
      router.push('/admin/moss-guide');
    } catch (error) {
      console.error('苔データの更新に失敗:', error);
      alert('苔データの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File, caption: string = '') => {
    setUploadingImage(true);
    try {
      console.log('画像アップロード開始:', { filename: file.name, size: file.size, type: file.type });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caption', caption);

      const response = await fetch('/api/admin/moss-guide/upload-image', {
        method: 'POST',
        body: formData,
      });

      console.log('アップロード応答:', { status: response.status, statusText: response.statusText });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('アップロードエラー詳細:', { status: response.status, error: errorText });
        throw new Error(`Failed to upload image: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('アップロード成功:', result);
      setImages(prev => [...prev, result.image]);
      return result.image;
    } catch (error) {
      console.error('画像アップロードに失敗:', error);
      alert(`画像のアップロードに失敗しました: ${error.message}`);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // スラッグ自動生成
  const generateSlug = () => {
    if (!formData.name.trim()) return;
    
    const slug = generateSEOFriendlySlug(formData.name);
    setFormData(prev => ({ ...prev, slug }));
    setSlugError('');
  };

  const addArrayItem = (field: string, subField?: string) => {
    if (subField) {
      setFormData(prev => ({
        ...prev,
        [field]: {
          ...prev[field as keyof typeof prev],
          [subField]: [...(prev[field as keyof typeof prev] as any)[subField], '']
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field as keyof typeof prev] as string[]), '']
      }));
    }
  };

  const removeArrayItem = (field: string, index: number, subField?: string) => {
    if (subField) {
      setFormData(prev => ({
        ...prev,
        [field]: {
          ...prev[field as keyof typeof prev],
          [subField]: (prev[field as keyof typeof prev] as any)[subField].filter((_: any, i: number) => i !== index)
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index)
      }));
    }
  };

  const updateArrayItem = (field: string, index: number, value: string, subField?: string) => {
    if (subField) {
      setFormData(prev => ({
        ...prev,
        [field]: {
          ...prev[field as keyof typeof prev],
          [subField]: (prev[field as keyof typeof prev] as any)[subField].map((item: string, i: number) => 
            i === index ? value : item
          )
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: (prev[field as keyof typeof prev] as string[]).map((item, i) => 
          i === index ? value : item
        )
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <span className="text-gray-600">苔データを読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">苔を編集</h1>
          <p className="mt-1 text-sm text-gray-600">
            苔図鑑のデータを編集します
          </p>
        </div>
        <Link
          href="/admin/moss-guide"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          ← 一覧に戻る
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 基本情報 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">基本情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                苔の名前（和名）*
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900"
                placeholder="例：ホソウリゴケ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                スラッグ（URL用）
              </label>
              <div className="space-y-2">
                <div className="flex items-center space-x-1">
                  <span className="text-gray-500 text-sm font-medium">/moss-guide/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, slug: e.target.value }));
                      setSlugError('');
                    }}
                    className={`focus:ring-emerald-500 focus:border-emerald-500 block flex-1 px-3 py-2 border rounded-md shadow-sm sm:text-sm ${
                      slugError ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="hosourigoke"
                    pattern="[a-z0-9-]+"
                    title="英小文字、数字、ハイフンのみ使用可能"
                  />
                </div>
                <button
                  type="button"
                  onClick={generateSlug}
                  disabled={!formData.name.trim()}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  苔の名前から自動生成
                </button>
              </div>
              {slugError ? (
                <p className="mt-1 text-sm text-red-600">
                  {slugError}
                </p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  苔のURLになります。英小文字、数字、ハイフンのみ使用可能です。
                </p>
              )}
              {formData.slug && !slugError && (
                <p className="mt-1 text-sm text-emerald-600">
                  プレビュー: /moss-guide/{formData.slug}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分類*
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="moss">蘚類</option>
                <option value="liverwort">苔類</option>
                <option value="hornwort">ツノゴケ類</option>
              </select>
            </div>
            <div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">おすすめ</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isVisible}
                    onChange={(e) => setFormData(prev => ({ ...prev, isVisible: e.target.checked }))}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">公開</span>
                </label>
              </div>
            </div>
          </div>

          {/* 別名 */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              別名・地方名
            </label>
            {formData.commonNames.map((name, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => updateArrayItem('commonNames', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="別名を入力"
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem('commonNames', index)}
                  className="px-3 py-2 text-red-600 hover:text-red-800"
                >
                  削除
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('commonNames')}
              className="text-emerald-600 hover:text-emerald-800 text-sm"
            >
              + 別名を追加
            </button>
          </div>

        </div>

        {/* 画像アップロード */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">画像</h2>
          
          {/* 画像一覧 */}
          {images.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {images.map((image, index) => (
                <div key={index} className="relative border border-gray-300 rounded-lg p-2">
                  <div className="aspect-square bg-gray-100 rounded overflow-hidden mb-2">
                    {image && image.asset ? (
                      <Image
                        src={urlFor(image).width(300).height(300).url()}
                        alt={image.caption || `画像 ${index + 1}`}
                        width={300}
                        height={300}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-sm text-gray-500">画像 {index + 1}</span>
                      </div>
                    )}
                  </div>
                  {image.caption && (
                    <p className="text-sm text-gray-600 mb-2">{image.caption}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 画像アップロード */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                for (const file of files) {
                  try {
                    await handleImageUpload(file);
                  } catch (error) {
                    break; // エラーが発生したら停止
                  }
                }
                e.target.value = ''; // ファイル選択をリセット
              }}
              className="hidden"
              id="image-upload"
              disabled={uploadingImage}
            />
            <label
              htmlFor="image-upload"
              className={`cursor-pointer ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="space-y-2">
                <div className="text-gray-400">
                  <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="text-sm text-gray-600">
                  {uploadingImage ? (
                    <span>アップロード中...</span>
                  ) : (
                    <>
                      <span className="font-medium text-emerald-600">クリックしてファイルを選択</span>
                      <span> またはドラッグ&ドロップ</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  JPEG, PNG, WebP (最大2MB)
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* 育成特性 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">育成特性</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                初心者適応度
              </label>
              <select
                value={formData.characteristics.beginnerFriendly}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  characteristics: { ...prev.characteristics, beginnerFriendly: parseInt(e.target.value) as any }
                }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value={1}>★☆☆☆☆ とても難しい</option>
                <option value={2}>★★☆☆☆ 難しい</option>
                <option value={3}>★★★☆☆ 普通</option>
                <option value={4}>★★★★☆ 育てやすい</option>
                <option value={5}>★★★★★ とても育てやすい</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                水分要求度
              </label>
              <select
                value={formData.characteristics.waterRequirement}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  characteristics: { ...prev.characteristics, waterRequirement: e.target.value as any }
                }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="low">低（週1-2回）</option>
                <option value="medium">中（週2-3回）</option>
                <option value="high">高（毎日〜隔日）</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                光量要求
              </label>
              <select
                value={formData.characteristics.lightRequirement}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  characteristics: { ...prev.characteristics, lightRequirement: e.target.value as any }
                }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="weak">弱光（間接光・LED弱）</option>
                <option value="medium">中光（明るい室内・LED中）</option>
                <option value="strong">強光（直射日光可・LED強）</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                温度適応性
              </label>
              <select
                value={formData.characteristics.temperatureAdaptability}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  characteristics: { ...prev.characteristics, temperatureAdaptability: e.target.value as any }
                }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="cold">寒冷（5-15℃が最適）</option>
                <option value="temperate">温帯（15-25℃が最適）</option>
                <option value="warm">高温（25℃以上でも適応）</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                成長スピード
              </label>
              <select
                value={formData.characteristics.growthSpeed}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  characteristics: { ...prev.characteristics, growthSpeed: e.target.value as any }
                }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="slow">遅（年数回のメンテナンス）</option>
                <option value="normal">普通（月1回程度のメンテナンス）</option>
                <option value="fast">早（週1回程度のメンテナンス）</option>
              </select>
            </div>
          </div>
        </div>

        {/* 基本情報 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">追加の基本情報</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              詳細な基本情報
            </label>
            <textarea
              value={formData.basicInfo || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                basicInfo: e.target.value
              }))}
              rows={6}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="生息地、外観、その他の特徴など、詳細説明で書ききれない基本的な情報を記載してください"
            />
          </div>
        </div>

        {/* 補足情報 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">補足情報</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              補足情報
            </label>
            <textarea
              value={formData.supplementaryInfo || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                supplementaryInfo: e.target.value
              }))}
              rows={6}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="北海道の分布情報、採取時期、冬期管理の注意点、その他の補足情報などを自由に記載してください"
            />
          </div>
        </div>

        {/* 育て方 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">育て方</h2>
          <div className="space-y-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.practicalAdvice?.workshopUsage || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  practicalAdvice: { ...prev.practicalAdvice, workshopUsage: e.target.checked }
                }))}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">ワークショップで使用</span>
            </div>

            {/* よくある失敗・注意点 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                よくある失敗・注意点
              </label>
              {(formData.practicalAdvice?.difficultyPoints || ['']).map((point, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={point}
                    onChange={(e) => updateArrayItem('practicalAdvice', index, e.target.value, 'difficultyPoints')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="注意点を入力"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem('practicalAdvice', index, 'difficultyPoints')}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    削除
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('practicalAdvice', 'difficultyPoints')}
                className="text-emerald-600 hover:text-emerald-800 text-sm"
              >
                + 注意点を追加
              </button>
            </div>

            {/* 育て方のコツ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                育て方のコツ
              </label>
              {(formData.practicalAdvice?.successTips || ['']).map((tip, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={tip}
                    onChange={(e) => updateArrayItem('practicalAdvice', index, e.target.value, 'successTips')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="成功のコツを入力"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem('practicalAdvice', index, 'successTips')}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    削除
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('practicalAdvice', 'successTips')}
                className="text-emerald-600 hover:text-emerald-800 text-sm"
              >
                + コツを追加
              </button>
            </div>

            {/* 育て方補足 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                育て方補足
              </label>
              <textarea
                value={formData.practicalAdvice?.careInstructions || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  practicalAdvice: { ...prev.practicalAdvice, careInstructions: e.target.value }
                }))}
                rows={6}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="水やりの頻度、光の当て方、温度管理、肥料、植え替えなど、具体的な管理方法を詳しく説明してください"
              />
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/admin/moss-guide"
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            {saving ? '更新中...' : '更新する'}
          </button>
        </div>
      </form>
    </div>
  );
}