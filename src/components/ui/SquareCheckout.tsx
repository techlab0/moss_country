'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SquarePaymentForm } from './SquarePaymentForm';
import { Button } from './Button';
import { useCart } from '@/contexts/CartContext';
import type { Cart, CheckoutFormData } from '@/types/ecommerce';

interface SquareCheckoutProps {
  cart: Cart;
  customerData: CheckoutFormData['customer'];
  orderData: Omit<CheckoutFormData, 'customer'>;
  mode?: 'embedded' | 'redirect'; // embedded = Web Payments SDK, redirect = Payment Link
  className?: string;
}

export const SquareCheckout: React.FC<SquareCheckoutProps> = ({
  cart,
  customerData,
  orderData,
  mode = 'embedded',
  className = ''
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { clearCart } = useCart();
  const router = useRouter();

  // Get Square configuration from environment variables
  const squareApplicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
  const squareLocationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || 'main';

  if (!squareApplicationId) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-sm text-red-600">
          Square決済の設定が不完全です。管理者にお問い合わせください。
        </p>
      </div>
    );
  }

  // Validate form data
  const validateData = () => {
    if (!cart || cart.items.length === 0) {
      throw new Error('カートが空です');
    }

    if (!customerData.email || !customerData.firstName || !customerData.lastName) {
      throw new Error('お客様情報を入力してください');
    }

    if (!orderData.shippingAddress.address1 || !orderData.shippingAddress.city) {
      throw new Error('配送先住所を入力してください');
    }
  };

  // Handle embedded payment (Web Payments SDK)
  const handleEmbeddedPayment = async (paymentResult: { token: string; details: object }) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cart,
          customerData,
          orderData,
          paymentToken: paymentResult,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || '決済処理に失敗しました');
      }

      if (!result.success) {
        throw new Error(result.message || '決済が完了しませんでした');
      }

      // Clear cart and redirect to success page
      clearCart();
      router.push(result.data.redirectUrl || `/payment/success?order=${result.data.orderNumber}`);

    } catch (error) {
      console.error('Payment error:', error);
      setError(error instanceof Error ? error.message : '決済処理中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle redirect payment (Payment Link)
  const handleRedirectPayment = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      validateData();

      const response = await fetch('/api/payments/create-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cart,
          customerData,
          orderData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'お支払いリンクの作成に失敗しました');
      }

      if (!result.success || !result.data?.paymentUrl) {
        throw new Error('お支払いリンクが取得できませんでした');
      }

      // Redirect to Square payment page
      window.location.href = result.data.paymentUrl;

    } catch (error) {
      console.error('Checkout error:', error);
      setError(error instanceof Error ? error.message : 'お支払い処理中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentError = (error: Error) => {
    console.error('Payment error:', error);
    setError('決済処理中にエラーが発生しました。カード情報を確認して再度お試しください。');
  };


  if (mode === 'redirect') {
    return (
      <div className={`w-full ${className}`}>
        <Button
          onClick={handleRedirectPayment}
          disabled={isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              処理中...
            </div>
          ) : (
            'お支払いに進む'
          )}
        </Button>
        
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // Embedded mode (Web Payments SDK) - 直接決済フォームを表示
  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Square Payment Form */}
      <SquarePaymentForm
        applicationId={squareApplicationId}
        locationId={squareLocationId}
        amount={cart.total}
        onPaymentSuccess={handleEmbeddedPayment}
        onPaymentError={handlePaymentError}
        disabled={isProcessing}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};