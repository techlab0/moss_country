// 決済金額をクライアントの申告値のまま信用しない。
// 商品価格・寸法・重量はすべて Sanity の正規データから取得し、送料・消費税・合計を
// サーバー側で確定する（送料表・ルールは管理画面で編集された送料設定を正とする）。
// これにより価格・送料の改ざんを完全に防ぐ。
//
// CDNキャッシュの古い価格を見てはいけないため、常に最新を返す writeClient を使う。
import { writeClient as client } from '@/lib/sanity';
import { getShippingSettings, resolveShippingFee, type ShippingItem } from '@/lib/shipping';
import { taxBreakdown } from '@/lib/tax';
import type { Cart } from '@/types/ecommerce';

export interface RecalculatedTotals {
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
}

export interface RecalculateOptions {
  // 配送先都道府県。指定時のみ送料を計算する（店頭決済など配送を伴わない場合は省略）
  prefecture?: string;
  // 速達（express）かどうか
  express?: boolean;
}

export class InvalidCartError extends Error {}

interface CanonicalProduct {
  _id: string;
  price: number;
  dimensions?: { width?: number | null; height?: number | null; depth?: number | null } | null;
  weight?: number | null;
  fragile?: boolean | null;
}

export async function recalculateCartTotals(
  cart: Cart,
  options: RecalculateOptions = {}
): Promise<RecalculatedTotals> {
  if (!cart.items || cart.items.length === 0) {
    throw new InvalidCartError('カートが空です');
  }

  const productIds = Array.from(new Set(cart.items.map((item) => item.product?._id).filter(Boolean)));

  // 価格・寸法(size)・重量をまとめて正規データとして取得
  const products: CanonicalProduct[] = await client.fetch(
    `*[_type == "product" && _id in $ids]{ _id, price, "dimensions": size, weight, fragile }`,
    { ids: productIds }
  );

  const productById = new Map(products.map((p) => [p._id, p]));

  let subtotal = 0;
  const shippingItems: ShippingItem[] = [];

  for (const item of cart.items) {
    const canonical = productById.get(item.product?._id);
    if (!canonical || !Number.isFinite(Number(canonical.price))) {
      throw new InvalidCartError(`商品が見つかりません: ${item.product?._id}`);
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new InvalidCartError('数量が不正です');
    }
    subtotal += Number(canonical.price) * item.quantity;
    // 送料計算に使う寸法・重量・割れ物フラグもクライアント値ではなく正規データを使う（送料改ざん防止）
    shippingItems.push({
      dimensions: canonical.dimensions,
      weight: canonical.weight,
      fragile: canonical.fragile,
      quantity: item.quantity,
    });
  }

  // 送料は配送先が指定されている場合のみ、送料設定に基づいてサーバーで確定する
  let shippingCost = 0;
  if (options.prefecture) {
    const settings = await getShippingSettings();
    const result = resolveShippingFee(
      shippingItems,
      options.prefecture,
      subtotal,
      { express: options.express },
      settings
    );
    if (!result.ok) {
      throw new InvalidCartError(result.error || '送料を計算できませんでした');
    }
    shippingCost = result.fee;
  }

  // 商品価格・送料はいずれも税込。合計に上乗せせず、含まれる消費税を内税として逆算する。
  const total = subtotal + shippingCost;
  const tax = taxBreakdown(total).taxAmount;

  return { subtotal, shippingCost, tax, total };
}
