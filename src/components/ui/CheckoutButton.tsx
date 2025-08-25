'use client'

import { useState } from 'react'
import { Button } from './Button'
import type { Cart, CheckoutFormData } from '@/types/ecommerce'

interface CheckoutButtonProps {
  cart: Cart
  customerData: CheckoutFormData['customer']
  orderData: Omit<CheckoutFormData, 'customer'>
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

export function CheckoutButton({
  cart,
  customerData,
  orderData,
  disabled = false,
  className,
  children = 'お支払いに進む'
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async () => {
    if (disabled || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      // Validate required data
      if (!cart || cart.items.length === 0) {
        throw new Error('カートが空です')
      }

      if (!customerData.email || !customerData.firstName || !customerData.lastName) {
        throw new Error('お客様情報を入力してください')
      }

      if (!orderData.shippingAddress.address1 || !orderData.shippingAddress.city) {
        throw new Error('配送先住所を入力してください')
      }

      // Create payment link
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
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.message || 'お支払いリンクの作成に失敗しました')
      }

      if (!result.success || !result.data?.paymentUrl) {
        throw new Error('お支払いリンクが取得できませんでした')
      }

      // Redirect to Square payment page
      window.location.href = result.data.paymentUrl

    } catch (error) {
      console.error('Checkout error:', error)
      setError(
        error instanceof Error 
          ? error.message 
          : 'お支払い処理中にエラーが発生しました。しばらく時間をおいて再度お試しください。'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      <Button
        onClick={handleCheckout}
        disabled={disabled || isLoading}
        className={`w-full ${className || ''}`}
        size="lg"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            処理中...
          </div>
        ) : (
          children
        )}
      </Button>
      
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}

// Hook for easier usage
export function useCheckout() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createPaymentLink = async (
    cart: Cart,
    customerData: CheckoutFormData['customer'],
    orderData: Omit<CheckoutFormData, 'customer'>
  ) => {
    setIsLoading(true)
    setError(null)

    try {
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
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to create payment link')
      }

      return result.data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createPaymentLink,
    isLoading,
    error,
    clearError: () => setError(null),
  }
}