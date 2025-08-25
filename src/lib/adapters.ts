/**
 * 型変換アダプター
 * SanityとECサイト型の安全な相互変換を提供
 */

import type { Product as SanityProduct } from '@/types/sanity';
import type { Product as EcommerceProduct } from '@/types/ecommerce';
import { urlFor } from '@/lib/sanity';

/**
 * Sanity商品をECサイト商品型に変換
 */
export function sanityToEcommerceProduct(sanityProduct: SanityProduct): EcommerceProduct {
  return {
    _id: sanityProduct._id,
    name: sanityProduct.name,
    slug: sanityProduct.slug,
    price: sanityProduct.price,
    description: sanityProduct.description || '',
    category: {
      _ref: sanityProduct.category,
      title: sanityProduct.category
    },
    images: sanityProduct.images?.map(img => ({
      asset: {
        _ref: img.asset._ref,
        url: img.asset ? urlFor(img).url() : '/images/placeholder.jpg'
      },
      alt: `${sanityProduct.name}の商品画像`
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
 * Sanity画像の安全なURL取得
 */
export function getSafeImageUrl(image: NonNullable<SanityProduct['images']>[0] | undefined, width?: number, height?: number): string {
  if (!image?.asset) {
    return '/images/products/terrarium-standard.jpg';
  }
  
  try {
    let urlBuilder = urlFor(image);
    if (width) urlBuilder = urlBuilder.width(width);
    if (height) urlBuilder = urlBuilder.height(height);
    return urlBuilder.url();
  } catch (error) {
    console.warn('Failed to generate image URL:', error);
    return '/images/products/terrarium-standard.jpg';
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