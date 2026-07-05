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
 * fixed: 数量×単価、variable/カタログ外: 金額直接入力。マイナスは0として扱い、0円の行は除外する。
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
      const quantity = Math.max(0, item.quantity || 0);
      const lineTotal = meta.pricingType === 'fixed'
        ? quantity * (meta.unitPrice || 0)
        : Math.max(0, item.amount || 0);
      if (lineTotal <= 0) continue;

      total += lineTotal;
      lineItems.push({
        _type: 'lineItem',
        _key: item.salesItemId,
        salesItem: { _type: 'reference', _ref: item.salesItemId },
        name: meta.name,
        quantity: meta.pricingType === 'fixed' ? quantity : undefined,
        amount: lineTotal,
      });
    } else if (item.customName && item.customName.trim()) {
      // カタログにない、普段売っていない商品の都度入力
      const lineTotal = Math.max(0, item.amount || 0);
      if (lineTotal <= 0) continue;

      total += lineTotal;
      lineItems.push({
        _type: 'lineItem',
        _key: `custom-${lineItems.length}-${Date.now()}`,
        name: item.customName.trim(),
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
