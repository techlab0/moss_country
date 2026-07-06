// 店頭売上（storeTransaction / inStoreCharge）共通のサーバー側ロジック。
// 金額はクライアントの申告値を信用せず、必ずカタログ（salesItem）の単価から再計算する。

import { writeClient } from '@/lib/sanity';
import { dailySalesDocId } from '@/lib/salesAggregation';

export interface StoreLineItemInput {
  salesItemId?: string;
  customName?: string;
  quantity?: number;
  amount?: number;
}

export interface ResolvedLineItem {
  _type: 'lineItem';
  _key: string;
  salesItem?: { _type: 'reference'; _ref: string };
  name: string;
  quantity?: number;
  amount: number;
}

interface SalesItemMeta {
  _id: string;
  name: string;
  pricingType: string;
  unitPrice?: number;
}

/**
 * 入力された明細をカタログ単価で再計算して確定する。
 * - fixed: 数量 × カタログの単価
 * - variable / カタログ外: `amount` を「単価」として受け取り、単価 × 数量（数量省略時は1）
 * マイナスは0として扱い、0円の行は除外する。保存する `amount` は常に行の合計金額。
 */
export async function resolveStoreLineItems(
  input: StoreLineItemInput[]
): Promise<{ lineItems: ResolvedLineItem[]; total: number }> {
  const salesItemIds = input.map(item => item.salesItemId).filter((id): id is string => !!id);
  const salesItemsMeta: SalesItemMeta[] = salesItemIds.length
    ? await writeClient.fetch(
        `*[_type == "salesItem" && _id in $ids]{ _id, name, pricingType, unitPrice }`,
        { ids: salesItemIds }
      )
    : [];
  const metaById = new Map(salesItemsMeta.map(m => [m._id, m]));

  let total = 0;
  const lineItems: ResolvedLineItem[] = [];
  for (const item of input) {
    if (item.salesItemId) {
      const meta = metaById.get(item.salesItemId);
      if (!meta) {
        throw new Error(`商品が見つかりません: ${item.salesItemId}`);
      }
      const isFixed = meta.pricingType === 'fixed';
      const quantity = item.quantity === undefined ? (isFixed ? 0 : 1) : Math.max(0, item.quantity);
      const lineTotal = isFixed
        ? quantity * (meta.unitPrice || 0)
        : quantity * Math.max(0, item.amount || 0);
      if (lineTotal <= 0) continue;

      total += lineTotal;
      lineItems.push({
        _type: 'lineItem',
        _key: item.salesItemId,
        salesItem: { _type: 'reference', _ref: item.salesItemId },
        name: meta.name,
        quantity,
        amount: lineTotal,
      });
    } else if (item.customName && item.customName.trim()) {
      // カタログにない、普段売っていない商品の都度入力（amount = 単価）
      const quantity = item.quantity === undefined ? 1 : Math.max(0, item.quantity);
      const lineTotal = quantity * Math.max(0, item.amount || 0);
      if (lineTotal <= 0) continue;

      total += lineTotal;
      lineItems.push({
        _type: 'lineItem',
        _key: `custom-${lineItems.length}-${Date.now()}`,
        name: item.customName.trim(),
        quantity,
        amount: lineTotal,
      });
    }
  }

  return { lineItems, total };
}

/**
 * 日別売上ドキュメントの来店者数・購入組数を増減する。
 * 加算のみの場合は setIfMissing + inc で原子的に、減算を含む場合は読み取り→0未満クランプ→set で更新する。
 */
export async function adjustDailyCounters(
  date: string,
  visitorDelta: number,
  groupDelta: number
): Promise<void> {
  if (visitorDelta === 0 && groupDelta === 0) return;

  const docId = dailySalesDocId(date);
  await writeClient.createIfNotExists({
    _id: docId,
    _type: 'dailySales',
    date,
    visitorCount: 0,
    purchaseGroupCount: 0,
    updatedAt: new Date().toISOString(),
  });

  if (visitorDelta >= 0 && groupDelta >= 0) {
    await writeClient
      .patch(docId)
      .setIfMissing({ visitorCount: 0, purchaseGroupCount: 0 })
      .inc({ visitorCount: visitorDelta, purchaseGroupCount: groupDelta })
      .commit();
    return;
  }

  const current: { visitorCount?: number; purchaseGroupCount?: number } = await writeClient.fetch(
    `*[_id == $id][0]{ visitorCount, purchaseGroupCount }`,
    { id: docId }
  );
  await writeClient
    .patch(docId)
    .set({
      visitorCount: Math.max(0, (current?.visitorCount || 0) + visitorDelta),
      purchaseGroupCount: Math.max(0, (current?.purchaseGroupCount || 0) + groupDelta),
    })
    .commit();
}

/** UTCのISO日時文字列を日本時間の暦日（YYYY-MM-DD）に変換する */
export function jstDateOf(isoDateTime: string): string {
  const jst = new Date(new Date(isoDateTime).getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

export type DiscountType = 'amount' | 'percent';

/**
 * 会計時の割引を適用する。金額指定は小計を上限にクランプ、パーセント指定は四捨五入。
 * クライアントの申告値は信用せず、サーバー側で必ず再計算すること。
 */
export function applyDiscount(
  subtotal: number,
  discountType?: DiscountType,
  discountValue?: number
): { discountAmount: number; total: number } {
  const value = Math.max(0, discountValue || 0);
  let discountAmount = 0;
  if (discountType === 'amount') {
    discountAmount = Math.min(value, subtotal);
  } else if (discountType === 'percent') {
    discountAmount = Math.round(subtotal * Math.min(value, 100) / 100);
  }
  discountAmount = Math.max(0, Math.min(discountAmount, subtotal));
  return { discountAmount, total: subtotal - discountAmount };
}

/**
 * 過去実績の一括入力のように、1回の割引を複数の支払い方法グループ（小計ごと）に按分する。
 * 各グループの小計比率で割引額を配分し、端数は最大剰余法で調整して合計が必ず一致するようにする。
 */
export function distributeDiscount(
  subtotals: number[],
  discountType?: DiscountType,
  discountValue?: number
): number[] {
  const grandSubtotal = subtotals.reduce((sum, s) => sum + s, 0);
  if (grandSubtotal <= 0) return subtotals.map(() => 0);

  const { discountAmount: totalDiscount } = applyDiscount(grandSubtotal, discountType, discountValue);
  if (totalDiscount <= 0) return subtotals.map(() => 0);

  // 比率按分（小数点以下切り捨て）した上で、端数を小計が大きい順に1円ずつ配分する
  const raw = subtotals.map(s => (s / grandSubtotal) * totalDiscount);
  const floored = raw.map(Math.floor);
  let remainder = totalDiscount - floored.reduce((sum, v) => sum + v, 0);

  const order = subtotals
    .map((s, i) => ({ i, frac: raw[i] - floored[i] }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floored];
  for (const { i } of order) {
    if (remainder <= 0) break;
    result[i] += 1;
    remainder -= 1;
  }
  return result;
}
