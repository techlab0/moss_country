'use client';

import React from 'react';
import { useSanityInventory } from '@/hooks/useSanityInventory';

interface InventoryStatusProps {
  productId: string;
  variantKey?: string;
  showQuantity?: boolean;
  showThreshold?: boolean;
  className?: string;
}

export const InventoryStatus: React.FC<InventoryStatusProps> = ({
  productId,
  variantKey,
  showQuantity = true,
  showThreshold = true,
  className = ''
}) => {
  const { availableStock, isInStock, isLowStock, isOutOfStock, loading } = useSanityInventory(productId, variantKey);

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
        <span className="text-gray-500 text-sm">在庫確認中...</span>
      </div>
    );
  }

  if (isOutOfStock) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        <span className="text-red-600 text-sm font-medium">在庫切れ</span>
      </div>
    );
  }

  if (isLowStock && showThreshold) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
        <span className="text-orange-600 text-sm font-medium">
          残り少ない{showQuantity && ` (${availableStock}点)`}
        </span>
      </div>
    );
  }

  if (isInStock) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-green-600 text-sm font-medium">
          在庫あり{showQuantity && ` (${availableStock}点)`}
        </span>
      </div>
    );
  }

  return null;
};

interface InventoryBadgeProps {
  productId: string;
  variantKey?: string;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export const InventoryBadge: React.FC<InventoryBadgeProps> = ({
  productId,
  variantKey,
  variant = 'default',
  className = ''
}) => {
  const { availableStock, isLowStock, isOutOfStock } = useSanityInventory(productId, variantKey);

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <div className={`w-3 h-3 rounded-full ${
          isOutOfStock ? 'bg-red-500' :
          isLowStock ? 'bg-orange-500' :
          'bg-green-500'
        }`}></div>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`bg-white/90 backdrop-blur-sm rounded-lg p-4 ${className}`}>
        <h3 className="font-semibold mb-2 text-gray-800">在庫状況</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">利用可能在庫:</span>
            <span className={`font-medium ${
              isOutOfStock ? 'text-red-600' :
              isLowStock ? 'text-orange-600' :
              'text-green-600'
            }`}>
              {availableStock}点
            </span>
          </div>
          <div className="flex items-center">
            <div className={`w-full bg-gray-200 rounded-full h-2 ${
              isOutOfStock ? 'opacity-50' : ''
            }`}>
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  isOutOfStock ? 'bg-red-500 w-0' :
                  isLowStock ? 'bg-orange-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min((availableStock / 15) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          <InventoryStatus 
            productId={productId} 
            variantKey={variantKey} 
            showQuantity={false}
            className="justify-center"
          />
        </div>
      </div>
    );
  }

  // デフォルトバリアント
  const getBadgeStyle = () => {
    if (isOutOfStock) return 'bg-red-100 text-red-800 border-red-200';
    if (isLowStock) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getBadgeText = () => {
    if (isOutOfStock) return '在庫切れ';
    if (isLowStock) return `残り${availableStock}点`;
    return '在庫あり';
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getBadgeStyle()} ${className}`}>
      {getBadgeText()}
    </span>
  );
};

interface InventoryAlertProps {
  productId: string;
  variantKey?: string;
  onRestock?: () => void;
  onNotifyWhenAvailable?: () => void;
  className?: string;
}

export const InventoryAlert: React.FC<InventoryAlertProps> = ({
  productId,
  variantKey,
  onNotifyWhenAvailable,
  className = ''
}) => {
  const { isOutOfStock, isLowStock } = useSanityInventory(productId, variantKey);

  if (isOutOfStock) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">この商品は在庫切れです</h3>
            <p className="text-xs text-red-700 mt-1">
              申し訳ございませんが、現在この商品は在庫がございません。
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {onNotifyWhenAvailable && (
            <button
              onClick={onNotifyWhenAvailable}
              className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
            >
              再入荷通知を受け取る
            </button>
          )}
          <button className="text-xs text-red-600 hover:text-red-800 transition-colors">
            似た商品を見る
          </button>
        </div>
      </div>
    );
  }

  if (isLowStock) {
    return (
      <div className={`bg-orange-50 border border-orange-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">
            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-orange-800">
            この商品の在庫が残り少なくなっています。お早めにご注文ください。
          </p>
        </div>
      </div>
    );
  }

  return null;
};