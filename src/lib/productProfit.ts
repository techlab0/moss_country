export type OptionalCostPriceResult =
  | { ok: true; value: number | undefined }
  | { ok: false; reason: string };

export interface ProductProfit {
  profit: number;
  marginPercent: number | null;
}

/** 管理画面/APIから受け取った任意の原価を、安全な数値へ変換する。 */
export function parseOptionalCostPrice(value: unknown): OptionalCostPriceResult {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return { ok: true, value: undefined };
  }

  if (typeof value !== 'number' && typeof value !== 'string') {
    return { ok: false, reason: '原価は0円以上の数値で入力してください' };
  }

  const costPrice = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(costPrice) || costPrice < 0) {
    return { ok: false, reason: '原価は0円以上の数値で入力してください' };
  }

  return { ok: true, value: costPrice };
}

/** 販売価格と任意の原価から、商品単体の目安利益を計算する。 */
export function calculateProductProfit(
  sellingPrice: number,
  costPrice: number | undefined,
): ProductProfit | null {
  if (costPrice === undefined || !Number.isFinite(sellingPrice) || !Number.isFinite(costPrice) || costPrice < 0) {
    return null;
  }

  const profit = sellingPrice - costPrice;
  return {
    profit,
    marginPercent: sellingPrice > 0 ? (profit / sellingPrice) * 100 : null,
  };
}
