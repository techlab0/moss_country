// キャッシュ管理ユーティリティ
import { cache } from 'react'

// メモリキャッシュの実装
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  set(key: string, data: any, ttl = 300000): void { // デフォルト5分
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // 期限切れのキャッシュを削除
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

export const memoryCache = new MemoryCache()

// 定期的なクリーンアップ
if (typeof window !== 'undefined') {
  setInterval(() => {
    memoryCache.cleanup()
  }, 300000) // 5分ごと
}

// React Cacheを使用したデータフェッチング
export const cachedFetch = cache(async <T>(
  url: string,
  options?: RequestInit,
  ttl = 300000
): Promise<T> => {
  const cacheKey = `fetch:${url}:${JSON.stringify(options || {})}`
  
  // メモリキャッシュから確認
  const cached = memoryCache.get(cacheKey)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(url, options)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    // キャッシュに保存
    memoryCache.set(cacheKey, data, ttl)
    
    return data
  } catch (error) {
    console.error('Cached fetch error:', error)
    throw error
  }
})

// Sanityクエリ用のキャッシュラッパー
export const cachedSanityQuery = cache(async <T>(
  query: string,
  params?: Record<string, any>,
  ttl = 300000
): Promise<T> => {
  const cacheKey = `sanity:${query}:${JSON.stringify(params || {})}`
  
  const cached = memoryCache.get(cacheKey)
  if (cached) {
    return cached
  }

  // 実際のSanityクエリは別途実装
  // ここでは型安全性のためのプレースホルダー
  throw new Error('Sanity query implementation needed')
})

// キャッシュ無効化のユーティリティ
export const invalidateCache = (pattern: string): void => {
  const keys = Array.from(memoryCache['cache'].keys())
  const regex = new RegExp(pattern)
  
  for (const key of keys) {
    if (regex.test(key)) {
      memoryCache.delete(key)
    }
  }
}

// 商品関連のキャッシュ無効化
export const invalidateProductCache = (): void => {
  invalidateCache('^(sanity|fetch).*product')
}

// ブログ関連のキャッシュ無効化
export const invalidateBlogCache = (): void => {
  invalidateCache('^(sanity|fetch).*blog')
}

// 苔図鑑関連のキャッシュ無効化
export const invalidateMossGuideCache = (): void => {
  invalidateCache('^(sanity|fetch).*moss')
}

// キャッシュ統計
export const getCacheStats = () => {
  const cache = memoryCache['cache']
  const now = Date.now()
  let validEntries = 0
  let expiredEntries = 0
  
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      expiredEntries++
    } else {
      validEntries++
    }
  }
  
  return {
    totalEntries: cache.size,
    validEntries,
    expiredEntries,
    hitRate: validEntries / cache.size || 0
  }
}