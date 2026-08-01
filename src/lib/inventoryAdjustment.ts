const PRODUCT_ID_RE = /^[A-Za-z0-9._-]{1,128}$/;
const MAX_STOCK_QUANTITY = 1_000_000;
const MAX_NOTE_LENGTH = 200;

export interface InventoryAdjustment {
  productId: string;
  stockQuantity: number;
  note: string;
}

export type InventoryAdjustmentParseResult =
  | { ok: true; value: InventoryAdjustment }
  | { ok: false; error: string };

export function parseInventoryAdjustment(input: unknown): InventoryAdjustmentParseResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: '入力形式が不正です' };
  }

  const body = input as Record<string, unknown>;
  const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
  const stockQuantity = body.stockQuantity;
  const note = typeof body.note === 'string' ? body.note.trim() : '';

  if (!PRODUCT_ID_RE.test(productId)) {
    return { ok: false, error: '商品IDが不正です' };
  }
  if (
    typeof stockQuantity !== 'number' ||
    !Number.isSafeInteger(stockQuantity) ||
    stockQuantity < 0 ||
    stockQuantity > MAX_STOCK_QUANTITY
  ) {
    return { ok: false, error: `在庫数は0〜${MAX_STOCK_QUANTITY.toLocaleString()}の整数で指定してください` };
  }
  if (!note || note.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: `変更理由は1〜${MAX_NOTE_LENGTH}文字で入力してください` };
  }

  return { ok: true, value: { productId, stockQuantity, note } };
}
