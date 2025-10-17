'use client'

import { lazy, Suspense, ComponentType, ReactNode } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

interface LazyComponentProps {
  fallback?: ReactNode
  errorFallback?: ReactNode
}

// 動的インポート用のヘルパー関数
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: ReactNode
) {
  const LazyComponent = lazy(importFn)
  
  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <ErrorBoundary fallback={<div className="p-4 text-red-600">コンポーネントの読み込みに失敗しました</div>}>
        <Suspense 
          fallback={
            fallback || (
              <div className="flex items-center justify-center p-8">
                <div className="animate-pulse flex space-x-4">
                  <div className="rounded-full bg-gray-300 h-10 w-10"></div>
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            )
          }
        >
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    )
  }
}

// よく使われるコンポーネントのスケルトン
export const ProductCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
    <div className="h-64 bg-gray-300"></div>
    <div className="p-6">
      <div className="h-4 bg-gray-300 rounded mb-2"></div>
      <div className="h-6 bg-gray-300 rounded mb-4 w-3/4"></div>
      <div className="h-4 bg-gray-300 rounded mb-2"></div>
      <div className="h-4 bg-gray-300 rounded mb-4 w-1/2"></div>
      <div className="h-10 bg-gray-300 rounded"></div>
    </div>
  </div>
)

export const BlogPostSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
    <div className="h-48 bg-gray-300"></div>
    <div className="p-6">
      <div className="h-6 bg-gray-300 rounded mb-4 w-3/4"></div>
      <div className="h-4 bg-gray-300 rounded mb-2"></div>
      <div className="h-4 bg-gray-300 rounded mb-2"></div>
      <div className="h-4 bg-gray-300 rounded mb-4 w-2/3"></div>
      <div className="flex items-center space-x-2">
        <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
        <div className="h-4 bg-gray-300 rounded w-24"></div>
      </div>
    </div>
  </div>
)

// 遅延ロードするコンポーネントの例
export const LazyProductCard = createLazyComponent(
  () => import('@/components/ui/ProductCard').then(m => ({ default: m.ProductCard })),
  <ProductCardSkeleton />
)

export const LazyAdminDashboard = createLazyComponent(
  () => import('@/components/admin/AdminDashboard'),
  <div className="p-8 animate-pulse">
    <div className="h-8 bg-gray-300 rounded mb-6 w-1/3"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array(6).fill(0).map((_, i) => (
        <div key={i} className="h-32 bg-gray-300 rounded"></div>
      ))}
    </div>
  </div>
)

export const LazyInventoryManager = createLazyComponent(
  () => import('@/components/admin/InventoryManager'),
  <div className="p-8 animate-pulse">
    <div className="h-8 bg-gray-300 rounded mb-4 w-1/4"></div>
    <div className="space-y-4">
      {Array(5).fill(0).map((_, i) => (
        <div key={i} className="h-16 bg-gray-300 rounded"></div>
      ))}
    </div>
  </div>
)