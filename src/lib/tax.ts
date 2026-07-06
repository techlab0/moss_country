// 全商品が消費税10%込みの価格であることを前提に、税込金額から税抜金額・消費税額を逆算する。
// 保存はせず、表示のたびに税込合計から計算する（レシート・売上集計の両方で共通利用）。

export const TAX_RATE = 0.10;

export interface TaxBreakdown {
  excludedAmount: number;
  taxAmount: number;
}

export function taxBreakdown(totalInclusive: number): TaxBreakdown {
  const total = Math.max(0, totalInclusive || 0);
  const excludedAmount = Math.round(total / (1 + TAX_RATE));
  return { excludedAmount, taxAmount: total - excludedAmount };
}
