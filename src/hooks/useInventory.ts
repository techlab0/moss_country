'use client';

import { useState, useEffect, useCallback } from 'react';
import { inventoryService, InventoryChangeEvent, InventoryItem } from '@/lib/inventoryService';

/**
 * 商品の在庫状況をリアルタイムで監視するフック
 */
export function useInventory(productId: string, variantKey?: string) {
  const [inventory, setInventory] = useState<InventoryItem | null>(() => 
    inventoryService.getInventory(productId, variantKey)
  );
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 初期データの取得
    const initialInventory = inventoryService.getInventory(productId, variantKey);
    setInventory(initialInventory);

    // リアルタイム更新のリスナーを設定
    const unsubscribe = inventoryService.addChangeListener((event: InventoryChangeEvent) => {
      if (event.productId === productId && event.variantKey === variantKey) {
        const updatedInventory = inventoryService.getInventory(productId, variantKey);
        setInventory(updatedInventory);
      }
    });

    return unsubscribe;
  }, [productId, variantKey]);

  // 在庫予約
  const reserveStock = useCallback(async (quantity: number) => {
    setLoading(true);
    setError(null);

    try {
      const success = inventoryService.reserveStock(productId, quantity, variantKey);
      if (!success) {
        throw new Error('在庫が不足しています');
      }
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '在庫予約に失敗しました';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [productId, variantKey]);

  // 在庫予約解除
  const releaseStock = useCallback((quantity: number) => {
    inventoryService.releaseStock(productId, quantity, variantKey);
  }, [productId, variantKey]);

  // 在庫確認
  const checkStock = useCallback((quantity: number) => {
    return inventoryService.isInStock(productId, variantKey, quantity);
  }, [productId, variantKey]);

  return {
    inventory,
    availableStock: inventory?.availableStock || 0,
    isInStock: (inventory?.availableStock || 0) > 0,
    isLowStock: inventoryService.isLowStock(productId, variantKey),
    isOutOfStock: (inventory?.availableStock || 0) === 0,
    reserveStock,
    releaseStock,
    checkStock,
    loading,
    error
  };
}

/**
 * 全在庫状況を監視するフック
 */
export function useAllInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>(() => 
    inventoryService.getAllInventory()
  );
  
  const [outOfStock, setOutOfStock] = useState<InventoryItem[]>(() =>
    inventoryService.getOutOfStockProducts()
  );
  
  const [lowStock, setLowStock] = useState<InventoryItem[]>(() =>
    inventoryService.getLowStockProducts()
  );

  useEffect(() => {
    const updateInventory = () => {
      setInventory(inventoryService.getAllInventory());
      setOutOfStock(inventoryService.getOutOfStockProducts());
      setLowStock(inventoryService.getLowStockProducts());
    };

    // 初期データ設定
    updateInventory();

    // リアルタイム更新のリスナーを設定
    const unsubscribe = inventoryService.addChangeListener(() => {
      updateInventory();
    });

    return unsubscribe;
  }, []);

  return {
    inventory,
    outOfStock,
    lowStock,
    totalProducts: inventory.length,
    outOfStockCount: outOfStock.length,
    lowStockCount: lowStock.length
  };
}

/**
 * 在庫管理操作のフック
 */
export function useInventoryActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restockItem = useCallback(async (productId: string, quantity: number, variantKey?: string) => {
    setLoading(true);
    setError(null);

    try {
      inventoryService.restockInventory(productId, quantity, variantKey);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '在庫補充に失敗しました';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const consumeStock = useCallback(async (productId: string, quantity: number, variantKey?: string) => {
    setLoading(true);
    setError(null);

    try {
      const success = inventoryService.consumeStock(productId, quantity, variantKey);
      if (!success) {
        throw new Error('在庫消費に失敗しました');
      }
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '在庫消費に失敗しました';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    restockItem,
    consumeStock,
    loading,
    error,
    clearError: () => setError(null)
  };
}

/**
 * 在庫通知のフック
 */
export function useInventoryNotifications() {
  const [notifications, setNotifications] = useState<InventoryChangeEvent[]>([]);

  useEffect(() => {
    const unsubscribe = inventoryService.addChangeListener((event: InventoryChangeEvent) => {
      // 重要な在庫変更のみ通知
      if (event.changeType === 'remove' || 
          (event.changeType === 'reserve' && event.newStock <= 5)) {
        setNotifications(prev => [event, ...prev.slice(0, 9)]); // 最大10件保持
      }
    });

    return unsubscribe;
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((timestamp: string) => {
    setNotifications(prev => prev.filter(n => n.timestamp !== timestamp));
  }, []);

  return {
    notifications,
    hasNewNotifications: notifications.length > 0,
    clearNotifications,
    removeNotification
  };
}