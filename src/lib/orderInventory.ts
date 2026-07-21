import { InventoryService } from '@/lib/inventory';
import type { OrderItemSnapshot } from '@/lib/orders';

/**
 * 注文をキャンセル/返金する際の在庫の戻し処理。
 * 決済確定済み（paymentStatus === 'paid'、在庫は既に実在庫から減算済み）なら実在庫を復元し、
 * それ以外（決済前で在庫は「予約」段階）なら予約を解放するだけにする。
 * InventoryService 側で orderId をキーに二重処理を防ぐ想定。
 */
export async function restoreOrderInventory(
  order: { paymentStatus?: string; items?: OrderItemSnapshot[] },
  orderId: string
) {
  const items = (order.items || []).map(item => ({
    productId: item.productId,
    quantity: item.quantity,
  }));

  if (items.length === 0) return;

  if (order.paymentStatus === 'paid') {
    await InventoryService.restoreCartItems(items, orderId);
  } else {
    await InventoryService.releaseCartItems(items, orderId);
  }
}
