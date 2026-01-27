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
    // Inventory should be as fresh as possible (avoid CDN staleness)
    const inventoryClient = client.withConfig({ useCdn: false })

    // For the storefront we treat product.stockQuantity/reserved as the source of truth
    // (this is what the admin UI updates). Variant inventory, if used, is stored in the
    // separate `inventory` document type.
    if (!variant) {
      const productStock = await inventoryClient.fetch(
        `*[_type == "product" && _id == $productId][0]{
          _id,
          stockQuantity,
          reserved,
          lowStockThreshold
        }`,
        { productId }
      )

      if (!productStock) return null

      const quantity = productStock.stockQuantity ?? 0
      const reserved = productStock.reserved ?? 0
      const reorderLevel = productStock.lowStockThreshold ?? 5
      const available = Math.max(0, quantity - reserved)

      return {
        _id: `inventory_product_${productId}`,
        productId,
        quantity,
        reserved,
        available,
        reorderLevel,
        trackingEnabled: true,
      }
    }

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
    
    const inventory = await inventoryClient.fetch(query, { 
      productId, 
      ...(variant && { variant })
    })
    
    if (!inventory) {
      console.log(`No Sanity inventory found for product variant: ${productId} (${variant})`)
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
    const inventoryClient = client.withConfig({ useCdn: false })
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
    
    const inventoryItems = await inventoryClient.fetch(query)
    
    return (inventoryItems || []).map((item: { quantity: number; reserved?: number; available?: number }) => ({
      ...item,
      available: item.available ?? Math.max(0, item.quantity - (item.reserved || 0))
    }))
  } catch (error) {
    console.error('Error fetching all Sanity inventory:', error)
    return []
  }
}