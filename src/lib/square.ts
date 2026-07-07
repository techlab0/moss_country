import type { SquareCreatePaymentLinkRequest, SquarePaymentLink, SquarePayment, SquareOrder } from '@/types/ecommerce'

// Square APIが返す決済リンク（snake_case）。当システム内では camelCase の SquarePaymentLink に変換して扱う
interface SquareApiPaymentLink {
  id: string
  version: number
  name: string
  url: string
  order_id: string
}

// Square APIのエラーレスポンス形状（!response.ok 時のみ参照）
interface SquareErrorResponse {
  errors?: Array<{ code?: string; detail?: string; category?: string }>
}

// Square API configuration
const SQUARE_BASE_URL = process.env.SQUARE_ENVIRONMENT === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com'

// Configuration constants
export const SQUARE_CONFIG = {
  applicationId: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
  locationId: process.env.SQUARE_LOCATION_ID || 'main', // Default location ID
  environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
  currency: 'JPY', // Japanese Yen
  apiBaseUrl: SQUARE_BASE_URL, // Square API base URL
  appBaseUrl: process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000', // Our app's base URL
} as const

/**
 * Make authenticated request to Square API
 */
async function makeSquareRequest<T = Record<string, unknown>>(endpoint: string, method: string = 'GET', body?: object): Promise<T> {
  const url = `${SQUARE_BASE_URL}/v2${endpoint}`

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'Square-Version': '2024-06-04', // Use stable API version
  }

  const config: RequestInit = {
    method,
    headers,
  }

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(url, config)
  const data = await response.json()

  if (!response.ok) {
    console.error('Square API Error:', data)
    const errData = data as SquareErrorResponse
    throw new Error(`Square API Error: ${errData.errors?.[0]?.detail || 'Unknown error'}`)
  }

  return data as T
}

/**
 * Get locations from Square API
 */
export async function getLocations() {
  try {
    const data = await makeSquareRequest<{ locations?: object[] }>('/locations')
    return data.locations || []
  } catch (error) {
    console.error('Error getting Square locations:', error)
    throw error
  }
}

/**
 * Create a Square Payment Link for checkout
 */
export async function createPaymentLink(
  request: SquareCreatePaymentLinkRequest
): Promise<SquarePaymentLink> {
  try {
    const requestBody = {
      idempotency_key: request.idempotencyKey,
      quick_pay: {
        name: request.quickPay.name,
        price_money: {
          amount: request.quickPay.priceMoney.amount,
          currency: request.quickPay.priceMoney.currency,
        },
        location_id: request.quickPay.locationId,
      },
      payment_note: request.paymentNote,
      checkout_options: {
        allow_tipping: request.checkoutOptions?.allowTipping || false,
        custom_fields: request.checkoutOptions?.customFields,
        redirect_url: request.checkoutOptions?.redirectUrl,
        merchant_support_email: request.checkoutOptions?.merchantSupportEmail,
      },
      pre_populated_data: request.prePopulatedData ? {
        buyer_email: request.prePopulatedData.buyerEmail,
        buyer_phone_number: request.prePopulatedData.buyerPhoneNumber,
        buyer_address: request.prePopulatedData.buyerAddress ? {
          address_line_1: request.prePopulatedData.buyerAddress.addressLine1,
          address_line_2: request.prePopulatedData.buyerAddress.addressLine2,
          locality: request.prePopulatedData.buyerAddress.locality,
          administrative_district_level_1: request.prePopulatedData.buyerAddress.administrativeDistrictLevel1,
          postal_code: request.prePopulatedData.buyerAddress.postalCode,
          country: request.prePopulatedData.buyerAddress.country,
        } : undefined,
      } : undefined,
    }

    const data = await makeSquareRequest<{ payment_link?: SquareApiPaymentLink }>('/online-checkout/payment-links', 'POST', requestBody)

    const paymentLink = data.payment_link
    if (!paymentLink) {
      throw new Error('Payment link not returned from Square API')
    }

    return {
      id: paymentLink.id,
      version: paymentLink.version,
      name: paymentLink.name,
      url: paymentLink.url,
      orderId: paymentLink.order_id,
    }
  } catch (error) {
    console.error('Error creating Square payment link:', error)
    throw new Error(
      error instanceof Error 
        ? `Failed to create payment link: ${error.message}`
        : 'Failed to create payment link'
    )
  }
}

/**
 * Retrieve payment information from Square
 */
export async function getPayment(paymentId: string): Promise<SquarePayment | undefined> {
  try {
    const data = await makeSquareRequest<{ payment?: SquarePayment }>(`/payments/${paymentId}`)
    return data.payment
  } catch (error) {
    console.error('Error retrieving Square payment:', error)
    throw new Error(
      error instanceof Error 
        ? `Failed to retrieve payment: ${error.message}`
        : 'Failed to retrieve payment'
    )
  }
}

/**
 * Retrieve order information from Square
 */
export async function getOrder(orderId: string): Promise<SquareOrder | undefined> {
  try {
    const data = await makeSquareRequest<{ order?: SquareOrder }>(`/orders/${orderId}`)
    return data.order
  } catch (error) {
    console.error('Error retrieving Square order:', error)
    throw new Error(
      error instanceof Error 
        ? `Failed to retrieve order: ${error.message}`
        : 'Failed to retrieve order'
    )
  }
}

/**
 * 支払い済み決済の全額返金（店頭QR決済のキャンセル用）。
 * 実際にお客様のカードへ返金されるため、呼び出し側で必ず確認を挟むこと。
 */
export async function refundPayment(paymentId: string, amountJpy: number, idempotencyKey: string) {
  const data = await makeSquareRequest<{ refund?: { id?: string; status?: string } }>('/refunds', 'POST', {
    idempotency_key: idempotencyKey,
    payment_id: paymentId,
    amount_money: {
      amount: convertToSquareAmount(amountJpy),
      currency: SQUARE_CONFIG.currency,
    },
  })
  const refund = data.refund
  if (!refund?.id) {
    throw new Error('Refund not returned from Square API')
  }
  return { id: refund.id, status: refund.status }
}

/**
 * 未払いの決済リンクをSquare側から削除する（ベストエフォート。失敗しても呼び出し側で握りつぶしてよい）
 */
export async function deletePaymentLink(paymentLinkId: string): Promise<void> {
  await makeSquareRequest(`/online-checkout/payment-links/${paymentLinkId}`, 'DELETE')
}

/**
 * Verify webhook signature for security
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  url?: string
): boolean {
  try {
    const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
    
    if (!webhookSignatureKey) {
      console.error('🚨 SQUARE_WEBHOOK_SIGNATURE_KEY is not set')
      return false
    }
    
    if (!signature) {
      console.error('🚨 No signature provided in webhook')
      return false
    }
    
    // Square webhook signature verification
    // https://developer.squareup.com/docs/webhooks/step3verify
    const crypto = require('crypto')
    
    // Concatenate url + body for Square's signature verification
    const stringToSign = (url || '') + payload
    
    // Squareのx-square-signatureはHMAC-SHA1（SHA256ではない）
    // https://developer.squareup.com/docs/webhooks/step3verify
    const expectedSignature = crypto
      .createHmac('sha1', webhookSignatureKey)
      .update(stringToSign, 'utf8')
      .digest('base64')
    
    const receivedBuffer = Buffer.from(signature, 'base64')
    const expectedBuffer = Buffer.from(expectedSignature, 'base64')

    // 長さが一致しない場合はtimingSafeEqualが例外を投げるため、原因調査用に長さだけログに残す（値は出さない）
    if (receivedBuffer.length !== expectedBuffer.length) {
      console.error(
        `🚨 Webhook signature length mismatch: received header length=${signature.length} decoded=${receivedBuffer.length} bytes, expected decoded=${expectedBuffer.length} bytes, url=${url}`
      )
      return false
    }

    // Secure comparison to prevent timing attacks
    return crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  } catch (error) {
    console.error('🚨 Webhook signature verification failed:', error)
    return false
  }
}

/**
 * Convert amount from display currency to Square's format (cents/smallest unit)
 */
export function convertToSquareAmount(amount: number): number {
  // For JPY, no decimal places needed (already in smallest unit)
  // For other currencies like USD, multiply by 100
  return SQUARE_CONFIG.currency === 'JPY' ? Math.round(amount) : Math.round(amount * 100)
}

/**
 * Convert amount from Square's format back to display currency
 */
export function convertFromSquareAmount(amount: number): number {
  // For JPY, no conversion needed
  // For other currencies like USD, divide by 100
  return SQUARE_CONFIG.currency === 'JPY' ? amount : amount / 100
}