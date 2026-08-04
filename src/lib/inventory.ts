// 在庫管理システム - Sanity CMS連携
// 決済前の在庫確認など「今この瞬間の正確な在庫数」が必須の処理のため、
// CDNキャッシュが効く client ではなく、常に最新を返す writeClient を使う
import { revalidateTag } from 'next/cache';
import { writeClient as client } from '@/lib/sanity';
import type { Product } from '@/types/ecommerce';

/**
 * 在庫を変更したあと、公開ページ（商品一覧・商品詳細）のキャッシュを破棄する。
 * これらは `products` タグ付きで60秒キャッシュされるため、これを呼ばないと購入で
 * 売り切れた商品が最大60秒「在庫あり」のまま表示され続ける。
 *
 * revalidateTag はリクエストのライフサイクル内でのみ有効なため、
 * 万一それ以外から呼ばれても在庫更新自体は止めないようにする。
 */
function revalidateProductCache(): void {
  try {
    revalidateTag('products');
  } catch (error) {
    console.warn('在庫更新後の商品キャッシュ破棄に失敗しました:', error);
  }
}

export interface InventoryUpdate {
  productId: string;
  quantityChange: number;
  operation: 'reserve' | 'release' | 'purchase' | 'restock';
  orderId?: string;
  reason?: string;
}

export interface InventoryStatus {
  productId: string;
  availableStock: number;
  reservedStock: number;
  totalStock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  lastUpdated: string;
}

export class InventoryService {
  // 商品の在庫状況を取得
  static async getInventoryStatus(productId: string): Promise<InventoryStatus | null> {
    try {
      const product = await client.fetch(`
        *[_type == "product" && _id == $productId][0]{
          _id,
          stockQuantity,
          reserved,
          lowStockThreshold,
          _updatedAt
        }
      `, { productId });

      if (!product) return null;

      const reserved = product.reserved || 0;
      const totalStock = product.stockQuantity || 0;
      const availableStock = Math.max(0, totalStock - reserved);
      const lowStockThreshold = product.lowStockThreshold || 5;

      return {
        productId: product._id,
        availableStock,
        reservedStock: reserved,
        totalStock,
        lowStockThreshold,
        isLowStock: availableStock <= lowStockThreshold && availableStock > 0,
        isOutOfStock: availableStock === 0,
        lastUpdated: product._updatedAt || new Date().toISOString()
      };
    } catch (error) {
      console.error('在庫状況取得エラー:', error);
      return null;
    }
  }

  // 複数商品の在庫状況を一括取得
  static async getBulkInventoryStatus(productIds: string[]): Promise<InventoryStatus[]> {
    try {
      const products = await client.fetch(`
        *[_type == "product" && _id in $productIds]{
          _id,
          stockQuantity,
          reserved,
          lowStockThreshold,
          _updatedAt
        }
      `, { productIds });

      return products.map((product: { _id: string; reserved?: number; stockQuantity?: number; lowStockThreshold?: number; _updatedAt?: string }) => {
        const reserved = product.reserved || 0;
        const totalStock = product.stockQuantity || 0;
        const availableStock = Math.max(0, totalStock - reserved);
        const lowStockThreshold = product.lowStockThreshold || 5;

        return {
          productId: product._id,
          availableStock,
          reservedStock: reserved,
          totalStock,
          lowStockThreshold,
          isLowStock: availableStock <= lowStockThreshold && availableStock > 0,
          isOutOfStock: availableStock === 0,
          lastUpdated: product._updatedAt || new Date().toISOString()
        };
      });
    } catch (error) {
      console.error('一括在庫状況取得エラー:', error);
      return [];
    }
  }

  // 在庫を予約（カートに追加時）
  static async reserveStock(productId: string, quantity: number, orderId?: string): Promise<boolean> {
    try {
      // 現在の在庫状況を確認
      const status = await this.getInventoryStatus(productId);
      if (!status || status.availableStock < quantity) {
        console.warn(`在庫不足: ${productId} - 要求: ${quantity}, 利用可能: ${status?.availableStock || 0}`);
        return false;
      }

      // 予約在庫を増加（reservedフィールドが未設定のドキュメントでも失敗しないよう、先に0で初期化する）
      await client
        .patch(productId)
        .setIfMissing({ reserved: 0 })
        .inc({ reserved: quantity })
        .commit();
      revalidateProductCache();

      console.log(`在庫予約成功: ${productId} - ${quantity}個予約`);
      
      // 在庫更新ログを記録
      await this.logInventoryChange({
        productId,
        quantityChange: quantity,
        operation: 'reserve',
        orderId,
        reason: `カートへの追加 - ${quantity}個予約`
      });

      return true;
    } catch (error) {
      console.error('在庫予約エラー:', error);
      return false;
    }
  }

  // 予約在庫を解放（カートから削除時）
  static async releaseStock(productId: string, quantity: number, orderId?: string): Promise<boolean> {
    try {
      // 予約在庫を減少（0を下回らないよう制限）
      const product = await client.fetch(`*[_type == "product" && _id == $productId][0]{ reserved }`, { productId });
      const currentReserved = product?.reserved || 0;
      const releaseAmount = Math.min(quantity, currentReserved);

      if (releaseAmount > 0) {
        await client
          .patch(productId)
          .setIfMissing({ reserved: 0 })
          .inc({ reserved: -releaseAmount })
          .commit();
        revalidateProductCache();

        console.log(`予約在庫解放: ${productId} - ${releaseAmount}個解放`);
        
        // 在庫更新ログを記録
        await this.logInventoryChange({
          productId,
          quantityChange: -releaseAmount,
          operation: 'release',
          orderId,
          reason: `カートからの削除 - ${releaseAmount}個解放`
        });
      }

      return true;
    } catch (error) {
      console.error('予約在庫解放エラー:', error);
      return false;
    }
  }

  // 購入確定（予約を実在庫から減算）
  static async confirmPurchase(productId: string, quantity: number, orderId: string): Promise<boolean> {
    try {
      // 予約在庫を減少し、実在庫も減少
      const product = await client.fetch(`
        *[_type == "product" && _id == $productId][0]{
          stockQuantity,
          reserved
        }
      `, { productId });

      const currentStock = product?.stockQuantity || 0;
      const currentReserved = product?.reserved || 0;
      
      if (currentStock < quantity) {
        console.error(`購入確定失敗: ${productId} - 在庫不足`);
        return false;
      }

      // 実在庫と予約在庫の両方を減少
      await client
        .patch(productId)
        .setIfMissing({ stockQuantity: 0, reserved: 0 })
        .dec({
          stockQuantity: quantity,
          reserved: Math.min(quantity, currentReserved)
        })
        .commit();
      revalidateProductCache();

      console.log(`購入確定: ${productId} - ${quantity}個販売完了`);
      
      // 在庫更新ログを記録
      await this.logInventoryChange({
        productId,
        quantityChange: -quantity,
        operation: 'purchase',
        orderId,
        reason: `注文確定 - ${quantity}個販売`
      });

      return true;
    } catch (error) {
      console.error('購入確定エラー:', error);
      return false;
    }
  }

  /**
   * 店頭販売による在庫の引き落とし。ECと違い予約（reserved）を経ないため、実在庫だけを減らす。
   *
   * 在庫数が足りない場合でも「販売そのもの」は既に店頭で成立しているので、エラーにはせず
   * 減らせる分だけ減らして0で止める（マイナス在庫はストアフロントの在庫判定を壊すため）。
   * データのずれは月末の棚卸しで目視調整する運用。
   */
  static async recordStoreSale(productId: string, quantity: number, reason: string): Promise<boolean> {
    try {
      const product = await client.fetch(
        `*[_type == "product" && _id == $productId][0]{ stockQuantity }`,
        { productId }
      );
      const currentStock = product?.stockQuantity || 0;
      const applied = Math.min(quantity, currentStock);
      if (applied <= 0) {
        console.warn(`店頭販売の在庫引き落としをスキップ: ${productId} - 在庫が0のため`);
        return false;
      }

      await client
        .patch(productId)
        .setIfMissing({ stockQuantity: 0 })
        .dec({ stockQuantity: applied })
        .commit();
      revalidateProductCache();

      await this.logInventoryChange({
        productId,
        quantityChange: -applied,
        operation: 'purchase',
        reason,
      });

      return true;
    } catch (error) {
      console.error('店頭販売の在庫引き落としエラー:', error);
      return false;
    }
  }

  // 在庫補充
  static async restockProduct(productId: string, quantity: number, reason?: string): Promise<boolean> {
    try {
      await client
        .patch(productId)
        .setIfMissing({ stockQuantity: 0 })
        .inc({ stockQuantity: quantity })
        .commit();
      revalidateProductCache();

      console.log(`在庫補充: ${productId} - ${quantity}個追加`);
      
      // 在庫更新ログを記録
      await this.logInventoryChange({
        productId,
        quantityChange: quantity,
        operation: 'restock',
        reason: reason || `在庫補充 - ${quantity}個追加`
      });

      return true;
    } catch (error) {
      console.error('在庫補充エラー:', error);
      return false;
    }
  }

  /**
   * カート内の全アイテムを一括で予約する。
   * 途中の商品で在庫不足が発生した場合、それまでに予約済みのアイテムはロールバックし、
   * 部分的な予約が残らないようにする（決済前の在庫確保に使用）。
   */
  static async reserveCartItems(
    items: Array<{ productId: string; quantity: number }>,
    orderId?: string
  ): Promise<{ success: true } | { success: false; error: string; productId: string }> {
    const reserved: Array<{ productId: string; quantity: number }> = [];

    for (const item of items) {
      const ok = await this.reserveStock(item.productId, item.quantity, orderId);
      if (!ok) {
        for (const r of reserved) {
          await this.releaseStock(r.productId, r.quantity, orderId);
        }
        return { success: false, error: '在庫が不足しています', productId: item.productId };
      }
      reserved.push(item);
    }

    return { success: true };
  }

  /**
   * カート内の全アイテムの予約を解放する（決済失敗・注文キャンセル時に使用）。
   */
  static async releaseCartItems(items: Array<{ productId: string; quantity: number }>, orderId?: string): Promise<void> {
    for (const item of items) {
      await this.releaseStock(item.productId, item.quantity, orderId);
    }
  }

  /**
   * カート内の全アイテムの購入を確定する（予約済み在庫を実在庫から減算。決済成功時に使用）。
   */
  static async confirmCartPurchase(items: Array<{ productId: string; quantity: number }>, orderId: string): Promise<void> {
    for (const item of items) {
      await this.confirmPurchase(item.productId, item.quantity, orderId);
    }
  }

  /**
   * カート内の全アイテムの在庫を復元する（決済確定済みの注文を管理者がキャンセル/削除した場合に使用）。
   */
  static async restoreCartItems(items: Array<{ productId: string; quantity: number }>, orderId?: string): Promise<void> {
    for (const item of items) {
      await this.restockProduct(item.productId, item.quantity, `管理者による注文キャンセル - ${item.quantity}個復元${orderId ? ` (注文: ${orderId})` : ''}`);
    }
  }

  // 在庫変更ログを記録
  private static async logInventoryChange(update: InventoryUpdate): Promise<void> {
    try {
      const logEntry = {
        _type: 'inventoryLog',
        productId: update.productId,
        quantityChange: update.quantityChange,
        operation: update.operation,
        orderId: update.orderId,
        reason: update.reason,
        timestamp: new Date().toISOString(),
        user: 'system' // 実際の実装では認証ユーザー情報を使用
      };

      await client.create(logEntry);
    } catch (error) {
      console.error('在庫ログ記録エラー:', error);
      // ログ記録エラーは処理を停止しない
    }
  }

  // 低在庫商品を取得
  static async getLowStockProducts(): Promise<Product[]> {
    try {
      const products = await client.fetch(`
        *[_type == "product" && stockQuantity <= lowStockThreshold && stockQuantity > 0]{
          _id,
          name,
          stockQuantity,
          lowStockThreshold,
          slug,
          price,
          images
        }
      `);

      return products;
    } catch (error) {
      console.error('低在庫商品取得エラー:', error);
      return [];
    }
  }

  // 在庫切れ商品を取得
  static async getOutOfStockProducts(): Promise<Product[]> {
    try {
      const products = await client.fetch(`
        *[_type == "product" && stockQuantity == 0]{
          _id,
          name,
          stockQuantity,
          slug,
          price,
          images
        }
      `);

      return products;
    } catch (error) {
      console.error('在庫切れ商品取得エラー:', error);
      return [];
    }
  }

  // カートアイテムの在庫チェック
  static async validateCartItems(items: Array<{ productId: string; quantity: number }>): Promise<{
    valid: boolean;
    errors: Array<{ productId: string; message: string; availableStock: number }>;
  }> {
    const errors: Array<{ productId: string; message: string; availableStock: number }> = [];

    try {
      const productIds = items.map(item => item.productId);
      const inventoryStatuses = await this.getBulkInventoryStatus(productIds);

      for (const item of items) {
        const status = inventoryStatuses.find(s => s.productId === item.productId);
        if (!status) {
          errors.push({
            productId: item.productId,
            message: '商品が見つかりません',
            availableStock: 0
          });
          continue;
        }

        if (status.isOutOfStock) {
          errors.push({
            productId: item.productId,
            message: '在庫切れです',
            availableStock: status.availableStock
          });
        } else if (status.availableStock < item.quantity) {
          errors.push({
            productId: item.productId,
            message: `在庫不足です（在庫: ${status.availableStock}個）`,
            availableStock: status.availableStock
          });
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('カート在庫チェックエラー:', error);
      return {
        valid: false,
        errors: [{ productId: 'unknown', message: '在庫チェックエラーが発生しました', availableStock: 0 }]
      };
    }
  }
}