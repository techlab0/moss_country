'use client';

import { useState, useEffect } from 'react';
import type { SanityInventoryItem } from '@/lib/sanityInventory';

/**
 * Hook to get inventory (API経由でサーバー側のSanityを叩くため、ストアフロントで正しく在庫が取得できる)
 */
export function useSanityInventory(productId: string, variant?: string) {
  const [inventory, setInventory] = useState<SanityInventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchInventory() {
      if (!productId) return;
      try {
        setLoading(true);
        setError(null);
        // サーバー側API経由で取得（CORS・トークン問題を避け、product.stockQuantity を正しく取得）
        const url = variant
          ? `/api/products/${encodeURIComponent(productId)}/inventory?variant=${encodeURIComponent(variant)}`
          : `/api/products/${encodeURIComponent(productId)}/inventory`;
        const res = await fetch(url);
        const inventoryData: SanityInventoryItem | null = res.ok ? await res.json() : null;
        if (mounted) {
          setInventory(inventoryData);
        }
      } catch (err) {
        if (mounted) {
          console.error('Error fetching inventory:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchInventory();
    return () => {
      mounted = false;
    };
  }, [productId, variant]);

  // データなし（null）＝取得失敗 or 未取得。在庫ありと表示せず、在庫切れとも断定しない
  const hasData = !loading && inventory !== null;
  const isInStock = hasData && inventory!.available > 0;
  const isLowStock = hasData && inventory!.available <= inventory!.reorderLevel && inventory!.available > 0;
  const isOutOfStock = hasData && inventory!.available <= 0;
  const availableStock = inventory?.available ?? 0;
  const totalStock = inventory?.quantity ?? 0;
  const reservedStock = inventory?.reserved ?? 0;

  return {
    inventory,
    loading,
    error,
    hasData,
    isInStock,
    isLowStock,
    isOutOfStock,
    availableStock,
    totalStock,
    reservedStock,
  };
}