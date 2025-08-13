'use client';

import React, { useState } from 'react';
import { useInventoryNotifications } from '@/hooks/useInventory';
import { InventoryChangeEvent } from '@/lib/inventoryService';

export const InventoryNotifications: React.FC = () => {
  const { notifications, hasNewNotifications, clearNotifications, removeNotification } = useInventoryNotifications();
  const [isOpen, setIsOpen] = useState(false);

  // 本番環境では表示しない
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  if (!hasNewNotifications && !isOpen) {
    return null;
  }

  const formatChangeType = (changeType: string) => {
    switch (changeType) {
      case 'reserve': return '予約';
      case 'release': return '解除';
      case 'remove': return '消費';
      case 'add': return '補充';
      default: return changeType;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getNotificationIcon = (event: InventoryChangeEvent) => {
    switch (event.changeType) {
      case 'reserve':
        return (
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        );
      case 'release':
        return (
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        );
      case 'remove':
        return (
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        );
      case 'add':
        return (
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        );
      default:
        return (
          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
        );
    }
  };

  return (
    <>
      {/* 通知ベル */}
      {hasNewNotifications && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        >
          <div className="relative">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5V9.09c0-1.06-.21-2.08-.58-3.01M12 3a9 9 0 100 18 9 9 0 000-18zm0 5v4l3 3" />
            </svg>
            {notifications.length > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {Math.min(notifications.length, 9)}
              </div>
            )}
          </div>
        </button>
      )}

      {/* 通知パネル */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">在庫通知</h2>
                <p className="text-xs text-gray-500">開発モードでのみ表示</p>
              </div>
              <div className="flex gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    すべて削除
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 通知リスト */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p>新しい通知はありません</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((event, index) => (
                    <div key={`${event.timestamp}-${index}`} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(event)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              商品ID: {event.productId}
                              {event.variantKey && (
                                <span className="text-gray-500"> ({event.variantKey})</span>
                              )}
                            </p>
                            <button
                              onClick={() => removeNotification(event.timestamp)}
                              className="text-gray-400 hover:text-gray-600 ml-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-sm text-gray-600">
                              在庫{formatChangeType(event.changeType)}: {event.previousStock} → {event.newStock}
                            </p>
                            <span className="text-xs text-gray-500">
                              {formatTime(event.timestamp)}
                            </span>
                          </div>
                          {event.newStock <= 5 && event.newStock > 0 && (
                            <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                              ⚠️ 在庫残り少ない
                            </div>
                          )}
                          {event.newStock === 0 && (
                            <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                              🚫 在庫切れ
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};