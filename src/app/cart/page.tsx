'use client';

import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { useCart } from '@/contexts/CartContext';
import { getEcommerceImageUrl } from '@/lib/adapters';
import { inventoryService } from '@/lib/inventoryService';

export default function CartPage() {
  const { 
    cart, 
    updateQuantity, 
    removeFromCart
  } = useCart();

  if (cart.items.length === 0) {
    return (
      <div className="bg-stone-950 min-h-screen pt-20">
        <Container>
          <div className="text-center py-20">
            <div className="mb-8">
              <svg 
                className="w-24 h-24 text-stone-600 mx-auto mb-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 2.4M17 21a2 2 0 100-4 2 2 0 000 4zm-8 0a2 2 0 100-4 2 2 0 000 4z" 
                />
              </svg>
              <h1 className="text-3xl md:text-4xl font-light text-white mb-4">
                カートは空です
              </h1>
              <p className="text-lg text-stone-400 mb-8">
                お気に入りの商品を見つけて、カートに追加しましょう
              </p>
            </div>
            <Link href="/products">
              <Button variant="primary" size="lg" className="px-8 py-3">
                商品を見る
              </Button>
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-stone-950 min-h-screen pt-20">
      <Container>
        <div className="py-8">
          {/* ヘッダー */}
          <div className="border-b border-stone-800 pb-6 mb-8">
            <h1 className="text-3xl md:text-4xl font-light text-white">
              ショッピングカート
            </h1>
            <p className="text-stone-400 mt-2">
              {cart.itemCount}点の商品が入っています
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* カートアイテム一覧 */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                {cart.items.map((item) => {
                  const itemKey = `${item.product._id}-${item.variant?._key || 'default'}`;
                  const imageUrl = getEcommerceImageUrl(item.product.images?.[0]);
                  const inventoryData = inventoryService.getInventory(item.product._id, item.variant?._key);
                  const availableStock = inventoryService.getAvailableStock(item.product._id, item.variant?._key);
                  const totalStock = inventoryData?.totalStock || 0;
                  const reservedStock = inventoryData?.reservedStock || 0;
                  const maxQuantity = Math.min(totalStock, availableStock + item.quantity); // 総在庫数を超えないように制限
                  
                  // デバッグ情報をコンソールに出力
                  if (process.env.NODE_ENV === 'development') {
                    console.log(`🔍 商品 ${item.product._id} の在庫詳細:`, {
                      totalStock,
                      availableStock,
                      reservedStock,
                      currentQuantity: item.quantity,
                      maxQuantity,
                      productName: item.product.name
                    });
                  }

                  return (
                    <div 
                      key={itemKey}
                      className="bg-stone-900/50 backdrop-blur-sm rounded-2xl p-6 border border-stone-800"
                    >
                      <div className="flex flex-col sm:flex-row gap-6">
                        {/* 商品画像 */}
                        <div className="flex-shrink-0">
                          <Link href={`/products/${item.product.slug.current}`}>
                            <ImagePlaceholder
                              src={imageUrl}
                              alt={item.product.name}
                              width={120}
                              height={120}
                              className="w-30 h-30 object-cover rounded-xl hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          </Link>
                        </div>

                        {/* 商品情報 */}
                        <div className="flex-grow">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                            <div>
                              <Link href={`/products/${item.product.slug.current}`}>
                                <h3 className="text-xl font-medium text-white mb-2 hover:text-emerald-400 transition-colors cursor-pointer">
                                  {item.product.name}
                                </h3>
                              </Link>
                              {item.variant && (
                                <p className="text-stone-400 mb-2">
                                  バリエーション: {item.variant.name}
                                </p>
                              )}
                              <p className="text-emerald-400 text-lg font-medium">
                                ¥{item.price.toLocaleString()}
                              </p>
                              <p className="text-stone-400 text-sm">
                                在庫: 利用可能{availableStock}点 / 総在庫{totalStock}点
                                {process.env.NODE_ENV === 'development' && (
                                  <span className="text-xs text-blue-400 block">
                                    (デバッグ: 予約済{reservedStock}点, max={maxQuantity}, current={item.quantity})
                                  </span>
                                )}
                              </p>
                              {item.quantity >= maxQuantity && (
                                <p className="text-orange-400 text-xs mt-1">
                                  ⚠️ 在庫上限に達しています
                                </p>
                              )}
                            </div>

                            {/* 数量とアクション */}
                            <div className="flex flex-col sm:items-end gap-4">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => updateQuantity(
                                    item.product._id, 
                                    item.quantity - 1, 
                                    item.variant?._key
                                  )}
                                  className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-stone-800 text-white hover:bg-stone-700 transition-colors flex items-center justify-center"
                                  disabled={item.quantity <= 1}
                                >
                                  −
                                </button>
                                <span className="text-white font-medium min-w-[2rem] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => {
                                    try {
                                      updateQuantity(
                                        item.product._id, 
                                        item.quantity + 1, 
                                        item.variant?._key
                                      );
                                    } catch (error) {
                                      console.error('数量更新エラー:', error);
                                      alert(error instanceof Error ? error.message : '数量を更新できませんでした');
                                    }
                                  }}
                                  disabled={item.quantity >= maxQuantity}
                                  className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-stone-800 text-white hover:bg-stone-700 disabled:bg-stone-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                                  title={item.quantity >= maxQuantity ? `在庫上限: ${maxQuantity}個` : '数量を増やす'}
                                >
                                  +
                                </button>
                              </div>

                              <button
                                onClick={() => removeFromCart(
                                  item.product._id, 
                                  item.variant?._key
                                )}
                                className="text-red-400 hover:text-red-300 text-sm transition-colors"
                              >
                                削除
                              </button>
                            </div>
                          </div>

                          {/* 小計 */}
                          <div className="mt-4 pt-4 border-t border-stone-800">
                            <p className="text-right text-stone-300">
                              小計: <span className="text-white font-medium">
                                ¥{(item.price * item.quantity).toLocaleString()}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 注文サマリー */}
            <div className="lg:col-span-1">
              <div className="bg-stone-900/50 backdrop-blur-sm rounded-2xl p-6 border border-stone-800 sticky top-24">
                <h2 className="text-xl font-medium text-white mb-6">注文サマリー</h2>

                {/* 価格詳細 */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-white text-lg font-medium">
                    <span>商品小計</span>
                    <span>¥{cart.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="text-stone-400 text-sm mt-4 p-3 bg-stone-800/50 rounded-lg">
                    <p className="mb-2">💡 配送料は次のステップで計算されます</p>
                    <p className="text-xs">札幌から商品サイズ・重量・お届け先により正確な配送料を計算します。<br />
                    商品代金が10,000円以上の場合、配送料から500円割引いたします。</p>
                    <div className="mt-2 text-xs text-stone-500">
                      <p>ゆうパック料金表に基づく正確な送料（60サイズ: 道内810円〜 / 東京1,180円〜）</p>
                    </div>
                  </div>
                </div>

                {/* チェックアウトボタン */}
                <Link href="/checkout">
                  <Button 
                    variant="primary" 
                    size="lg" 
                    className="w-full py-4 text-lg font-medium"
                  >
                    レジに進む
                  </Button>
                </Link>

                {/* 続けて買い物 */}
                <Link href="/products">
                  <Button 
                    variant="ghost" 
                    size="md" 
                    className="w-full mt-3 text-stone-300 border-stone-700 hover:bg-stone-800"
                  >
                    買い物を続ける
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}