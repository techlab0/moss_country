/**
 * 型変換アダプター
 * SanityとECサイト型の安全な相互変換を提供
 */

import type { Product as SanityProduct } from '@/types/sanity';

/** 商品画像がない・エラー時のフォールバック（ロゴ） */
export const PRODUCT_IMAGE_FALLBACK_LOGO = '/images/mosscountry_logo.svg';

/** slug が文字列 or { current: string } のどちらでもスラッグ文字列を返す */
export function getProductSlug(product: { slug?: string | { current?: string } | null }): string {
  if (!product?.slug) return '';
  const s = product.slug;
  return typeof s === 'string' ? s : (s?.current ?? '');
}
import type { Product as EcommerceProduct } from '@/types/ecommerce';
import { urlFor } from '@/lib/sanity';

/**
 * Sanity商品をECサイト商品型に変換（画像URLは getSafeImageUrl で安全に取得）
 */
export function sanityToEcommerceProduct(sanityProduct: SanityProduct): EcommerceProduct {
  const name = String(sanityProduct?.name ?? '')
  return {
    _id: sanityProduct._id,
    name,
    slug: sanityProduct.slug,
    price: Number(sanityProduct?.price) ?? 0,
    description: String(sanityProduct?.description ?? ''),
    category: {
      _ref: String(sanityProduct?.category ?? ''),
      title: String(sanityProduct?.category ?? '')
    },
    images: sanityProduct.images?.map(img => ({
      asset: {
        _ref: (img?.asset && typeof img.asset === 'object' && '_ref' in img.asset ? (img.asset as { _ref: string })._ref : '') || '',
        url: getSafeImageUrl(img)
      },
      alt: `${name}の商品画像`
    })) || [],
    inStock: sanityProduct.inStock ?? true,
    stockQuantity: 10, // デフォルト在庫数
    size: 'M', // デフォルトサイズ
    materials: sanityProduct.materials || [],
    careInstructions: sanityProduct.careInstructions || '',
    weight: 0.5, // デフォルト重量
    variants: [],
    shippingInfo: '通常配送対応'
  };
}

/**
 * Sanity画像の安全なURL取得（画像なし・エラー時はロゴを返す）
 * asset に _ref がある参照のみ urlFor に渡す（展開済み asset だと落ちるため）
 */
export function getSafeImageUrl(image: NonNullable<SanityProduct['images']>[0] | undefined, width?: number, height?: number): string {
  try {
    const ref = image?.asset && typeof image.asset === 'object' && '_ref' in image.asset ? (image.asset as { _ref: string })._ref : null;
    if (!ref || typeof ref !== 'string') {
      return PRODUCT_IMAGE_FALLBACK_LOGO;
    }
    const source = { _type: 'image' as const, asset: { _type: 'reference' as const, _ref: ref } };
    let urlBuilder = urlFor(source);
    if (width) urlBuilder = urlBuilder.width(width);
    if (height) urlBuilder = urlBuilder.height(height);
    return urlBuilder.url();
  } catch {
    return PRODUCT_IMAGE_FALLBACK_LOGO;
  }
}

/**
 * 在庫状況の安全な取得
 */
// Sanity型にはstockプロパティがないので、デフォルト値を返す
export function getSafeStock(): number {
  return 10;
}

/**
 * 在庫有無の安全な取得
 */
export function getSafeInStock(product: SanityProduct): boolean {
  return product.inStock ?? true;
}

/**
 * ECサイト商品の画像URLを安全に取得
 */
export function getEcommerceImageUrl(image: EcommerceProduct['images'][0] | undefined): string {
  if (!image?.asset?.url) {
    return '/images/products/terrarium-standard.jpg';
  }
  return image.asset.url;
}

/**
 * ECサイト商品の在庫数を安全に取得
 */
export function getEcommerceStock(product: EcommerceProduct): number {
  return product.stockQuantity || 10;
}