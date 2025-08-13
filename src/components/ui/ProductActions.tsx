'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/contexts/CartContext';
import { getSafeStock, sanityToEcommerceProduct } from '@/lib/adapters';
import { useInventory } from '@/hooks/useInventory';
import type { Product } from '@/types/sanity';

interface ProductActionsProps {
  product: Product;
}

export const ProductActions: React.FC<ProductActionsProps> = ({ product }) => {
  const { addToCart, isInCart, getCartItemQuantity } = useCart();
  const { availableStock, isInStock, isOutOfStock } = useInventory(product._id);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const handleAddToCart = async () => {
    setIsAdding(true);
    setError(null);
    
    try {
      addToCart(sanityToEcommerceProduct(product), quantity);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      const errorMessage = error instanceof Error ? error.message : 'カートに追加できませんでした';
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsAdding(false);
    }
  };

  const inCartQuantity = isInCart(product._id) ? getCartItemQuantity(product._id) : 0;

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 space-y-4">
      {/* 在庫状況 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isInStock ? (
            <>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-600 font-medium">在庫あり</span>
              <span className="text-gray-500 text-sm">
                （残り{availableStock}点）
              </span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-600 font-medium">在庫切れ</span>
            </>
          )}
        </div>

        {inCartQuantity > 0 && (
          <div className="text-emerald-600 text-sm">
            カートに{inCartQuantity}点
          </div>
        )}
      </div>

      {/* 数量選択 */}
      {isInStock && (
        <div className="flex items-center gap-4">
          <span className="text-gray-700 font-medium">数量:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              −
            </button>
            <span className={`w-12 text-center font-medium ${quantity >= availableStock ? 'text-orange-600' : ''}`}>
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              disabled={quantity >= availableStock}
              className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              +
            </button>
          </div>
        </div>
      )}
      
      {/* 在庫上限警告 */}
      {isInStock && quantity >= availableStock && (
        <div className="text-orange-600 text-sm bg-orange-50 p-2 rounded border border-orange-200">
          ⚠️ 在庫上限に達しています（最大: {availableStock}点）
        </div>
      )}

      {/* アクションボタン */}
      <div className="space-y-3">
        {isInStock ? (
          <>
            <Button 
              variant="primary" 
              className="w-full relative" 
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
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  カートに追加済み
                </div>
              ) : (
                `カートに追加 - ¥${(product.price * quantity).toLocaleString()}`
              )}
            </Button>

            {inCartQuantity > 0 && (
              <Link href="/cart">
                <Button variant="secondary" className="w-full">
                  カートを見る ({inCartQuantity}点)
                </Button>
              </Link>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <Button variant="primary" className="w-full" disabled>
              在庫切れ
            </Button>
            <p className="text-gray-600 text-sm text-center">
              入荷通知をご希望の方は、お問い合わせください
            </p>
          </div>
        )}

        {/* エラーメッセージ表示 */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}
        
        <Link href="/contact">
          <Button variant="ghost" className="w-full border border-gray-300 hover:bg-gray-50">
            商品についてお問い合わせ
          </Button>
        </Link>
      </div>

      {/* 成功メッセージ */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-700">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">
              {product.name}をカートに追加しました
            </span>
          </div>
          <div className="mt-2 flex gap-2">
            <Link href="/cart">
              <button className="text-green-700 text-sm underline hover:no-underline">
                カートを見る
              </button>
            </Link>
            <span className="text-green-600 text-sm">・</span>
            <Link href="/products">
              <button className="text-green-700 text-sm underline hover:no-underline">
                買い物を続ける
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* 配送情報 */}
      <div className="border-t pt-4 text-sm text-gray-600">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span>全国配送対応</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          <span>10,000円以上で送料無料</span>
        </div>
      </div>
    </div>
  );
};