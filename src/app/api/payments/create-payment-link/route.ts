import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createPaymentLink, convertToSquareAmount, SQUARE_CONFIG } from '@/lib/square'
import { client } from '@/lib/sanity'
import { recalculateCartTotals, InvalidCartError } from '@/lib/orderPricing'
import { InventoryService } from '@/lib/inventory'
import type { Cart, CheckoutFormData } from '@/types/ecommerce'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cart, customerData, orderData } = body as {
      cart: Cart
      customerData: CheckoutFormData['customer']
      orderData: Omit<CheckoutFormData, 'customer'>
    }

    // Validate required data
    if (!cart || !customerData || !orderData) {
      return NextResponse.json(
        { error: 'Missing required data: cart, customerData, or orderData' },
        { status: 400 }
      )
    }

    if (!cart.items || cart.items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      )
    }

    // 価格・送料改ざん対策: クライアント申告額を信用せず、Sanityの正規データと送料設定から再計算する
    let totals
    try {
      totals = await recalculateCartTotals(cart, {
        prefecture: orderData.shippingAddress?.state,
        express: orderData.shippingMethod === 'express',
      })
    } catch (error) {
      if (error instanceof InvalidCartError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      throw error
    }

    // 決済リンクを発行する前に在庫を確保する。Sanityのproduct.stockQuantity/reservedに
    // 対するアトミックな増減を使うため、同時に複数の注文が入っても売り越しが起きない。
    const inventoryItems = cart.items.map(item => ({ productId: item.product._id, quantity: item.quantity }))
    const reservation = await InventoryService.reserveCartItems(inventoryItems)
    if (!reservation.success) {
      return NextResponse.json(
        { error: `在庫が不足しています（商品ID: ${reservation.productId}）` },
        { status: 400 }
      )
    }

    // Generate unique order number
    const orderNumber = `MOS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    
    // Create order in Sanity first (with pending status)
    const orderDoc = {
      _type: 'order',
      orderNumber,
      customer: {
        email: customerData.email,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        phone: customerData.phone,
      },
      items: cart.items.map(item => ({
        _type: 'object',
        product: {
          _type: 'reference',
          _ref: item.product._id,
        },
        quantity: item.quantity,
        price: item.price,
        variant: item.variant?.name || null,
      })),
      subtotal: totals.subtotal,
      shippingCost: totals.shippingCost,
      tax: totals.tax,
      total: totals.total,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'credit_card',
      shippingAddress: orderData.shippingAddress,
      billingAddress: orderData.sameAsShipping 
        ? orderData.shippingAddress 
        : orderData.billingAddress,
      shippingMethod: {
        id: orderData.shippingMethod,
        name: cart.shippingMethod?.name || 'Standard Shipping',
        price: cart.shippingCost,
        estimatedDays: cart.shippingMethod?.estimatedDays || 7,
      },
      notes: orderData.notes || '',
      metadata: {
        // Ready for future reservation system
        customData: {
          newsletter: orderData.newsletter,
          terms: orderData.terms,
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    let createdOrder: { _id: string }
    let paymentLink: Awaited<ReturnType<typeof createPaymentLink>>

    try {
      // Save order to Sanity
      createdOrder = await client.create(orderDoc)

      if (!createdOrder._id) {
        throw new Error('Failed to create order in database')
      }

      // Create Square Payment Link
      const idempotencyKey = uuidv4()
      const paymentNote = `Order ${orderNumber} - ${cart.items.length} item(s)`

      const squareRequest = {
        idempotencyKey,
        quickPay: {
          name: `MOSS COUNTRY Order ${orderNumber}`,
          priceMoney: {
            amount: convertToSquareAmount(totals.total),
            currency: SQUARE_CONFIG.currency,
          },
          locationId: SQUARE_CONFIG.locationId,
        },
        paymentNote,
        checkoutOptions: {
          allowTipping: false,
          redirectUrl: `${SQUARE_CONFIG.appBaseUrl}/payment/success?order=${orderNumber}`,
          merchantSupportEmail: 'support@moss-country.com',
        },
        prePopulatedData: {
          buyerEmail: customerData.email,
          buyerPhoneNumber: customerData.phone,
          buyerAddress: {
            addressLine1: orderData.shippingAddress.address1,
            addressLine2: orderData.shippingAddress.address2 || undefined,
            locality: orderData.shippingAddress.city,
            administrativeDistrictLevel1: orderData.shippingAddress.state,
            postalCode: orderData.shippingAddress.postalCode,
            country: orderData.shippingAddress.country,
          },
        },
      }

      paymentLink = await createPaymentLink(squareRequest)

      // Update order with Square IDs
      await client
        .patch(createdOrder._id)
        .set({
          squareOrderId: paymentLink.orderId,
          updatedAt: new Date().toISOString(),
        })
        .commit()
    } catch (error) {
      // 注文作成・決済リンク発行に失敗した場合、確保済みの在庫予約を解放する
      await InventoryService.releaseCartItems(inventoryItems)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentUrl: paymentLink.url,
        orderId: createdOrder._id,
        orderNumber,
        squareOrderId: paymentLink.orderId,
        total: totals.total,
      },
    })

  } catch (error) {
    console.error('Error creating payment link:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to create payment link',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

