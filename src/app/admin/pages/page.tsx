'use client';

import { useState, useEffect, useCallback } from 'react';
import { pageContentRegistry, ContentField } from '@/lib/pageContentRegistry';

// 公開ページの文言・画像を編集する画面。
// 編集できる項目は src/lib/pageContentRegistry.ts に定義されたもののみ。
// デフォルト値（コード内の文言）から変更された項目だけがSanityに保存され、
// 「デフォルトに戻す」で保存済みの上書きを破棄できる。

interface SanityImageRef {
  _type: 'image';
  asset: { _type: 'reference'; _ref: string };
}

interface ImageOverride {
  image: SanityImageRef;
  alt: string;
  previewUrl?: string;
}

export default function AdminPagesPage() {
  const pageIds = Object.keys(pageContentRegistry);
  const [pageId, setPageId] = useState(pageIds[0]);
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [imageOverrides, setImageOverrides] = useState<Record<string, ImageOverride>>({});
  const [savedImagePreviews, setSavedImagePreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState('');
  const [message, setMessage] = useState('');

  const page = pageContentRegistry[pageId];

  const loadPage = useCallback(async (targetPageId: string) => {
    setLoading(true);
    setMessage('');
    try {
      const [adminRes, publicRes] = await Promise.all([
        fetch(`/api/admin/page-content/${targetPageId}`),
        // 保存済み画像のプレビューURLは公開APIから取得（URL変換済みのため）
        fetch(`/api/page-content?page=${targetPageId}`),
      ]);
      const adminData = adminRes.ok ? await adminRes.json() : { content: null };
      const publicData = publicRes.ok ? await publicRes.json() : { images: {} };

      const definition = pageContentRegistry[targetPageId];
      const savedTexts = new Map<string, string>(
        (adminData.content?.texts || []).map((t: { key: string; value: string }) => [t.key, t.value])
      );
      const nextTexts: Record<string, string> = {};
      for (const field of definition.fields) {
        if (field.type === 'image') continue;
        nextTexts[field.key] = savedTexts.get(field.key) ?? field.default;
      }
      setTextValues(nextTexts);

      const nextImages: Record<string, ImageOverride> = {};
      for (const img of adminData.content?.images || []) {
        if (img.key && img.image) {
          nextImages[img.key] = { image: img.image, alt: img.alt || '' };
        }
      }
      setImageOverrides(nextImages);

      const previews: Record<string, string> = {};
      for (const [key, value] of Object.entries(publicData.images || {})) {
        previews[key] = (value as { src: string }).src;
      }
      setSavedImagePreviews(previews);
    } catch (err) {
      console.error('ページ文言取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage(pageId);
  }, [pageId, loadPage]);

  const handleUpload = async (field: ContentField, file: File) => {
    setUploadingKey(field.key);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/images/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '画像のアップロードに失敗しました');
      }
      const data = await response.json();
      setImageOverrides(prev => ({
        ...prev,
        [field.key]: { image: data.image, alt: '', previewUrl: data.thumbnailUrl },
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : '画像のアップロードに失敗しました');
    } finally {
      setUploadingKey('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      // デフォルトから変更されたテキストだけを上書きとして保存する
      const texts = page.fields
        .filter(f => f.type !== 'image')
        .filter(f => (textValues[f.key] ?? f.default) !== f.default)
        .map(f => ({ key: f.key, value: textValues[f.key] }));

      const images = Object.entries(imageOverrides).map(([key, ov]) => ({
        key,
        image: ov.image,
        alt: ov.alt,
      }));

      const response = await fetch(`/api/admin/page-content/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, images }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '保存に失敗しました');
      }
      setMessage('保存しました。公開ページに即時反映されます。');
      await loadPage(pageId);
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ページ編集</h1>
        <p className="text-gray-600 mt-2">
          公開ページの文言・画像を編集します。ページのデザインはそのまま、内容だけが差し替わります。
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <label className="block text-sm text-gray-600 mb-1">編集するページ</label>
        <select
          value={pageId}
          onChange={(e) => setPageId(e.target.value)}
          className="w-full px-3 py-3 text-lg border border-gray-300 rounded-md"
        >
          {pageIds.map(id => (
            <option key={id} value={id}>
              {pageContentRegistry[id].title}（{pageContentRegistry[id].path}）
            </option>
          ))}
        </select>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
      ) : (
        <>
          <div className="bg-white shadow rounded-lg divide-y">
            {page.fields.map(field => (
              <div key={field.key} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-900">{field.label}</label>
                  {field.type !== 'image' && textValues[field.key] !== field.default && (
                    <button
                      onClick={() => setTextValues(prev => ({ ...prev, [field.key]: field.default }))}
                      className="text-xs text-gray-500 hover:text-gray-800 underline"
                    >
                      デフォルトに戻す
                    </button>
                  )}
                  {field.type === 'image' && (imageOverrides[field.key] || savedImagePreviews[field.key]) && (
                    <button
                      onClick={() => {
                        setImageOverrides(prev => {
                          const next = { ...prev };
                          delete next[field.key];
                          return next;
                        });
                        setSavedImagePreviews(prev => {
                          const next = { ...prev };
                          delete next[field.key];
                          return next;
                        });
                      }}
                      className="text-xs text-gray-500 hover:text-gray-800 underline"
                    >
                      デフォルトに戻す
                    </button>
                  )}
                </div>

                {field.type === 'text' && (
                  <input
                    type="text"
                    value={textValues[field.key] ?? field.default}
                    onChange={(e) => setTextValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                )}
                {field.type === 'textarea' && (
                  <textarea
                    value={textValues[field.key] ?? field.default}
                    onChange={(e) => setTextValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                )}
                {field.type === 'image' && (
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageOverrides[field.key]?.previewUrl || savedImagePreviews[field.key] || field.default}
                      alt={field.label}
                      className="w-32 h-20 object-cover rounded-md border"
                    />
                    <label className="text-sm px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                      {uploadingKey === field.key ? 'アップロード中...' : '画像を変更'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={uploadingKey === field.key}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(field, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-moss-green text-white text-lg font-medium rounded-md hover:bg-moss-green/90 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </>
      )}
    </div>
  );
}
