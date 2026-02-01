'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { urlFor } from '@/lib/sanity';
import type { SanityImage } from '@/types/sanity';

type PageType = 'main' | 'products' | 'workshop' | 'story' | 'store' | 'mossGuide' | 'blog' | 'contact';
type ImageType = 'hero' | 'background';

interface PageInfo {
  name: string;
  heroSize: string;
  backgroundSize: string;
  backgroundMobileSize: string;
}

const pageInfo: Record<PageType, PageInfo> = {
  main: {
    name: 'メインページ',
    heroSize: '1920×1080px',
    backgroundSize: '1920×1080px',
    backgroundMobileSize: '750×1334px',
  },
  products: {
    name: '商品ページ',
    heroSize: '1920×600px',
    backgroundSize: '1920×1080px',
    backgroundMobileSize: '750×1334px',
  },
  workshop: {
    name: 'ワークショップページ',
    heroSize: '1920×600px',
    backgroundSize: '1920×1080px',
    backgroundMobileSize: '750×1334px',
  },
  story: {
    name: 'ストーリーページ',
    heroSize: '1920×600px',
    backgroundSize: '1920×1080px',
    backgroundMobileSize: '750×1334px',
  },
  store: {
    name: '店舗ページ',
    heroSize: '1920×600px',
    backgroundSize: '1920×1080px',
    backgroundMobileSize: '750×1334px',
  },
  mossGuide: {
    name: '苔図鑑ページ',
    heroSize: '1920×600px',
    backgroundSize: '1920×1080px',
    backgroundMobileSize: '750×1334px',
  },
  blog: {
    name: 'ブログページ',
    heroSize: '1920×600px',
    backgroundSize: '1920×1080px',
    backgroundMobileSize: '750×1334px',
  },
  contact: {
    name: 'お問い合わせページ',
    heroSize: '1920×600px',
    backgroundSize: '1920×1080px',
    backgroundMobileSize: '750×1334px',
  },
};

export default function ImageManagePage() {
  const [activeTab, setActiveTab] = useState<ImageType>('hero');
  const [heroSettings, setHeroSettings] = useState<any>(null);
  const [backgroundSettings, setBackgroundSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 設定を取得
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [heroRes, backgroundRes] = await Promise.all([
        fetch('/api/admin/images/hero'),
        fetch('/api/admin/images/background'),
      ]);

      if (heroRes.ok) {
        const heroData = await heroRes.json();
        setHeroSettings(heroData);
      }

      if (backgroundRes.ok) {
        const backgroundData = await backgroundRes.json();
        setBackgroundSettings(backgroundData);
      }
    } catch (error) {
      console.error('設定の取得に失敗:', error);
      setMessage({ type: 'error', text: '設定の取得に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (page: PageType, imageType: ImageType, isMobile: boolean = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/jpg,image/png,image/webp';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const maxMB = 4;
      if (file.size > maxMB * 1024 * 1024) {
        setMessage({
          type: 'error',
          text: `ファイルが大きすぎます（最大${maxMB}MB）。現在: ${(file.size / 1024 / 1024).toFixed(1)}MB。圧縮するか、解像度を下げてください。`,
        });
        setTimeout(() => setMessage(null), 5000);
        return;
      }

      const uploadKey = `${page}-${imageType}-${isMobile ? 'mobile' : 'pc'}`;
      setUploading(prev => ({ ...prev, [uploadKey]: true }));

      try {
        // 画像をアップロード
        const formData = new FormData();
        formData.append('file', file);

        const uploadRes = await fetch('/api/admin/images/upload', {
          method: 'POST',
          body: formData,
        });

        let uploadResult: { image?: unknown; error?: string; details?: string } = {};
        try {
          uploadResult = await uploadRes.json();
        } catch {
          uploadResult = {};
        }
        if (!uploadRes.ok) {
          const msg = uploadResult?.error || uploadResult?.details || '画像のアップロードに失敗しました';
          throw new Error(typeof msg === 'string' ? msg : '画像のアップロードに失敗しました');
        }
        const imageObject = uploadResult.image;

        // 設定を更新
        if (imageType === 'hero') {
          await updateHeroImage(page, imageObject);
        } else {
          await updateBackgroundImage(page, imageObject, isMobile);
        }

        setMessage({ type: 'success', text: '画像を更新しました' });
        setTimeout(() => setMessage(null), 3000);
      } catch (error) {
        console.error('画像アップロードエラー:', error);
        setMessage({ type: 'error', text: error instanceof Error ? error.message : '画像のアップロードに失敗しました' });
      } finally {
        setUploading(prev => ({ ...prev, [uploadKey]: false }));
      }
    };

    input.click();
  };

  const updateHeroImage = async (page: PageType, image: any) => {
    setSaving(true);
    try {
      const currentSettings = heroSettings || {};
      const updateData = {
        ...currentSettings,
        [page]: {
          ...currentSettings[page],
          image,
        },
      };

      const response = await fetch('/api/admin/images/hero', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('設定の更新に失敗しました');
      }

      const updated = await response.json();
      setHeroSettings(updated);
    } catch (error) {
      console.error('設定更新エラー:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const updateBackgroundImage = async (page: PageType, image: any, isMobile: boolean) => {
    setSaving(true);
    try {
      const currentSettings = backgroundSettings || {};
      const pageSettings = currentSettings[page] || {};
      
      const updateData = {
        ...currentSettings,
        [page]: {
          ...pageSettings,
          [isMobile ? 'imageMobile' : 'image']: image,
        },
      };

      const response = await fetch('/api/admin/images/background', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('設定の更新に失敗しました');
      }

      const updated = await response.json();
      setBackgroundSettings(updated);
    } catch (error) {
      console.error('設定更新エラー:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const removeImage = async (page: PageType, imageType: ImageType, isMobile: boolean = false) => {
    if (!confirm('この画像を削除しますか？')) return;

    try {
      if (imageType === 'hero') {
        const currentSettings = heroSettings || {};
        const updateData = {
          ...currentSettings,
          [page]: {
            ...currentSettings[page],
            image: null,
          },
        };

        const response = await fetch('/api/admin/images/hero', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });

        if (response.ok) {
          const updated = await response.json();
          setHeroSettings(updated);
          setMessage({ type: 'success', text: '画像を削除しました' });
        }
      } else {
        const currentSettings = backgroundSettings || {};
        const pageSettings = currentSettings[page] || {};
        
        const updateData = {
          ...currentSettings,
          [page]: {
            ...pageSettings,
            [isMobile ? 'imageMobile' : 'image']: null,
          },
        };

        const response = await fetch('/api/admin/images/background', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });

        if (response.ok) {
          const updated = await response.json();
          setBackgroundSettings(updated);
          setMessage({ type: 'success', text: '画像を削除しました' });
        }
      }
    } catch (error) {
      console.error('画像削除エラー:', error);
      setMessage({ type: 'error', text: '画像の削除に失敗しました' });
    }
  };

  const getImageUrl = (image: any): string | null => {
    if (!image?.asset?._ref) return null;
    try {
      return urlFor(image as SanityImage).url();
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">画像管理</h1>
        <p className="text-gray-600 mt-2">各ページのヒーロー画像・背景画像を管理できます</p>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* タブ */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('hero')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'hero'
                ? 'border-moss-green text-moss-green'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ヒーロー画像
          </button>
          <button
            onClick={() => setActiveTab('background')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'background'
                ? 'border-moss-green text-moss-green'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            背景画像
          </button>
        </nav>
      </div>

      {/* コンテンツ */}
      <div className="space-y-6">
        {(Object.keys(pageInfo) as PageType[]).map((page) => {
          const info = pageInfo[page];
          
          if (activeTab === 'hero') {
            const pageSettings = heroSettings?.[page];
            const image = pageSettings?.image;
            const imageUrl = getImageUrl(image);

            return (
              <Card key={page}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{info.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">推奨サイズ: {info.heroSize}</p>
                    </div>
                    <Button
                      onClick={() => handleImageUpload(page, 'hero')}
                      disabled={uploading[`${page}-hero-pc`] || saving}
                      variant="primary"
                      size="sm"
                    >
                      {uploading[`${page}-hero-pc`] ? 'アップロード中...' : image ? '画像を変更' : '画像を設定'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {imageUrl ? (
                    <div className="space-y-4">
                      <div className="relative w-full max-w-2xl mx-auto bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                        <img
                          src={imageUrl}
                          alt={`${info.name} ヒーロー画像`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          placeholder="代替テキスト（SEO対策）"
                          value={pageSettings?.alt || ''}
                          onChange={(e) => {
                            const currentSettings = heroSettings || {};
                            setHeroSettings({
                              ...currentSettings,
                              [page]: {
                                ...currentSettings[page],
                                alt: e.target.value,
                              },
                            });
                          }}
                          onBlur={async () => {
                            const currentSettings = heroSettings || {};
                            const updateData = {
                              ...currentSettings,
                              [page]: {
                                ...currentSettings[page],
                                image: currentSettings[page]?.image,
                              },
                            };
                            setSaving(true);
                            try {
                              const response = await fetch('/api/admin/images/hero', {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(updateData),
                              });
                              if (response.ok) {
                                const updated = await response.json();
                                setHeroSettings(updated);
                              }
                            } catch (error) {
                              console.error('設定更新エラー:', error);
                            } finally {
                              setSaving(false);
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <Button
                          onClick={() => removeImage(page, 'hero')}
                          variant="outline"
                          size="sm"
                        >
                          削除
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <p className="text-gray-500 mb-4">画像が設定されていません</p>
                      <Button
                        onClick={() => handleImageUpload(page, 'hero')}
                        disabled={uploading[`${page}-hero-pc`] || saving}
                        variant="primary"
                        size="sm"
                      >
                        {uploading[`${page}-hero-pc`] ? 'アップロード中...' : '画像をアップロード'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          } else {
            const pageSettings = backgroundSettings?.[page];
            const pcImage = pageSettings?.image;
            const mobileImage = pageSettings?.imageMobile;
            const pcImageUrl = getImageUrl(pcImage);
            const mobileImageUrl = getImageUrl(mobileImage);

            return (
              <Card key={page}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{info.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        PC: {info.backgroundSize} / モバイル: {info.backgroundMobileSize}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* PC用背景画像 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700">PC用背景画像</h4>
                        <Button
                          onClick={() => handleImageUpload(page, 'background', false)}
                          disabled={uploading[`${page}-background-pc`] || saving}
                          variant="primary"
                          size="sm"
                        >
                          {uploading[`${page}-background-pc`] ? 'アップロード中...' : pcImage ? '変更' : '設定'}
                        </Button>
                      </div>
                      {pcImageUrl ? (
                        <div className="space-y-2">
                          <div className="relative w-full max-w-xs mx-auto bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                            <img
                              src={pcImageUrl}
                              alt={`${info.name} PC背景画像`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Button
                            onClick={() => removeImage(page, 'background', false)}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            削除
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <p className="text-gray-500 text-sm mb-2">未設定</p>
                          <Button
                            onClick={() => handleImageUpload(page, 'background', false)}
                            disabled={uploading[`${page}-background-pc`] || saving}
                            variant="primary"
                            size="sm"
                          >
                            {uploading[`${page}-background-pc`] ? 'アップロード中...' : 'アップロード'}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* モバイル用背景画像 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700">モバイル用背景画像</h4>
                        <Button
                          onClick={() => handleImageUpload(page, 'background', true)}
                          disabled={uploading[`${page}-background-mobile`] || saving}
                          variant="primary"
                          size="sm"
                        >
                          {uploading[`${page}-background-mobile`] ? 'アップロード中...' : mobileImage ? '変更' : '設定'}
                        </Button>
                      </div>
                      {mobileImageUrl ? (
                        <div className="space-y-2">
                          <div className="relative w-full max-w-[120px] mx-auto bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '9/16' }}>
                            <img
                              src={mobileImageUrl}
                              alt={`${info.name} モバイル背景画像`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Button
                            onClick={() => removeImage(page, 'background', true)}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            削除
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <p className="text-gray-500 text-sm mb-2">未設定（PC用画像を使用）</p>
                          <Button
                            onClick={() => handleImageUpload(page, 'background', true)}
                            disabled={uploading[`${page}-background-mobile`] || saving}
                            variant="primary"
                            size="sm"
                          >
                            {uploading[`${page}-background-mobile`] ? 'アップロード中...' : 'アップロード'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 代替テキスト */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      代替テキスト（SEO対策）
                    </label>
                    <input
                      type="text"
                      placeholder="画像の説明文"
                      value={pageSettings?.alt || ''}
                      onChange={(e) => {
                        const currentSettings = backgroundSettings || {};
                        setBackgroundSettings({
                          ...currentSettings,
                          [page]: {
                            ...currentSettings[page],
                            alt: e.target.value,
                          },
                        });
                      }}
                      onBlur={async () => {
                        const currentSettings = backgroundSettings || {};
                        const updateData = {
                          ...currentSettings,
                          [page]: {
                            ...currentSettings[page],
                          },
                        };
                        setSaving(true);
                        try {
                          const response = await fetch('/api/admin/images/background', {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(updateData),
                          });
                          if (response.ok) {
                            const updated = await response.json();
                            setBackgroundSettings(updated);
                          }
                        } catch (error) {
                          console.error('設定更新エラー:', error);
                        } finally {
                          setSaving(false);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          }
        })}
      </div>
    </div>
  );
}
