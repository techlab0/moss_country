'use client';

import React, { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from 'react';
import { Cart, CartItem, Product, ProductVariant, ShippingMethod } from '@/types/ecommerce';
import { debounce } from '@/lib/debounce';
import { inventoryService } from '@/lib/inventoryService';

// 配送方法の定義（札幌からの配送）
const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: 'standard',
    name: '通常配送',
    description: '札幌から5-7営業日でお届け（10,000円以上で500円引き）',
    price: 0, // 実際の料金は商品サイズ・配送先で計算
    estimatedDays: 7
  },
  {
    id: 'express',
    name: '速達配送',
    description: '札幌から2-3営業日でお届け（10,000円以上で500円引き）',
    price: 0, // 実際の料金は商品サイズ・配送先で計算（+300円）
    estimatedDays: 3
  }
];

// カートアクションの型定義
type CartAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; quantity: number; variant?: ProductVariant } }
  | { type: 'REMOVE_ITEM'; payload: { productId: string; variantKey?: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; quantity: number; variantKey?: string } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_SHIPPING_METHOD'; payload: ShippingMethod }
  | { type: 'LOAD_CART'; payload: Cart };

// 初期カート状態（送料・税金は計算しない）
const initialCart: Cart = {
  items: [],
  subtotal: 0,
  shippingCost: 0,
  baseShippingCost: 0,
  shippingDiscount: 0,
  tax: 0,
  total: 0, // 商品小計のみ
  itemCount: 0
};

// カート計算ヘルパー関数（商品小計とアイテム数のみ計算）
const calculateCartTotals = (items: CartItem[]): Omit<Cart, 'items' | 'shippingMethod'> => {
  try {
    if (!Array.isArray(items)) {
      console.warn('Invalid items array provided to calculateCartTotals');
      return { subtotal: 0, shippingCost: 0, baseShippingCost: 0, shippingDiscount: 0, tax: 0, total: 0, itemCount: 0 };
    }

    const subtotal = items.reduce((sum, item) => {
      if (!item || typeof item.price !== 'number' || typeof item.quantity !== 'number') {
        console.warn('Invalid cart item:', item);
        return sum;
      }
      return sum + (item.price * item.quantity);
    }, 0);
    
    const itemCount = items.reduce((sum, item) => {
      if (!item || typeof item.quantity !== 'number') return sum;
      return sum + item.quantity;
    }, 0);

    // カート段階では送料・税金は計算しない（住所未確定のため）
    return {
      subtotal,
      shippingCost: 0, // 住所確定後に計算
      baseShippingCost: 0,
      shippingDiscount: 0,
      tax: 0, // チェックアウト時に計算
      total: subtotal, // カート段階では商品小計のみ
      itemCount
    };
  } catch (error) {
    console.error('Error calculating cart totals:', error);
    return { subtotal: 0, shippingCost: 0, baseShippingCost: 0, shippingDiscount: 0, tax: 0, total: 0, itemCount: 0 };
  }
};

// カートアイテムの一意キーを生成
const getItemKey = (productId: string, variantKey?: string): string => {
  return variantKey ? `${productId}-${variantKey}` : productId;
};

// カートリデューサー
const cartReducer = (state: Cart, action: CartAction): Cart => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, quantity, variant } = action.payload;
      const price = variant?.price || product.price;
      const itemKey = getItemKey(product._id, variant?._key);
      
      const existingItemIndex = state.items.findIndex(item => 
        getItemKey(item.product._id, item.variant?._key) === itemKey
      );

      let newItems: CartItem[];
      
      if (existingItemIndex >= 0) {
        // 既存アイテムの数量を更新
        newItems = state.items.map((item, index) => 
          index === existingItemIndex 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // 新しいアイテムを追加
        newItems = [...state.items, { product, quantity, variant, price }];
      }

      const totals = calculateCartTotals(newItems);
      
      return {
        items: newItems,
        shippingMethod: state.shippingMethod,
        ...totals
      };
    }

    case 'REMOVE_ITEM': {
      const { productId, variantKey } = action.payload;
      const itemKey = getItemKey(productId, variantKey);
      
      const newItems = state.items.filter(item => 
        getItemKey(item.product._id, item.variant?._key) !== itemKey
      );

      const totals = calculateCartTotals(newItems);
      
      return {
        items: newItems,
        shippingMethod: state.shippingMethod,
        ...totals
      };
    }

    case 'UPDATE_QUANTITY': {
      const { productId, quantity, variantKey } = action.payload;
      const itemKey = getItemKey(productId, variantKey);

      if (quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: { productId, variantKey } });
      }

      const newItems = state.items.map(item => 
        getItemKey(item.product._id, item.variant?._key) === itemKey
          ? { ...item, quantity }
          : item
      );

      const totals = calculateCartTotals(newItems);
      
      return {
        items: newItems,
        shippingMethod: state.shippingMethod,
        ...totals
      };
    }

    case 'CLEAR_CART':
      return initialCart;

    case 'SET_SHIPPING_METHOD': {
      const shippingMethod = action.payload;
      
      return {
        ...state,
        shippingMethod
      };
    }

    case 'LOAD_CART': {
      const loadedCart = action.payload;
      
      // 削除された配送方法（'free'）が選択されている場合は通常配送に変更
      if (loadedCart.shippingMethod?.id === 'free') {
        const standardShipping = SHIPPING_METHODS.find(method => method.id === 'standard');
        if (standardShipping) {
          const totals = calculateCartTotals(loadedCart.items);
          return {
            ...loadedCart,
            shippingMethod: standardShipping,
            ...totals
          };
        }
      }
      
      return loadedCart;
    }

    default:
      return state;
  }
};

// コンテキストの型定義
interface CartContextType {
  cart: Cart;
  addToCart: (product: Product, quantity: number, variant?: ProductVariant) => void;
  removeFromCart: (productId: string, variantKey?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantKey?: string) => void;
  clearCart: () => void;
  setShippingMethod: (method: ShippingMethod) => void;
  getShippingMethods: () => ShippingMethod[];
  isInCart: (productId: string, variantKey?: string) => boolean;
  getCartItemQuantity: (productId: string, variantKey?: string) => number;
}

// カートコンテキスト
const CartContext = createContext<CartContextType | undefined>(undefined);

// カートプロバイダー
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, dispatch] = useReducer(cartReducer, initialCart);

  // 計算のメモ化
  const cartMemo = useMemo(() => ({
    ...cart,
    isEmpty: cart.items.length === 0,
    hasItems: cart.items.length > 0
  }), [cart]);

  // localStorage の最適化
  const debouncedSaveCart = useMemo(
    () => debounce((cartData: Cart) => {
      try {
        localStorage.setItem('moss_country_cart', JSON.stringify(cartData));
      } catch (error) {
        console.error('Failed to save cart:', error);
      }
    }, 500),
    []
  );

  // ローカルストレージからカートを読み込み（エラーハンドリング強化）
  useEffect(() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage is not available');
        return;
      }

      const savedCart = localStorage.getItem('moss_country_cart');
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        
        // データの整合性チェック
        if (parsedCart && typeof parsedCart === 'object' && Array.isArray(parsedCart.items)) {
          // 削除された配送方法をチェック
          if (parsedCart.shippingMethod?.id === 'free') {
            console.log('無効な配送方法を検出しました。通常配送に変更します。');
            parsedCart.shippingMethod = SHIPPING_METHODS.find(method => method.id === 'standard');
          }
          dispatch({ type: 'LOAD_CART', payload: parsedCart });
        } else {
          console.warn('Invalid cart data in localStorage, clearing it');
          localStorage.removeItem('moss_country_cart');
        }
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error);
      // 壊れたデータをクリア
      try {
        localStorage.removeItem('moss_country_cart');
      } catch (clearError) {
        console.error('Failed to clear corrupted localStorage:', clearError);
      }
    }
  }, []);

  // カートの変更をローカルストレージに保存（デバウンス付き）
  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    if (cart.items.length > 0 || cart.total > 0) {
      debouncedSaveCart(cart);
    } else {
      try {
        localStorage.removeItem('moss_country_cart');
      } catch (error) {
        console.error('Failed to clear cart from localStorage:', error);
      }
    }
  }, [cart, debouncedSaveCart]);

  // カート操作関数（バリデーション付き）
  const addToCart = (product: Product, quantity: number, variant?: ProductVariant) => {
    try {
      // 入力バリデーション
      if (!product || !product._id) {
        throw new Error('有効な商品が指定されていません');
      }
      
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error('数量は1以上の整数である必要があります');
      }
      
      if (quantity > 99) {
        throw new Error('一度に追加できる数量は99個までです');
      }
      
      // 在庫サービスによる在庫チェック
      if (!inventoryService.isInStock(product._id, variant?._key, quantity)) {
        const availableStock = inventoryService.getAvailableStock(product._id, variant?._key);
        throw new Error(`在庫不足です。残り${availableStock}個まで追加可能です`);
      }
      
      // 在庫予約の実行
      const reserveSuccess = inventoryService.reserveStock(product._id, quantity, variant?._key);
      if (!reserveSuccess) {
        const availableStock = inventoryService.getAvailableStock(product._id, variant?._key);
        throw new Error(`在庫予約に失敗しました。残り${availableStock}個まで追加可能です`);
      }
      
      dispatch({ type: 'ADD_ITEM', payload: { product, quantity, variant } });
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      // UIに表示するためのエラーを再投げ
      throw error;
    }
  };

  const removeFromCart = useCallback((productId: string, variantKey?: string) => {
    // カートから削除前に在庫予約を解除
    const itemKey = getItemKey(productId, variantKey);
    const existingItem = cart.items.find(item => 
      getItemKey(item.product._id, item.variant?._key) === itemKey
    );
    
    if (existingItem) {
      // 在庫予約を解除
      inventoryService.releaseStock(productId, existingItem.quantity, variantKey);
    }
    
    dispatch({ type: 'REMOVE_ITEM', payload: { productId, variantKey } });
  }, [cart.items]);

  const updateQuantity = useCallback((productId: string, quantity: number, variantKey?: string) => {
    try {
      const itemKey = getItemKey(productId, variantKey);
      const existingItem = cart.items.find(item => 
        getItemKey(item.product._id, item.variant?._key) === itemKey
      );
      
      if (!existingItem) return;
      
      // 入力値のバリデーション
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error('数量は1以上の整数である必要があります');
      }
      
      if (quantity > 99) {
        throw new Error('一度に選択できる数量は99個までです');
      }
      
      const quantityDiff = quantity - existingItem.quantity;
      
      if (quantityDiff > 0) {
        // 数量増加：追加の在庫予約が必要
        if (!inventoryService.isInStock(productId, variantKey, quantityDiff)) {
          const availableStock = inventoryService.getAvailableStock(productId, variantKey);
          throw new Error(`在庫不足です。残り${availableStock + existingItem.quantity}個まで変更可能です`);
        }
        
        const reserveSuccess = inventoryService.reserveStock(productId, quantityDiff, variantKey);
        if (!reserveSuccess) {
          const availableStock = inventoryService.getAvailableStock(productId, variantKey);
          throw new Error(`在庫予約に失敗しました。残り${availableStock + existingItem.quantity}個まで変更可能です`);
        }
      } else if (quantityDiff < 0) {
        // 数量減少：在庫予約を解除
        inventoryService.releaseStock(productId, Math.abs(quantityDiff), variantKey);
      }
      
      dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity, variantKey } });
    } catch (error) {
      console.error('Cart quantity update failed:', error);
      throw error; // エラーを再投げして呼び出し元で処理
    }
  }, [cart.items]);

  const clearCart = useCallback(() => {
    // カート内のすべてのアイテムの在庫予約を解除
    cart.items.forEach(item => {
      inventoryService.releaseStock(
        item.product._id, 
        item.quantity, 
        item.variant?._key
      );
    });
    
    dispatch({ type: 'CLEAR_CART' });
  }, [cart.items]);

  const setShippingMethod = useCallback((method: ShippingMethod) => {
    dispatch({ type: 'SET_SHIPPING_METHOD', payload: method });
  }, []);

  const getShippingMethods = useCallback(() => SHIPPING_METHODS, []);

  const isInCart = useCallback((productId: string, variantKey?: string): boolean => {
    const itemKey = getItemKey(productId, variantKey);
    return cart.items.some(item => 
      getItemKey(item.product._id, item.variant?._key) === itemKey
    );
  }, [cart.items]);

  const getCartItemQuantity = useCallback((productId: string, variantKey?: string): number => {
    const itemKey = getItemKey(productId, variantKey);
    const item = cart.items.find(item => 
      getItemKey(item.product._id, item.variant?._key) === itemKey
    );
    return item?.quantity || 0;
  }, [cart.items]);

  // メモ化されたコンテキスト値
  const contextValue = useMemo(() => ({
    cart: cartMemo,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    setShippingMethod,
    getShippingMethods,
    isInCart,
    getCartItemQuantity
  }), [cartMemo, addToCart, removeFromCart, updateQuantity, clearCart, setShippingMethod, getShippingMethods, isInCart, getCartItemQuantity]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

// カートコンテキストを使用するカスタムフック
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;