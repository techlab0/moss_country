'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { useCart } from '@/contexts/CartContext';
import { getSafeImageUrl, getSafeStock, getProductSlug, sanityToEcommerceProduct } from '@/lib/adapters';
import { InventoryBadge, InventoryAlert } from '@/components/ui/InventoryStatus';
import { useSanityInventory } from '@/hooks/useSanityInventory';
import { getNextImageProps } from '@/lib/imageOptimization';
import type { Product } from '@/types/sanity';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = React.memo(({ product }) => {
  const { addToCart, isInCart, getCartItemQuantity } = useCart();
  const { isInStock: hasInventory, isOutOfStock, isLowStock, availableStock, hasData: inventoryHasData, loading: inventoryLoading } = useSanityInventory(product._id);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 重い計算のメモ化
  const inCartQuantity = useMemo(() => 
    isInCart(product._id) ? getCartItemQuantity(product._id) : 0,
    [product._id, isInCart, getCartItemQuantity]
  );


  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); // Linkクリックを防ぐ
    e.stopPropagation();
    
    if (inventoryLoading || !hasInventory || isOutOfStock) return;
    
    setIsAdding(true);
    
    try {
      addToCart(sanityToEcommerceProduct(product), 1);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsAdding(false);
    }
  }, [product, addToCart, inventoryLoading, hasInventory, isOutOfStock]);

  return (
    <Card className={`hover:transform hover:scale-105 transition-all duration-300 relative overflow-hidden ${(!inventoryLoading && isOutOfStock) ? 'opacity-75' : ''}`}>
      <Link href={`/products/${getProductSlug(product)}`}>
        <div className="h-64 overflow-hidden relative">
          {product.images && product.images[0] ? (
            <Image
              {...getNextImageProps(product.images[0], {
                width: 400,
                height: 300,
                quality: 85,
                sizes: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
                priority: product.featured
              })}
              className={`w-full h-full object-cover ${(!inventoryLoading && isOutOfStock) ? 'grayscale' : ''}`}
            />
          ) : (
            <ImagePlaceholder
              src="/images/products/terrarium-standard.jpg"
              alt={product.name}
              width={400}
              height={300}
              className="w-full h-full object-cover"
              priority={product.featured}
            />
          )}
          
          {/* バッジ */}
          <div className="absolute top-2 left-2 flex gap-2">
            {product.featured && (
              <div className="bg-red-500 text-white px-2 py-1 rounded text-sm z-10">
                おすすめ
              </div>
            )}
            {!inventoryLoading && isOutOfStock && (
              <div className="bg-gray-500 text-white px-2 py-1 rounded text-sm z-10">
                在庫切れ
              </div>
            )}
          </div>

          {/* カート数量表示 */}
          {inCartQuantity > 0 && (
            <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium z-10">
              {inCartQuantity}
            </div>
          )}

          {/* ホバー時のクイックアクション - デスクトップのみ */}
          <div className="absolute inset-0 bg-black/60 opacity-0 md:hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/90 text-gray-900 hover:bg-white"
              >
                詳細を見る
              </Button>
              {!inventoryLoading && hasInventory && !isOutOfStock && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className="min-w-[100px] min-h-[44px]"
                >
                  {isAdding ? (
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">追加中</span>
                    </div>
                  ) : showSuccess ? (
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs">追加済み</span>
                    </div>
                  ) : (
                    'カートに追加'
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* 商品情報 */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-moss-green text-white px-2 py-1 rounded text-xs">
            {product.category}
          </span>
          <InventoryBadge productId={product._id} />
        </div>

        <Link href={`/products/${getProductSlug(product)}`}>
          <h3 className="text-xl font-semibold text-moss-green mb-2 hover:text-moss-green/80 transition-colors line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {product.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="text-xl sm:text-2xl font-bold text-moss-green">
            ¥{product.price.toLocaleString()}
          </div>
          {isLowStock && hasInventory && (
            <div className="text-orange-600 text-xs">
              残り{availableStock}点
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className="space-y-2">
          {inventoryLoading || !inventoryHasData ? (
            <Button variant="primary" className="w-full" disabled>
              在庫確認中...
            </Button>
          ) : hasInventory && !isOutOfStock ? (
            <Button
              variant="primary"
              className="w-full"
              onClick={handleAddToCart}
              disabled={isAdding}
            >
              {isAdding ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  カートに追加中...
                </div>
              ) : showSuccess ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  カートに追加済み
                </div>
              ) : (
                `カートに追加 - ¥${product.price.toLocaleString()}`
              )}
            </Button>
          ) : (
            <>
              <Button variant="primary" className="w-full" disabled>
                {inventoryHasData ? '在庫切れ' : '在庫確認中...'}
              </Button>
              <InventoryAlert 
                productId={product._id}
                className="mt-2"
              />
            </>
          )}

          <Link href={`/products/${getProductSlug(product)}`}>
            <Button variant="ghost" className="w-full border border-gray-300 hover:bg-gray-50">
              詳細を見る
            </Button>
          </Link>
        </div>

        {/* 成功メッセージ */}
        {showSuccess && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>カートに追加しました</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}, (prevProps, nextProps) => {
  // カスタム比較関数でパフォーマンス向上
  return prevProps.product._id === nextProps.product._id &&
         prevProps.product.inStock === nextProps.product.inStock &&
         prevProps.product.price === nextProps.product.price &&
         prevProps.product.featured === nextProps.product.featured;
});

ProductCard.displayName = 'ProductCard';

export { ProductCard };