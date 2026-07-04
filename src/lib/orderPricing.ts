import { client } from '@/lib/sanity';
import type { Cart } from '@/types/ecommerce';

/**
 * 決済金額をクライアントの申告値のまま信用しない。
 * Sanityの正規価格から小計を再計算し、送料・税・合計はクライアント値に対して
 * 妥当性チェックのみ行った上で最終的な請求額を確定する。
 */

const AMOUNT_TOLERANCE = 2; // 端数計算のずれを許容する誤差（円）
const MAX_SHIPPING_COST = 5000; // 送料の妥当性チェック上限（円）
const MAX_TAX_RATE = 0.15; // 消費税額の妥当性チェック上限（税率換算）

export interface RecalculatedTotals {
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
}

export class InvalidCartError extends Error {}

export async function recalculateCartTotals(cart: Cart): Promise<RecalculatedTotals> {
  if (!cart.items || cart.items.length === 0) {
    throw new InvalidCartError('カートが空です');
  }

  const productIds = Array.from(new Set(cart.items.map(item => item.product?._id).filter(Boolean)));

  const products: Array<{ _id: string; price: number }> = await client.fetch(
    `*[_type == "product" && _id in $ids]{ _id, price }`,
    { ids: productIds }
  );

  const priceById = new Map(products.map(p => [p._id, Number(p.price)]));

  let subtotal = 0;
  for (const item of cart.items) {
    const canonicalPrice = priceById.get(item.product?._id);
    if (canonicalPrice === undefined || !Number.isFinite(canonicalPrice)) {
      throw new InvalidCartError(`商品が見つかりません: ${item.product?._id}`);
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new InvalidCartError('数量が不正です');
    }
    subtotal += canonicalPrice * item.quantity;
  }

  // 送料はクライアント計算値をそのまま採用しつつ、明らかな改ざん・不正値のみ弾く
  const shippingCost = Number(cart.shippingCost);
  if (!Number.isFinite(shippingCost) || shippingCost < 0 || shippingCost > MAX_SHIPPING_COST) {
    throw new InvalidCartError('送料が不正です');
  }

  // 消費税もクライアント計算値を採用しつつ、上限で妥当性チェック
  const tax = Number(cart.tax);
  if (!Number.isFinite(tax) || tax < 0 || tax > (subtotal + shippingCost) * MAX_TAX_RATE) {
    throw new InvalidCartError('消費税額が不正です');
  }

  const total = subtotal + shippingCost + tax;

  // クライアントの合計申告値と再計算結果を突き合わせ、ずれがあれば改ざん・計算バグとして拒否する
  const clientTotal = Number(cart.total);
  if (!Number.isFinite(clientTotal) || Math.abs(clientTotal - total) > AMOUNT_TOLERANCE) {
    throw new InvalidCartError('合計金額が一致しません。カートの内容をご確認のうえ、やり直してください。');
  }

  return { subtotal, shippingCost, tax, total };
}
