import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, getPayment, getOrder } from '@/lib/square'
// 店頭QR決済（inStoreCharge）はPIIを含まずSanity据え置きのため、この検索のみwriteClientを使う
import { writeClient as client } from '@/lib/sanity'
import { InventoryService } from '@/lib/inventory'
import { sendMail } from '@/lib/mailer'
import { getOrderBySquareId, updateOrderStatus, type Order } from '@/lib/orders'
import { syncChargeToSheetById } from '@/lib/salesBackup'
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

    // Find the order associated with this payment.
    // squareOrderId は Square が決済に紐づけて自動作成する Order の ID。
    // 万一 squareOrderId が保存されていない/一致しない場合に備え、
    // 決済作成時に同期的に保存される squarePaymentId でもフォールバック検索する。
    const order = await getOrderBySquareId({
      squareOrderId: (payment as { order_id?: string }).order_id ?? null,
      squarePaymentId: paymentId,
    })

    if (!order) {
      // ECの注文ではない場合、店頭QR決済（inStoreCharge）の可能性を確認する
      await handleInStoreChargeUpdate(payment, paymentId)
      return
    }

    // Square は同一Webhookを複数回配信することがあるため、
    // 既に反映済みのステータスであれば処理をスキップする（在庫の二重減算・二重復元を防止）
    if (payment.status === 'COMPLETED' && order.paymentStatus === 'paid') {
      console.log(`Order ${order.orderNumber} is already marked as paid - skipping duplicate webhook`)
      return
    }
    if ((payment.status === 'FAILED' || payment.status === 'CANCELED') && order.paymentStatus === 'failed') {
      console.log(`Order ${order.orderNumber} is already marked as failed - skipping duplicate webhook`)
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
 * 店頭QRコード決済（inStoreCharge）の決済結果を反映する。
 * ECの注文と異なり在庫操作は不要。金額・ステータスのみ更新する。
 */
async function handleInStoreChargeUpdate(payment: { status: string; id: string; order_id?: string }, paymentId: string) {
  try {
    const chargeQuery = `
      *[_type == "inStoreCharge" && (squareOrderId == $orderId || squarePaymentId == $paymentId)][0] {
        _id,
        status
      }
    `
    const charge = await client.fetch(chargeQuery, {
      orderId: (payment as { order_id?: string }).order_id ?? null,
      paymentId,
    })

    if (!charge) {
      console.error(`Order or in-store charge not found for Square payment ID: ${paymentId}`)
      return
    }

    // 同一Webhookの重複配信に対する二重処理防止
    if (charge.status !== 'pending') {
      console.log(`In-store charge ${charge._id} already processed (status: ${charge.status}) - skipping`)
      return
    }

    if (payment.status === 'COMPLETED') {
      await client
        .patch(charge._id)
        .set({
          status: 'paid',
          squarePaymentId: payment.id,
          paidAt: new Date().toISOString(),
        })
        .commit()
      console.log(`In-store charge ${charge._id} marked as paid`)
      // バックアップ用Googleスプレッドシート同期（await-and-swallow。Cronの保険が無いため
      // 完了を待つ。失敗してもこのwebhook処理には一切影響させない）
      try {
        await syncChargeToSheetById(charge._id)
      } catch {
        // syncChargeToSheetById内部で既にログ済みのため、ここでは握りつぶすのみ
      }
    } else if (payment.status === 'FAILED' || payment.status === 'CANCELED') {
      await client
        .patch(charge._id)
        .set({
          status: 'cancelled',
          squarePaymentId: payment.id,
        })
        .commit()
      console.log(`In-store charge ${charge._id} marked as cancelled`)
    }
  } catch (error) {
    console.error('Error handling in-store charge update:', error)
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
    const order = await getOrderBySquareId({ squareOrderId: orderId })

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
      await updateOrderStatus(order.id, { status: newStatus })

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
async function processSuccessfulPayment(order: Order, payment: { id: string; receiptUrl?: string }) {
  try {
    console.log(`Processing successful payment for order ${order.orderNumber}`)

    // Update order status to paid
    await updateOrderStatus(order.id, {
      status: 'paid',
      paymentStatus: 'paid',
      squarePaymentId: payment.id,
    })

    // Convert reserved inventory to actual reduction
    const inventoryItems = order.items.map(item => ({ productId: item.productId, quantity: item.quantity }))
    await InventoryService.confirmCartPurchase(inventoryItems, order.id)

    // 注文確認メールはSquareの自動レシート送信機能を使用しているが、
    // 念のため顧客メールが取得できる場合はこちらからも注文確認メールを送る
    if (order.customerEmail) {
      try {
        const customerName = [order.customerLastName, order.customerFirstName].filter(Boolean).join(' ')
        await sendMail({
          to: order.customerEmail,
          subject: `【MOSS COUNTRY】ご注文確認 (注文番号: ${order.orderNumber})`,
          text: [
            customerName ? `${customerName} 様` : 'お客様',
            '',
            'この度はMOSS COUNTRYにてご注文いただき、誠にありがとうございます。',
            'お支払いが完了しましたのでご確認ください。',
            '',
            `注文番号: ${order.orderNumber}`,
            `お支払い金額: ¥${(order.total ?? 0).toLocaleString()}`,
            '',
            '----',
            'MOSS COUNTRY',
          ].join('\n'),
        })
      } catch (mailError) {
        console.error(`Failed to send order confirmation email for order ${order.orderNumber}:`, mailError)
      }
    }
    console.log(`Payment processed for order ${order.orderNumber}. Customer will receive Square receipt automatically.`)

    console.log(`Successfully processed payment for order ${order.orderNumber}`)

  } catch (error) {
    console.error(`Error processing successful payment for order ${order.orderNumber}:`, error)
    throw error
  }
}

/**
 * Process failed payment
 */
async function processFailedPayment(order: Order, payment: { id: string }) {
  try {
    console.log(`Processing failed payment for order ${order.orderNumber}`)

    // Update order status
    await updateOrderStatus(order.id, {
      status: 'cancelled',
      paymentStatus: 'failed',
      squarePaymentId: payment.id,
    })

    // Release reserved inventory
    const inventoryItems = order.items.map(item => ({ productId: item.productId, quantity: item.quantity }))
    await InventoryService.releaseCartItems(inventoryItems, order.id)

    console.log(`Successfully processed failed payment for order ${order.orderNumber}`)

  } catch (error) {
    console.error(`Error processing failed payment for order ${order.orderNumber}:`, error)
    throw error
  }
}

