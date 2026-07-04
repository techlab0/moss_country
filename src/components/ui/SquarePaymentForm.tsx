'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

// Square Web Payments SDK types
declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<{
        card: () => Promise<{
          attach: (selector: string) => Promise<void>;
          tokenize: () => Promise<{ token: string; details: object }>;
          destroy: () => void;
        }>;
      }>;
    };
  }
}

interface SquarePaymentFormProps {
  applicationId: string;
  locationId: string;
  amount: number;
  currency?: string;
  onPaymentSuccess: (result: { token: string; details: object }) => Promise<void>;
  onPaymentError: (error: Error) => void;
  disabled?: boolean;
  className?: string;
}

export const SquarePaymentForm: React.FC<SquarePaymentFormProps> = ({
  applicationId,
  locationId,
  amount,
  currency = 'JPY',
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<{ tokenize: () => Promise<{ token: string; details: object }>; destroy: () => void } | null>(null);
  const scriptLoadedRef = useRef(false);

  // Square Web Payments SDK script loading
  useEffect(() => {
    if (scriptLoadedRef.current) return;

    const loadSquareScript = async () => {
      // Check if script is already loaded
      if (window.Square) {
        await initializePaymentForm();
        return;
      }

      // Load Square Web Payments SDK - choose URL based on environment
      const script = document.createElement('script');
      const environment = process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT || 'sandbox';
      script.src = environment === 'production' 
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';
      script.async = true;
      
      script.onload = async () => {
        scriptLoadedRef.current = true;
        await initializePaymentForm();
      };
      
      script.onerror = () => {
        setError('Failed to load Square payment system');
        setIsLoading(false);
      };

      document.head.appendChild(script);
    };

    loadSquareScript();

    return () => {
      // Cleanup card instance on unmount
      if (cardRef.current) {
        cardRef.current.destroy();
      }
    };
  }, [applicationId, locationId]);

  const initializePaymentForm = async () => {
    try {
      if (!window.Square) {
        throw new Error('Square SDK not loaded');
      }

      console.log('🔧 Square SDK初期化:', {
        applicationId,
        locationId,
        amount: `¥${amount.toLocaleString()}`
      });

      const payments = await window.Square.payments(applicationId, locationId);
      const card = await payments.card({
        style: {
          '.input-container': {
            borderColor: '#d1d5db',
            borderRadius: '8px'
          },
          '.input-container.is-focus': {
            borderColor: '#10b981'
          },
          '.input-container.is-error': {
            borderColor: '#ef4444'
          }
        },
        // 日本向け設定：シンプルなカードフォーム
        includeInputLabels: true
        // postalCodeフィールドはデフォルトで表示されるが、日本でも使える
      });
      
      await card.attach('#square-card-container');
      cardRef.current = card;
      
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error initializing Square payment form:', err);
      setError('Failed to initialize payment form');
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!cardRef.current) {
      setError('Payment form not initialized');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await cardRef.current.tokenize();
      await onPaymentSuccess(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      onPaymentError(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`square-payment-form ${className}`}>
      <div className="space-y-4">
        {/* Payment amount display */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">支払金額</span>
            <span className="text-xl font-bold text-green-600">
              ¥{amount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Square card input container */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            カード情報
          </label>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
            <p className="text-sm text-blue-700">
              <strong>ZIP Code欄が表示された場合：</strong> 郵便番号の最初の5桁を入力してください。<br/>
              例：郵便番号が 123-0001 の場合は「12300」と入力
            </p>
          </div>
          <div 
            id="square-card-container"
            className="min-h-[120px] border border-gray-300 rounded-md p-3 bg-white"
            style={{
              minHeight: isLoading ? '56px' : '120px'
            }}
          >
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                <span className="ml-2 text-sm text-gray-500">決済フォームを読み込み中...</span>
              </div>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Payment button */}
        <Button
          onClick={handlePayment}
          disabled={disabled || isLoading || isProcessing}
          variant="primary"
          size="lg"
          className="w-full"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              決済処理中...
            </div>
          ) : (
            `¥${amount.toLocaleString()} を支払う`
          )}
        </Button>

        {/* Security notice */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            🔒 SSL暗号化により安全に決済されます
          </p>
        </div>
      </div>
    </div>
  );
};