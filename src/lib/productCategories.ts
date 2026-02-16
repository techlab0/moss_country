/**
 * 商品カテゴリ定義（共通定数）
 * /products ページの表示順序と、Admin フォームのドロップダウンで使用
 */

export const PRODUCT_CATEGORIES = [
  'テラリウム作品',
  '苔・植物',
  'ツール・容器・照明',
  'その他',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** カテゴリに該当しない商品を「その他」に振り分けるためのヘルパー */
export function resolveCategory(category: string | undefined): ProductCategory {
  if (category && (PRODUCT_CATEGORIES as readonly string[]).includes(category)) {
    return category as ProductCategory;
  }
  return 'その他';
}
