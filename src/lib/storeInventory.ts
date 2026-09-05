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
  name?: string;
  quantity?: number;
}

interface InventoryTarget {
  productId: string;
  productName: string;
  quantity: number;
}

export interface StoreInventoryWarning {
  salesItemId?: string;
  itemName: string;
  message: string;
}

export interface StoreInventoryResult {
  updated: Array<{ productId: string; productName: string; quantity: number }>;
  warnings: StoreInventoryWarning[];
}

/** inStoreChargeへ保存できるSanity形式に変換する */
export function storeInventoryResultFields(result: StoreInventoryResult) {
  return {
    inventoryProcessed: true,
    inventoryWarnings: result.warnings.map((warning, index) => ({
      _key: `inventory-warning-${index}`,
      itemName: warning.itemName,
      message: warning.message,
    })),
  };
}

export function storeInventoryFailureFields() {
  return storeInventoryResultFields({
    updated: [],
    warnings: [{ itemName: '販売商品', message: '在庫更新処理でエラーが発生しました' }],
  });
}

function lineSalesItemId(line: StoreInventoryLine): string | undefined {
  return line.salesItemId || line.salesItem?._ref || undefined;
}

/**
 * 明細から在庫を動かす対象（商品IDと数量）を解決する。
 * 同じ売上項目が複数行に分かれていた場合は数量を合算する。
 */
async function resolveTargets(lines: StoreInventoryLine[]): Promise<{
  targets: InventoryTarget[];
  warnings: StoreInventoryWarning[];
}> {
  const quantityBySalesItem = new Map<string, number>();
  const nameBySalesItem = new Map<string, string>();
  for (const line of lines) {
    const salesItemId = lineSalesItemId(line);
    const quantity = Math.floor(Math.max(0, line.quantity || 0));
    if (!salesItemId || quantity <= 0) continue;
    quantityBySalesItem.set(salesItemId, (quantityBySalesItem.get(salesItemId) || 0) + quantity);
    if (line.name) nameBySalesItem.set(salesItemId, line.name);
  }
  if (quantityBySalesItem.size === 0) return { targets: [], warnings: [] };

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
  const warnings: StoreInventoryWarning[] = [];
  for (const [salesItemId, quantity] of quantityBySalesItem) {
    const candidates = productsBySalesItem.get(salesItemId);
    if (!candidates || candidates.length !== 1) {
      const itemName = nameBySalesItem.get(salesItemId) || salesItemId;
      if (candidates && candidates.length > 1) {
        console.warn(
          `在庫連動をスキップ: 売上項目 ${salesItemId} に商品が${candidates.length}件紐づいているため対象を特定できません`
        );
        warnings.push({
          salesItemId,
          itemName,
          message: `同じ売上項目に商品が${candidates.length}件紐づいているため、対象を特定できません`,
        });
      } else {
        warnings.push({
          salesItemId,
          itemName,
          message: '売上項目に紐づく商品が設定されていません',
        });
      }
      continue;
    }
    targets.push({ productId: candidates[0]._id, productName: candidates[0].name, quantity });
  }

  return { targets, warnings };
}

/** 店頭で売れた分の在庫を減らす */
export async function applyStoreSaleInventory(
  lines: StoreInventoryLine[],
  reasonLabel: string
): Promise<StoreInventoryResult> {
  const { targets, warnings } = await resolveTargets(lines);
  const updated: StoreInventoryResult['updated'] = [];
  for (const target of targets) {
    const result = await InventoryService.recordStoreSale(
      target.productId,
      target.quantity,
      `店頭販売 - ${target.productName} ${target.quantity}個（${reasonLabel}）`
    );
    if (result.applied > 0) {
      updated.push({ ...target, quantity: result.applied });
    }
    if (result.applied < result.requested) {
      const shortage = result.requested - result.applied;
      warnings.push({
        itemName: target.productName,
        message: result.error
          ? '在庫更新処理でエラーが発生したため反映されませんでした'
          : result.applied === 0
            ? `販売数${result.requested}個を反映できませんでした（現在庫0個）`
            : `販売数${result.requested}個のうち${result.applied}個だけ反映され、${shortage}個は在庫不足でした`,
      });
    }
  }
  return { updated, warnings };
}

/** 取り消し・返金・修正時に、減らした在庫を戻す */
export async function revertStoreSaleInventory(
  lines: StoreInventoryLine[],
  reasonLabel: string
): Promise<void> {
  const { targets } = await resolveTargets(lines);
  for (const target of targets) {
    await InventoryService.restockProduct(
      target.productId,
      target.quantity,
      `店頭販売の取り消し - ${target.productName} ${target.quantity}個（${reasonLabel}）`
    );
  }
}
