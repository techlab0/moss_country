/**
 * 在庫管理サービス
 * リアルタイム在庫更新と競合処理を提供
 */

import { Product } from '@/types/ecommerce';
import { debounce } from '@/lib/debounce';

// 在庫データ型定義
export interface InventoryItem {
  productId: string;
  variantKey?: string;
  totalStock: number;
  availableStock: number;
  reservedStock: number;
  lastUpdated: string;
  lowStockThreshold: number;
}

// 在庫変更イベント型定義
export interface InventoryChangeEvent {
  productId: string;
  variantKey?: string;
  previousStock: number;
  newStock: number;
  changeType: 'add' | 'remove' | 'reserve' | 'release';
  timestamp: string;
}

class InventoryService {
  private inventory: Map<string, InventoryItem> = new Map();
  private listeners: Set<(event: InventoryChangeEvent) => void> = new Set();
  private persistenceKey = 'moss_country_inventory';
  
  // 在庫データの永続化（デバウンス付き）
  private saveInventory = debounce(() => {
    try {
      const inventoryData = Array.from(this.inventory.entries());
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.persistenceKey, JSON.stringify(inventoryData));
      }
    } catch (error) {
      console.error('Failed to save inventory:', error);
    }
  }, 1000);

  constructor() {
    // 開発環境では在庫をリセットするオプション
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('reset-inventory') === 'true') {
        console.log('🔄 在庫データをリセットします');
        localStorage.removeItem(this.persistenceKey);
      }
    }
    
    this.loadInventory();
    this.initializeDefaultInventory();
  }

  /**
   * localStorage から在庫データを読み込み
   */
  private loadInventory() {
    // サーバーサイドレンダリング中はlocalStorageにアクセスしない
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      const saved = localStorage.getItem(this.persistenceKey);
      if (saved) {
        const inventoryData: [string, InventoryItem][] = JSON.parse(saved);
        this.inventory = new Map(inventoryData);
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.persistenceKey);
      }
    }
  }

  /**
   * デフォルト在庫データの初期化
   */
  private initializeDefaultInventory() {
    const defaultProducts = [
      'mock-1', 'mock-2', 'mock-3', 'mock-4', 'mock-5', 'mock-6'
    ];

    defaultProducts.forEach(productId => {
      if (!this.inventory.has(productId)) {
        const inventoryData = {
          productId,
          totalStock: 15,
          availableStock: 15,
          reservedStock: 0,
          lastUpdated: new Date().toISOString(),
          lowStockThreshold: 5
        };
        
        // デバッグログを追加
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔧 在庫初期化: ${productId} -> 総在庫: ${inventoryData.totalStock}, 利用可能: ${inventoryData.availableStock}`);
        }
        
        this.setInventory(productId, inventoryData);
      } else {
        // 既存在庫の確認
        const existing = this.inventory.get(productId);
        if (process.env.NODE_ENV === 'development') {
          console.log(`📦 既存在庫: ${productId} -> 総在庫: ${existing?.totalStock}, 利用可能: ${existing?.availableStock}`);
        }
      }
    });
  }

  /**
   * 商品の在庫情報を取得
   */
  getInventory(productId: string, variantKey?: string): InventoryItem | null {
    const key = this.getInventoryKey(productId, variantKey);
    return this.inventory.get(key) || null;
  }

  /**
   * 利用可能在庫数を取得
   */
  getAvailableStock(productId: string, variantKey?: string): number {
    const inventory = this.getInventory(productId, variantKey);
    return inventory?.availableStock || 0;
  }

  /**
   * 在庫があるかチェック
   */
  isInStock(productId: string, variantKey?: string, quantity: number = 1): boolean {
    const availableStock = this.getAvailableStock(productId, variantKey);
    return availableStock >= quantity;
  }

  /**
   * 在庫が少ないかチェック
   */
  isLowStock(productId: string, variantKey?: string): boolean {
    const inventory = this.getInventory(productId, variantKey);
    if (!inventory) return true;
    return inventory.availableStock <= inventory.lowStockThreshold;
  }

  /**
   * 在庫を予約（カート追加時）
   */
  reserveStock(productId: string, quantity: number, variantKey?: string): boolean {
    const inventory = this.getInventory(productId, variantKey);
    if (!inventory || inventory.availableStock < quantity) {
      return false;
    }

    const updated: InventoryItem = {
      ...inventory,
      availableStock: inventory.availableStock - quantity,
      reservedStock: inventory.reservedStock + quantity,
      lastUpdated: new Date().toISOString()
    };

    this.setInventory(productId, updated, variantKey);
    this.notifyChange({
      productId,
      variantKey,
      previousStock: inventory.availableStock,
      newStock: updated.availableStock,
      changeType: 'reserve',
      timestamp: updated.lastUpdated
    });

    return true;
  }

  /**
   * 在庫予約を解除（カートから削除時）
   */
  releaseStock(productId: string, quantity: number, variantKey?: string): void {
    const inventory = this.getInventory(productId, variantKey);
    if (!inventory) return;

    const releaseQuantity = Math.min(quantity, inventory.reservedStock);
    const updated: InventoryItem = {
      ...inventory,
      availableStock: inventory.availableStock + releaseQuantity,
      reservedStock: inventory.reservedStock - releaseQuantity,
      lastUpdated: new Date().toISOString()
    };

    this.setInventory(productId, updated, variantKey);
    this.notifyChange({
      productId,
      variantKey,
      previousStock: inventory.availableStock,
      newStock: updated.availableStock,
      changeType: 'release',
      timestamp: updated.lastUpdated
    });
  }

  /**
   * 在庫を実際に減少（購入完了時）
   */
  consumeStock(productId: string, quantity: number, variantKey?: string): boolean {
    const inventory = this.getInventory(productId, variantKey);
    if (!inventory || inventory.reservedStock < quantity) {
      return false;
    }

    const updated: InventoryItem = {
      ...inventory,
      totalStock: inventory.totalStock - quantity,
      reservedStock: inventory.reservedStock - quantity,
      lastUpdated: new Date().toISOString()
    };

    this.setInventory(productId, updated, variantKey);
    this.notifyChange({
      productId,
      variantKey,
      previousStock: inventory.totalStock,
      newStock: updated.totalStock,
      changeType: 'remove',
      timestamp: updated.lastUpdated
    });

    return true;
  }

  /**
   * 在庫を補充
   */
  restockInventory(productId: string, quantity: number, variantKey?: string): void {
    const inventory = this.getInventory(productId, variantKey) || {
      productId,
      variantKey,
      totalStock: 0,
      availableStock: 0,
      reservedStock: 0,
      lastUpdated: new Date().toISOString(),
      lowStockThreshold: 5
    };

    const updated: InventoryItem = {
      ...inventory,
      totalStock: inventory.totalStock + quantity,
      availableStock: inventory.availableStock + quantity,
      lastUpdated: new Date().toISOString()
    };

    this.setInventory(productId, updated, variantKey);
    this.notifyChange({
      productId,
      variantKey,
      previousStock: inventory.totalStock,
      newStock: updated.totalStock,
      changeType: 'add',
      timestamp: updated.lastUpdated
    });
  }

  /**
   * 在庫変更リスナーを追加
   */
  addChangeListener(listener: (event: InventoryChangeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 全在庫データを取得
   */
  getAllInventory(): InventoryItem[] {
    return Array.from(this.inventory.values());
  }

  /**
   * 在庫切れ商品を取得
   */
  getOutOfStockProducts(): InventoryItem[] {
    return this.getAllInventory().filter(item => item.availableStock === 0);
  }

  /**
   * 在庫少ない商品を取得
   */
  getLowStockProducts(): InventoryItem[] {
    return this.getAllInventory().filter(item => 
      item.availableStock > 0 && item.availableStock <= item.lowStockThreshold
    );
  }

  // プライベートメソッド
  private getInventoryKey(productId: string, variantKey?: string): string {
    return variantKey ? `${productId}-${variantKey}` : productId;
  }

  private setInventory(productId: string, inventory: InventoryItem, variantKey?: string): void {
    const key = this.getInventoryKey(productId, variantKey);
    this.inventory.set(key, inventory);
    this.saveInventory();
  }

  private notifyChange(event: InventoryChangeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in inventory change listener:', error);
      }
    });
  }
}

// シングルトンインスタンス
export const inventoryService = new InventoryService();

// React フック用のヘルパー
export function useInventoryItem(productId: string, variantKey?: string) {
  return inventoryService.getInventory(productId, variantKey);
}

export function useAvailableStock(productId: string, variantKey?: string) {
  return inventoryService.getAvailableStock(productId, variantKey);
}

export function useStockStatus(productId: string, variantKey?: string) {
  const availableStock = inventoryService.getAvailableStock(productId, variantKey);
  const isLowStock = inventoryService.isLowStock(productId, variantKey);
  const isInStock = availableStock > 0;

  return {
    availableStock,
    isInStock,
    isLowStock,
    isOutOfStock: !isInStock
  };
}