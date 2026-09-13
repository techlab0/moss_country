'use client';

import { useEffect, useState } from 'react';
import { BLOG_CTA_MAX_ITEMS, type BlogCtaInput } from '@/lib/blogCta';

interface BlogCtaEditorProps {
  links: BlogCtaInput[];
  onChange: (links: BlogCtaInput[]) => void;
}

interface ProductOption {
  _id: string;
  name: string;
  slug?: { current?: string };
  thumbnailUrl?: string | null;
  isVisible?: boolean;
}

function createItem(): BlogCtaInput {
  return {
    _key: `cta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: '',
    url: '',
    product: null,
  };
}

function selectedProductId(item: BlogCtaInput): string {
  const product = item.product;
  if (!product || typeof product !== 'object' || !('_ref' in product)) return '';
  return typeof product._ref === 'string' ? product._ref : '';
}

export function BlogCtaEditor({ links, onChange }: BlogCtaEditorProps) {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadProducts = async () => {
      try {
        const response = await fetch('/api/admin/products');
        if (!response.ok) throw new Error('商品一覧を取得できませんでした');
        const data = await response.json();
        if (!cancelled) setProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!cancelled) setProductsError(error instanceof Error ? error.message : '商品一覧を取得できませんでした');
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    };
    loadProducts();
    return () => { cancelled = true; };
  }, []);

  const updateItem = (index: number, field: 'label' | 'url', value: string) => {
    onChange(links.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  const removeItem = (index: number) => {
    onChange(links.filter((_, itemIndex) => itemIndex !== index));
  };

  const selectProduct = (index: number, productId: string) => {
    const selected = products.find((product) => product._id === productId);
    onChange(links.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      if (!productId) return { ...item, product: null };
      return {
        ...item,
        product: { _type: 'reference', _ref: productId },
        url: '',
        label: item.label || (selected ? `${selected.name}を見る` : ''),
      };
    }));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= links.length) return;
    const next = [...links];
    [next[index], next[destination]] = [next[destination], next[index]];
    onChange(next);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">記事下の案内ボタン</h2>
          <p className="text-sm text-gray-600">
            紹介した商品や予約などのページへ案内できます。最大{BLOG_CTA_MAX_ITEMS}個まで表示できます。
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...links, createItem()])}
          disabled={links.length >= BLOG_CTA_MAX_ITEMS}
          className="rounded-md bg-moss-green px-4 py-2 text-sm font-medium text-white hover:bg-moss-green/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ＋ ボタンを追加
        </button>
      </div>

      {links.length === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-sm text-gray-500">
          案内ボタンは設定されていません。
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {links.map((item, index) => {
            const productId = selectedProductId(item);
            const selected = products.find((product) => product._id === productId);
            const missingSelection = productId && !selected;
            return (
              <div key={item._key || index} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-700">ボタン {index + 1}</p>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 disabled:opacity-40"
                    aria-label={`ボタン${index + 1}を上へ移動`}
                  >
                    ↑ 上へ
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(index, 1)}
                    disabled={index === links.length - 1}
                    className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 disabled:opacity-40"
                    aria-label={`ボタン${index + 1}を下へ移動`}
                  >
                    ↓ 下へ
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="rounded border border-red-200 bg-white px-2.5 py-1 text-xs text-red-700 hover:bg-red-50"
                  >
                    削除
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor={`cta-product-${index}`} className="block text-sm font-medium text-gray-700">
                  商品ページと画像を自動表示
                </label>
                <select
                  id={`cta-product-${index}`}
                  value={productId}
                  onChange={(event) => selectProduct(index, event.target.value)}
                  disabled={productsLoading}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-moss-green focus:ring-moss-green disabled:bg-gray-100 sm:text-sm"
                >
                  <option value="">商品を選ばず、URLを入力する</option>
                  {missingSelection && <option value={productId}>選択済み商品（現在取得できません）</option>}
                  {products.map((product) => (
                    <option key={product._id} value={product._id} disabled={product.isVisible === false}>
                      {product.name}{product.isVisible === false ? '（非公開）' : ''}
                    </option>
                  ))}
                </select>
                {productsError && <p className="mt-1 text-xs text-red-600">{productsError}。通常URLのボタンは設定できます。</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor={`cta-label-${index}`} className="block text-sm font-medium text-gray-700">
                    ボタンに表示する文字
                  </label>
                  <input
                    type="text"
                    id={`cta-label-${index}`}
                    maxLength={60}
                    value={item.label || ''}
                    onChange={(event) => updateItem(index, 'label', event.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-moss-green focus:ring-moss-green sm:text-sm"
                    placeholder="例：この商品を見る"
                  />
                </div>
                {selected ? (
                  <div>
                    <p className="block text-sm font-medium text-gray-700">自動表示される商品</p>
                    <div className="mt-1 flex min-h-24 items-center gap-3 rounded-md border border-emerald-200 bg-white p-3">
                      {selected.thumbnailUrl ? (
                        <img src={selected.thumbnailUrl} alt="" className="h-20 w-20 rounded object-cover" />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">画像なし</div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{selected.name}</p>
                        <p className="mt-1 break-all text-xs text-gray-500">/shop/{selected.slug?.current || ''}</p>
                        <p className="mt-1 text-xs text-emerald-700">商品ページの最新画像を自動表示します</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                  <label htmlFor={`cta-url-${index}`} className="block text-sm font-medium text-gray-700">
                    移動先URL
                  </label>
                  <input
                    type="text"
                    id={`cta-url-${index}`}
                    value={item.url || ''}
                    onChange={(event) => updateItem(index, 'url', event.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-moss-green focus:ring-moss-green sm:text-sm"
                    placeholder="例：/shop/商品名"
                  />
                  <p className="mt-1 text-xs text-gray-500">商品ページを開き、アドレス欄のURLをコピーして貼り付けられます。</p>
                  </div>
                )}
              </div>

              {item.label && (item.url || productId) && (
                <div className="mt-4 text-center">
                  <span className="inline-flex items-center rounded-lg bg-moss-green px-5 py-2.5 text-sm font-medium text-white shadow">
                    {item.label}
                    <span aria-hidden="true" className="ml-2">→</span>
                  </span>
                </div>
              )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
