import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createPaymentLink, convertToSquareAmount, SQUARE_CONFIG } from '@/lib/square'
import { client } from '@/lib/sanity'
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
      subtotal: cart.subtotal,
      shippingCost: cart.shippingCost,
      tax: cart.tax,
      total: cart.total,
      status: 'pending',
      paymentStatus: 'pending',
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

    // Save order to Sanity
    const createdOrder = await client.create(orderDoc)
    
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
          amount: convertToSquareAmount(cart.total),
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

    const paymentLink = await createPaymentLink(squareRequest)

    // Update order with Square IDs
    await client
      .patch(createdOrder._id)
      .set({
        squareOrderId: paymentLink.orderId,
        updatedAt: new Date().toISOString(),
      })
      .commit()

    // Reserve inventory for this order
    try {
      await reserveInventory(cart.items)
    } catch (inventoryError) {
      console.warn('Failed to reserve inventory:', inventoryError)
      // Continue with payment flow even if inventory reservation fails
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentUrl: paymentLink.url,
        orderId: createdOrder._id,
        orderNumber,
        squareOrderId: paymentLink.orderId,
        total: cart.total,
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

/**
 * Reserve inventory for order items
 */
async function reserveInventory(items: Cart['items']) {
  for (const item of items) {
    try {
      // Find inventory record for this product
      const inventoryQuery = `
        *[_type == "inventory" && product._ref == $productId][0] {
          _id,
          quantity,
          reserved
        }
      `
      
      const inventory = await client.fetch(inventoryQuery, { 
        productId: item.product._id 
      })

      if (inventory) {
        // Update reserved quantity
        const newReserved = (inventory.reserved || 0) + item.quantity
        const newAvailable = inventory.quantity - newReserved

        await client
          .patch(inventory._id)
          .set({
            reserved: newReserved,
            available: newAvailable,
            lastUpdated: new Date().toISOString(),
          })
          .commit()

        console.log(`Reserved ${item.quantity} units of product ${item.product._id}`)
      } else {
        console.warn(`No inventory record found for product ${item.product._id}`)
      }
    } catch (error) {
      console.error(`Failed to reserve inventory for product ${item.product._id}:`, error)
      throw error
    }
  }
}