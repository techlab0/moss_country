'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { BlogPost } from '@/types/sanity';
import { generateSEOFriendlySlug } from '@/lib/slugUtils';

interface BlogFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  featuredImage?: string;
}

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  
  const [originalPost, setOriginalPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState<BlogFormData>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: 'other',
    tags: [],
    isPublished: false,
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [slugError, setSlugError] = useState('');

  const categories = [
    { value: 'news', label: 'お知らせ' },
    { value: 'howto', label: 'テラリウムの作り方' },
    { value: 'plants', label: '植物について' },
    { value: 'maintenance', label: 'メンテナンス' },
    { value: 'events', label: 'イベント' },
    { value: 'other', label: 'その他' },
  ];

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      const response = await fetch('/api/admin/blog');
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      const posts: BlogPost[] = await response.json();
      const post = posts.find(p => p._id === postId);
      
      if (!post) {
        throw new Error('Post not found');
      }

      setOriginalPost(post);
      
      // Sanityのblock contentをプレーンテキストに変換
      let contentText = '';
      if (post.content && Array.isArray(post.content)) {
        contentText = post.content
          .filter((block: any) => block._type === 'block')
          .map((block: any) => 
            block.children
              ?.map((child: any) => child.text || '')
              .join('')
          )
          .join('\n\n') || '';
      }

      setFormData({
        title: post.title || '',
        slug: post.slug?.current || '',
        excerpt: post.excerpt || '',
        content: contentText,
        category: post.category || 'other',
        tags: post.tags || [],
        isPublished: post.isPublished || false,
      });
      
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // スラッグが変更された場合はエラーをクリア
      if (name === 'slug') {
        setSlugError('');
      }
    }
  };

  // スラッグの重複チェック
  const checkSlugDuplication = async (slug: string) => {
    if (!slug.trim()) return;
    
    try {
      const response = await fetch('/api/admin/blog/check-slug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug, excludeId: postId }),
      });
      
      const { exists } = await response.json();
      
      if (exists) {
        setSlugError('このスラッグは既に使用されています。別のスラッグを入力してください。');
      } else {
        setSlugError('');
      }
    } catch (error) {
      console.error('Failed to check slug:', error);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (!formData.title.trim() || !formData.excerpt.trim() || !formData.slug.trim()) {
        throw new Error('タイトル、スラッグ、概要は必須です');
      }

      // スラッグの検証（英数字とハイフンのみ）
      if (!/^[a-z0-9-]+$/.test(formData.slug)) {
        throw new Error('スラッグは英小文字、数字、ハイフンのみ使用可能です');
      }

      // スラッグの重複チェック
      if (slugError) {
        throw new Error('スラッグの重複エラーを解決してください');
      }

      const updatePayload = {
        title: formData.title,
        slug: {
          _type: 'slug',
          current: formData.slug,
        },
        excerpt: formData.excerpt,
        category: formData.category,
        tags: formData.tags,
        isPublished: formData.isPublished,
        // 簡単なマークダウンをSanityのblock形式に変換
        content: formData.content.split('\n\n').filter(p => p.trim()).map((paragraph, index) => ({
          _type: 'block',
          _key: `block-${index}`,
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: `span-${index}`,
              text: paragraph,
              marks: [],
            },
          ],
        })),
        publishedAt: formData.isPublished && !originalPost?.isPublished 
          ? new Date().toISOString() 
          : originalPost?.publishedAt,
      };

      console.log('Sending update payload:', updatePayload);

      const response = await fetch(`/api/admin/blog/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Update error response:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to update blog post');
      }

      router.push('/admin/blog');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  const generateSlug = async () => {
    if (!formData.title.trim()) return;
    
    try {
      const response = await fetch('/api/admin/blog/generate-slug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: formData.title,
          excludeId: postId 
        }),
      });
      
      const { slug, isUnique } = await response.json();
      setFormData(prev => ({ ...prev, slug }));
      setSlugError('');
      
      if (!isUnique) {
        console.log('Generated unique slug with suffix:', slug);
      }
    } catch (error) {
      console.error('Failed to generate slug:', error);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error && !originalPost) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
        <Link
          href="/admin/blog"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          ← 記事一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">記事編集</h1>
          <p className="text-gray-600 mt-2">{originalPost?.title}</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/blog/${originalPost?.slug?.current}`}
            target="_blank"
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            プレビュー
          </Link>
          <Link
            href="/admin/blog"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            ← 記事一覧に戻る
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">基本情報</h2>
          
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                タイトル *
              </label>
              <input
                type="text"
                name="title"
                id="title"
                required
                value={formData.title}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-moss-green focus:border-moss-green sm:text-sm"
                placeholder="記事のタイトルを入力"
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                URL スラッグ *
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <div className="relative flex items-stretch flex-grow focus-within:z-10">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">/blog/</span>
                  </div>
                  <input
                    type="text"
                    name="slug"
                    id="slug"
                    required
                    value={formData.slug}
                    onChange={handleInputChange}
                    onBlur={(e) => checkSlugDuplication(e.target.value)}
                    className={`focus:ring-moss-green focus:border-moss-green block w-full pl-16 pr-3 py-2 rounded-l-md sm:text-sm ${
                      slugError ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="article-slug"
                    pattern="[a-z0-9-]+"
                    title="英小文字、数字、ハイフンのみ使用可能"
                  />
                </div>
                <button
                  type="button"
                  onClick={generateSlug}
                  disabled={!formData.title.trim()}
                  className="relative -ml-px inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-moss-green focus:border-moss-green disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>自動生成</span>
                </button>
              </div>
              {slugError ? (
                <p className="mt-1 text-sm text-red-600">
                  {slugError}
                </p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  記事のURLになります。英小文字、数字、ハイフンのみ使用可能です。
                </p>
              )}
              {formData.slug && !slugError && (
                <p className="mt-1 text-sm text-moss-green">
                  プレビュー: /blog/{formData.slug}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700">
                概要 *
              </label>
              <textarea
                name="excerpt"
                id="excerpt"
                required
                rows={3}
                value={formData.excerpt}
                onChange={handleInputChange}
                maxLength={200}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-moss-green focus:border-moss-green sm:text-sm"
                placeholder="記事の概要を入力（200文字以内）"
              />
              <p className="mt-1 text-sm text-gray-500">
                {formData.excerpt.length}/200文字
              </p>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                カテゴリ
              </label>
              <select
                name="category"
                id="category"
                value={formData.category}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-moss-green focus:border-moss-green sm:text-sm"
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">本文</h2>
          
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              記事内容
            </label>
            <textarea
              name="content"
              id="content"
              rows={12}
              value={formData.content}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-moss-green focus:border-moss-green sm:text-sm"
              placeholder="記事の本文を入力してください..."
            />
            <p className="mt-1 text-sm text-gray-500">
              改行2つで段落分けされます
            </p>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">追加設定</h2>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                タグ
              </label>
              <div className="mt-1 flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium bg-moss-green text-white rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-white hover:text-gray-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-moss-green focus:border-moss-green sm:text-sm"
                  placeholder="タグを入力してEnterまたは追加ボタン"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  追加
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="isPublished"
                id="isPublished"
                checked={formData.isPublished}
                onChange={handleInputChange}
                className="h-4 w-4 text-moss-green focus:ring-moss-green border-gray-300 rounded"
              />
              <label htmlFor="isPublished" className="ml-2 block text-sm text-gray-900">
                公開する
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Link
            href="/admin/blog"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-moss-green hover:bg-moss-green/90 disabled:opacity-50"
          >
            {saving ? '保存中...' : '変更を保存'}
          </button>
        </div>
      </form>
    </div>
  );
}