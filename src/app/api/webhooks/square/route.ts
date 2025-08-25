import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, getPayment, getOrder } from '@/lib/square'
import { client } from '@/lib/sanity'
import { sendOrderConfirmationEmail } from '@/lib/email'
import type { SquareWebhookEvent } from '@/types/ecommerce'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-square-signature') || ''
    const url = request.url

    // Verify webhook signature for security
    if (!verifyWebhookSignature(body, signature, url)) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const event: SquareWebhookEvent = JSON.parse(body)
    console.log(`Received Square webhook: ${event.type}`)

    // Handle different webhook event types
    switch (event.type) {
      case 'payment.updated':
        await handlePaymentUpdate(event)
        break
      
      case 'order.updated':
        await handleOrderUpdate(event)
        break
      
      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error processing Square webhook:', error)
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Handle payment update events
 */
async function handlePaymentUpdate(event: SquareWebhookEvent) {
  try {
    const paymentId = event.data.id
    const payment = await getPayment(paymentId)

    if (!payment) {
      console.error(`Payment not found: ${paymentId}`)
      return
    }

    console.log(`Payment ${paymentId} status: ${payment.status}`)

    // Find the order associated with this payment
    const orderQuery = `
      *[_type == "order" && squareOrderId == $orderId][0] {
        _id,
        orderNumber,
        customer,
        items,
        total,
        status,
        paymentStatus
      }
    `
    
    const order = await client.fetch(orderQuery, { 
      orderId: payment.orderId 
    })

    if (!order) {
      console.error(`Order not found for Square order ID: ${payment.orderId}`)
      return
    }

    // Update order based on payment status
    switch (payment.status) {
      case 'COMPLETED':
        await processSuccessfulPayment(order, payment)
        break
      
      case 'FAILED':
      case 'CANCELED':
        await processFailedPayment(order, payment)
        break
      
      default:
        console.log(`Payment ${paymentId} status ${payment.status} - no action needed`)
    }

  } catch (error) {
    console.error('Error handling payment update:', error)
    throw error
  }
}

/**
 * Handle order update events
 */
async function handleOrderUpdate(event: SquareWebhookEvent) {
  try {
    const orderId = event.data.id
    const squareOrder = await getOrder(orderId)

    if (!squareOrder) {
      console.error(`Square order not found: ${orderId}`)
      return
    }

    console.log(`Square order ${orderId} state: ${squareOrder.state}`)

    // Find our internal order
    const orderQuery = `
      *[_type == "order" && squareOrderId == $orderId][0] {
        _id,
        orderNumber,
        status
      }
    `
    
    const order = await client.fetch(orderQuery, { orderId })

    if (!order) {
      console.error(`Internal order not found for Square order ID: ${orderId}`)
      return
    }

    // Update order status based on Square order state
    let newStatus = order.status
    switch (squareOrder.state) {
      case 'COMPLETED':
        newStatus = 'paid'
        break
      case 'CANCELED':
        newStatus = 'cancelled'
        break
    }

    if (newStatus !== order.status) {
      await client
        .patch(order._id)
        .set({
          status: newStatus,
          updatedAt: new Date().toISOString(),
        })
        .commit()

      console.log(`Updated order ${order.orderNumber} status to ${newStatus}`)
    }

  } catch (error) {
    console.error('Error handling order update:', error)
    throw error
  }
}

/**
 * Process successful payment
 */
async function processSuccessfulPayment(order: { _id: string; orderNumber: string; customer: object; items: Array<{ product: { _ref: string }; quantity: number }>; total: number }, payment: { id: string; receiptUrl?: string }) {
  try {
    console.log(`Processing successful payment for order ${order.orderNumber}`)

    // Update order status to paid
    await client
      .patch(order._id)
      .set({
        status: 'paid',
        paymentStatus: 'paid',
        squarePaymentId: payment.id,
        updatedAt: new Date().toISOString(),
      })
      .commit()

    // Convert reserved inventory to actual reduction
    await finalizeInventoryReduction(order.items)

    // Send confirmation email
    try {
      await sendOrderConfirmationEmail({
        orderNumber: order.orderNumber,
        customer: order.customer,
        items: order.items,
        total: order.total,
        paymentId: payment.id,
        receiptUrl: payment.receiptUrl,
      })
      console.log(`Sent confirmation email for order ${order.orderNumber}`)
    } catch (emailError) {
      console.error(`Failed to send confirmation email for order ${order.orderNumber}:`, emailError)
      // Don't throw - email failure shouldn't break the payment process
    }

    console.log(`Successfully processed payment for order ${order.orderNumber}`)

  } catch (error) {
    console.error(`Error processing successful payment for order ${order.orderNumber}:`, error)
    throw error
  }
}

/**
 * Process failed payment
 */
async function processFailedPayment(order: { _id: string; orderNumber: string; items: Array<{ product: { _ref: string }; quantity: number }> }, payment: { id: string }) {
  try {
    console.log(`Processing failed payment for order ${order.orderNumber}`)

    // Update order status
    await client
      .patch(order._id)
      .set({
        status: 'cancelled',
        paymentStatus: 'failed',
        squarePaymentId: payment.id,
        updatedAt: new Date().toISOString(),
      })
      .commit()

    // Release reserved inventory
    await releaseReservedInventory(order.items)

    console.log(`Successfully processed failed payment for order ${order.orderNumber}`)

  } catch (error) {
    console.error(`Error processing failed payment for order ${order.orderNumber}:`, error)
    throw error
  }
}

/**
 * Finalize inventory reduction after successful payment
 */
async function finalizeInventoryReduction(items: Array<{ product: { _ref: string }; quantity: number }>) {
  for (const item of items) {
    try {
      const inventoryQuery = `
        *[_type == "inventory" && product._ref == $productId][0] {
          _id,
          quantity,
          reserved
        }
      `
      
      const inventory = await client.fetch(inventoryQuery, { 
        productId: item.product._ref 
      })

      if (inventory) {
        const newQuantity = Math.max(0, inventory.quantity - item.quantity)
        const newReserved = Math.max(0, (inventory.reserved || 0) - item.quantity)
        const newAvailable = newQuantity - newReserved

        await client
          .patch(inventory._id)
          .set({
            quantity: newQuantity,
            reserved: newReserved,
            available: newAvailable,
            lastUpdated: new Date().toISOString(),
          })
          .commit()

        console.log(`Reduced inventory for product ${item.product._ref}: -${item.quantity} units`)
      }
    } catch (error) {
      console.error(`Failed to reduce inventory for product ${item.product._ref}:`, error)
      // Continue with other items
    }
  }
}

/**
 * Release reserved inventory for cancelled orders
 */
async function releaseReservedInventory(items: Array<{ product: { _ref: string }; quantity: number }>) {
  for (const item of items) {
    try {
      const inventoryQuery = `
        *[_type == "inventory" && product._ref == $productId][0] {
          _id,
          quantity,
          reserved
        }
      `
      
      const inventory = await client.fetch(inventoryQuery, { 
        productId: item.product._ref 
      })

      if (inventory) {
        const newReserved = Math.max(0, (inventory.reserved || 0) - item.quantity)
        const newAvailable = inventory.quantity - newReserved

        await client
          .patch(inventory._id)
          .set({
            reserved: newReserved,
            available: newAvailable,
            lastUpdated: new Date().toISOString(),
          })
          .commit()

        console.log(`Released reserved inventory for product ${item.product._ref}: +${item.quantity} units`)
      }
    } catch (error) {
      console.error(`Failed to release reserved inventory for product ${item.product._ref}:`, error)
      // Continue with other items
    }
  }
}