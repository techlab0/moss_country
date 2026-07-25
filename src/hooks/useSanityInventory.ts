'use client';

import { useState, useEffect } from 'react';
import { inventoryFromProductStock, type SanityInventoryItem, type ProductStockFields } from '@/lib/sanityInventory';

/**
 * Hook to get inventory (API経由でサーバー側のSanityを叩くため、ストアフロントで正しく在庫が取得できる)
 *
 * preloaded を渡した場合（かつバリアント無し）は、その商品データから在庫を計算し、
 * 個別の在庫API(/api/products/[id]/inventory)を一切叩かない。
 * 一覧ページ(ProductCard×N)で在庫APIが商品数ぶん爆発するのを防ぐため、
 * 一覧では必ず商品データを preloaded として渡すこと。
 */
export function useSanityInventory(
  productId: string,
  variant?: string,
  preloaded?: ProductStockFields | null
) {
  // preloaded があればサーバーを叩かず同期的に計算する（バリアントは個別在庫docのため対象外）
  const usePreloaded = !variant && !!preloaded;
  const preStock = preloaded?.stockQuantity ?? 0;
  const preReserved = preloaded?.reserved ?? 0;
  const preThreshold = preloaded?.lowStockThreshold ?? 5;

  const [inventory, setInventory] = useState<SanityInventoryItem | null>(
    usePreloaded ? inventoryFromProductStock(productId, preloaded!) : null
  );
  const [loading, setLoading] = useState(!usePreloaded);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 一覧などで商品データが渡っている場合はfetchせず、そのデータから計算する
    if (usePreloaded) {
      setInventory(
        inventoryFromProductStock(productId, {
          stockQuantity: preStock,
          reserved: preReserved,
          lowStockThreshold: preThreshold,
        })
      );
      setLoading(false);
      setError(null);
      return;
    }

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
  }, [productId, variant, usePreloaded, preStock, preReserved, preThreshold]);

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