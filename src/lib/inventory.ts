// 在庫管理システム - Sanity CMS連携
import { client } from '@/lib/sanity';
import type { Product } from '@/types/ecommerce';

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

      return products.map((product: { _id: string; reserved?: number; stockQuantity?: number; lowStockThreshold?: number }) => {
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

      // 予約在庫を増加
      await client
        .patch(productId)
        .inc({ reserved: quantity })
        .commit();

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
          .inc({ reserved: -releaseAmount })
          .commit();

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
        .dec({ 
          stockQuantity: quantity,
          reserved: Math.min(quantity, currentReserved)
        })
        .commit();

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

  // 在庫補充
  static async restockProduct(productId: string, quantity: number, reason?: string): Promise<boolean> {
    try {
      await client
        .patch(productId)
        .inc({ stockQuantity: quantity })
        .commit();

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