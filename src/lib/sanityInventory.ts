import { client } from '@/lib/sanity'

export interface SanityInventoryItem {
  _id: string
  productId: string
  variant?: string
  quantity: number
  reserved: number
  available: number
  reorderLevel: number
  trackingEnabled: boolean
}

/**
 * Get inventory from Sanity CMS
 */
export async function getSanityInventory(productId: string, variant?: string): Promise<SanityInventoryItem | null> {
  try {
    const query = `
      *[_type == "inventory" && product._ref == $productId ${variant ? '&& variant == $variant' : ''}][0] {
        _id,
        "productId": product._ref,
        variant,
        quantity,
        reserved,
        available,
        reorderLevel,
        trackingEnabled
      }
    `
    
    const inventory = await client.fetch(query, { 
      productId, 
      ...(variant && { variant })
    })
    
    if (!inventory) {
      console.log(`No Sanity inventory found for product: ${productId}`)
      return null
    }

    // Calculate available if not already set
    const available = inventory.available ?? (inventory.quantity - (inventory.reserved || 0))
    
    return {
      ...inventory,
      available: Math.max(0, available)
    }
  } catch (error) {
    console.error('Error fetching Sanity inventory:', error)
    return null
  }
}

/**
 * Get all inventory items from Sanity CMS
 */
export async function getAllSanityInventory(): Promise<SanityInventoryItem[]> {
  try {
    const query = `
      *[_type == "inventory"] {
        _id,
        "productId": product._ref,
        variant,
        quantity,
        reserved,
        available,
        reorderLevel,
        trackingEnabled
      }
    `
    
    const inventoryItems = await client.fetch(query)
    
    return (inventoryItems || []).map((item: { quantity: number; reserved?: number; available?: number }) => ({
      ...item,
      available: item.available ?? Math.max(0, item.quantity - (item.reserved || 0))
    }))
  } catch (error) {
    console.error('Error fetching all Sanity inventory:', error)
    return []
  }
}