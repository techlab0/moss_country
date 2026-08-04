// 店頭販売（storeTransaction / inStoreCharge）で売れた分を、EC商品の在庫に反映する。
//
// 在庫を動かす対象は「売上項目（salesItem）を参照していて、その項目に紐づくEC商品が
// ちょうど1件だけ存在する明細」に限る。
//   - 紐づく商品が無い項目（ワークショップ・その場限りの都度入力など）は在庫の概念が無いので対象外
//   - 紐づく商品が複数ある項目は、どの商品の在庫を減らすべきか決められないので対象外
//   - 金額直接入力（variable）の項目でも、商品が1件紐づいていれば数量分だけ在庫を動かす
//
// 在庫数が実態とずれた場合は月末の棚卸しで目視調整する運用のため、ここでの失敗は
// 販売処理そのものを止めない（呼び出し側でログに残すだけ）。

import { writeClient } from '@/lib/sanity';
import { InventoryService } from '@/lib/inventory';

/** 保存済みの明細（Sanity）と入力形式の明細の両方を受け付ける */
export interface StoreInventoryLine {
  salesItem?: { _ref?: string } | null;
  salesItemId?: string;
  quantity?: number;
}

interface InventoryTarget {
  productId: string;
  productName: string;
  quantity: number;
}

function lineSalesItemId(line: StoreInventoryLine): string | undefined {
  return line.salesItemId || line.salesItem?._ref || undefined;
}

/**
 * 明細から在庫を動かす対象（商品IDと数量）を解決する。
 * 同じ売上項目が複数行に分かれていた場合は数量を合算する。
 */
async function resolveTargets(lines: StoreInventoryLine[]): Promise<InventoryTarget[]> {
  const quantityBySalesItem = new Map<string, number>();
  for (const line of lines) {
    const salesItemId = lineSalesItemId(line);
    const quantity = Math.floor(Math.max(0, line.quantity || 0));
    if (!salesItemId || quantity <= 0) continue;
    quantityBySalesItem.set(salesItemId, (quantityBySalesItem.get(salesItemId) || 0) + quantity);
  }
  if (quantityBySalesItem.size === 0) return [];

  const products: Array<{ _id: string; name: string; salesItemId: string }> = await writeClient.fetch(
    `*[_type == "product" && salesItem._ref in $ids]{ _id, name, "salesItemId": salesItem._ref }`,
    { ids: Array.from(quantityBySalesItem.keys()) }
  );

  // 1つの売上項目に複数の商品が紐づいている場合は対象外にする（どれを減らすか決められないため）
  const productsBySalesItem = new Map<string, Array<{ _id: string; name: string }>>();
  for (const product of products) {
    const list = productsBySalesItem.get(product.salesItemId) || [];
    list.push({ _id: product._id, name: product.name });
    productsBySalesItem.set(product.salesItemId, list);
  }

  const targets: InventoryTarget[] = [];
  for (const [salesItemId, quantity] of quantityBySalesItem) {
    const candidates = productsBySalesItem.get(salesItemId);
    if (!candidates || candidates.length !== 1) {
      if (candidates && candidates.length > 1) {
        console.warn(
          `在庫連動をスキップ: 売上項目 ${salesItemId} に商品が${candidates.length}件紐づいているため対象を特定できません`
        );
      }
      continue;
    }
    targets.push({ productId: candidates[0]._id, productName: candidates[0].name, quantity });
  }

  return targets;
}

/** 店頭で売れた分の在庫を減らす */
export async function applyStoreSaleInventory(
  lines: StoreInventoryLine[],
  reasonLabel: string
): Promise<void> {
  const targets = await resolveTargets(lines);
  for (const target of targets) {
    await InventoryService.recordStoreSale(
      target.productId,
      target.quantity,
      `店頭販売 - ${target.productName} ${target.quantity}個（${reasonLabel}）`
    );
  }
}

/** 取り消し・返金・修正時に、減らした在庫を戻す */
export async function revertStoreSaleInventory(
  lines: StoreInventoryLine[],
  reasonLabel: string
): Promise<void> {
  const targets = await resolveTargets(lines);
  for (const target of targets) {
    await InventoryService.restockProduct(
      target.productId,
      target.quantity,
      `店頭販売の取り消し - ${target.productName} ${target.quantity}個（${reasonLabel}）`
    );
  }
}
