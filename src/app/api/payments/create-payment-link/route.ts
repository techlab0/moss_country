import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createPaymentLink, convertToSquareAmount, SQUARE_CONFIG } from '@/lib/square'
import { recalculateCartTotals, InvalidCartError } from '@/lib/orderPricing'
import { InventoryService } from '@/lib/inventory'
import { createOrder, updateOrderStatus } from '@/lib/orders'
import { isCarrierId } from '@/lib/shipping'
import { assertPurchaseAllowed } from '@/lib/purchaseLock'
import type { Cart, CheckoutFormData } from '@/types/ecommerce'

export async function POST(request: NextRequest) {
  try {
    // 購入ロック中は決済を確定させない（閲覧・カート追加は制限しない管理者トグル）
    const purchaseLock = await assertPurchaseAllowed()
    if (purchaseLock.locked) {
      return NextResponse.json({ error: purchaseLock.message }, { status: 403 })
    }

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

    // クライアント申告の配送業者は 'yupack' | 'yamato' 以外を受け付けない（不正値はnull扱い）
    const shippingCarrier = isCarrierId(orderData.shippingCarrier) ? orderData.shippingCarrier : null

    // 価格・送料改ざん対策: クライアント申告額を信用せず、Sanityの正規データと送料設定から再計算する
    let totals
    try {
      totals = await recalculateCartTotals(cart, {
        prefecture: orderData.shippingAddress?.state,
        express: orderData.shippingMethod === 'express',
        carrier: shippingCarrier ?? undefined,
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

    let createdOrder: { id: string; orderNumber: string }
    let paymentLink: Awaited<ReturnType<typeof createPaymentLink>>

    try {
      // Save order to Supabase (pending status)
      createdOrder = await createOrder({
        orderNumber,
        customerEmail: customerData.email,
        customerFirstName: customerData.firstName,
        customerLastName: customerData.lastName,
        customerPhone: customerData.phone,
        items: cart.items.map(item => ({
          productId: item.product._id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.price,
          variant: item.variant?.name || null,
          salesItemId: item.product.salesItemId ?? null,
        })),
        subtotal: totals.subtotal,
        shippingCost: totals.shippingCost,
        tax: totals.tax,
        total: totals.total,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'credit_card',
        shippingAddress: orderData.shippingAddress,
        shippingCarrier,
        notes: orderData.notes || '',
      })

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
      await updateOrderStatus(createdOrder.id, {
        squareOrderId: paymentLink.orderId,
      })
    } catch (error) {
      // 注文作成・決済リンク発行に失敗した場合、確保済みの在庫予約を解放する
      await InventoryService.releaseCartItems(inventoryItems)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentUrl: paymentLink.url,
        orderId: createdOrder.id,
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

