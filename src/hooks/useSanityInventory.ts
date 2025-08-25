'use client';

import { useState, useEffect } from 'react';
import { getSanityInventory, SanityInventoryItem } from '@/lib/sanityInventory';

/**
 * Hook to get inventory from Sanity CMS
 */
export function useSanityInventory(productId: string, variant?: string) {
  const [inventory, setInventory] = useState<SanityInventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchInventory() {
      try {
        setLoading(true);
        setError(null);
        
        const inventoryData = await getSanityInventory(productId, variant);
        
        if (mounted) {
          setInventory(inventoryData);
        }
      } catch (err) {
        if (mounted) {
          console.error('Error fetching Sanity inventory:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (productId) {
      fetchInventory();
    }

    return () => {
      mounted = false;
    };
  }, [productId, variant]);

  // Derived states
  const isInStock = inventory ? inventory.available > 0 : false;
  const isLowStock = inventory ? inventory.available <= inventory.reorderLevel && inventory.available > 0 : false;
  const isOutOfStock = inventory ? inventory.available <= 0 : true; // Default to out of stock if no inventory data
  const availableStock = inventory?.available || 0;
  const totalStock = inventory?.quantity || 0;
  const reservedStock = inventory?.reserved || 0;

  return {
    inventory,
    loading,
    error,
    isInStock,
    isLowStock,
    isOutOfStock,
    availableStock,
    totalStock,
    reservedStock,
  };
}