import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { convertToSquareAmount, SQUARE_CONFIG } from '@/lib/square';
import { recalculateCartTotals, InvalidCartError } from '@/lib/orderPricing';
import { InventoryService } from '@/lib/inventory';
import { createOrder, updateOrderStatus } from '@/lib/orders';
import type { Cart, CheckoutFormData } from '@/types/ecommerce';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cart, customerData, orderData, paymentToken } = body as {
      cart: Cart;
      customerData: CheckoutFormData['customer'];
      orderData: Omit<CheckoutFormData, 'customer'>;
      paymentToken: { token: string; details: object };
    };

    // Validate required data
    if (!cart || !customerData || !orderData || !paymentToken) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      );
    }

    if (!cart.items || cart.items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // 価格・送料改ざん対策: クライアント申告額を信用せず、Sanityの正規データと送料設定から再計算する
    let totals;
    try {
      totals = await recalculateCartTotals(cart, {
        prefecture: orderData.shippingAddress?.state,
        express: orderData.shippingMethod === 'express',
      });
    } catch (error) {
      if (error instanceof InvalidCartError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    // 決済前に在庫を確保する（開発環境ではSanityへのアクセスをスキップ）
    // Sanityの product.stockQuantity/reserved に対するアトミックな増減を使うため、
    // 同時に複数の注文が入っても在庫の売り越しが起きない
    const inventoryItems = cart.items.map(item => ({ productId: item.product._id, quantity: item.quantity }));
    if (process.env.NODE_ENV !== 'development') {
      const reservation = await InventoryService.reserveCartItems(inventoryItems);
      if (!reservation.success) {
        return NextResponse.json(
          { error: `在庫が不足しています（商品ID: ${reservation.productId}）` },
          { status: 400 }
        );
      }
    }

    // Generate unique order number
    const orderNumber = `MOS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // 開発環境ではSupabase保存をスキップしてテスト
    let createdOrder: { id: string; orderNumber: string } = { id: `temp-order-${Date.now()}`, orderNumber };

    if (process.env.NODE_ENV !== 'development') {
      // 本番環境でのみSupabaseに保存
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
        notes: orderData.notes || '',
      });
    } else {
      console.log('🚧 開発環境: Supabase保存をスキップしてSquare決済をテスト');
    }

    // Process payment with Square
    const paymentResult = await processSquarePayment({
      token: paymentToken.token,
      amount: totals.total,
      orderNumber,
      customerEmail: customerData.email,
      orderId: createdOrder.id,
    });

    if (!paymentResult.success) {
      // Update order status to failed (開発環境ではスキップ)
      if (process.env.NODE_ENV !== 'development' && createdOrder.id.startsWith('temp-') === false) {
        await updateOrderStatus(createdOrder.id, {
          status: 'cancelled',
          paymentStatus: 'failed',
        });
      }

      // 決済が失敗したため、確保しておいた在庫予約を解放する
      if (process.env.NODE_ENV !== 'development') {
        await InventoryService.releaseCartItems(inventoryItems);
      }

      return NextResponse.json(
        {
          error: 'Payment failed',
          message: paymentResult.error || 'Unknown payment error',
        },
        { status: 400 }
      );
    }

    // Update order with payment success (開発環境ではスキップ)
    // 重要: この時点で決済は既に成立している。DB更新に失敗しても顧客に「決済失敗」と
    // 返してはいけない（実際は課金済みのため、再決済による二重課金を招く）。
    // 更新失敗は要手動確認としてログに残し、処理は継続して必ず成功レスポンスを返す。
    // status は Square の payment.updated Webhook が後追いで 'paid' に確定させる。
    if (process.env.NODE_ENV !== 'development' && createdOrder.id.startsWith('temp-') === false) {
      const paidFields: Parameters<typeof updateOrderStatus>[1] = {
        status: 'paid',
        paymentStatus: 'paid',
        squarePaymentId: paymentResult.paymentId,
      };
      // Squareは注文IDを指定しない決済でも自動的にOrderを作成するため、
      // Webhook側で squareOrderId から注文を特定できるように保存しておく
      if (paymentResult.orderId) {
        paidFields.squareOrderId = paymentResult.orderId;
      }
      try {
        await updateOrderStatus(createdOrder.id, paidFields);
      } catch (updateError) {
        console.error('🚨 決済は成立したが注文ステータスの更新に失敗しました。手動確認が必要です:', {
          orderId: createdOrder.id,
          orderNumber,
          squarePaymentId: paymentResult.paymentId,
          error: updateError,
        });
      }
    } else {
      console.log('✅ 開発環境: 決済成功 - Supabase更新をスキップ');
    }

    // 決済がその場で完了しているため、予約済み在庫を実在庫の減算に確定する
    // （Webhookが後から届いても、既に paymentStatus: 'paid' のため二重処理はされない）
    if (process.env.NODE_ENV !== 'development') {
      try {
        await InventoryService.confirmCartPurchase(inventoryItems, createdOrder.id);
      } catch (inventoryError) {
        console.error('Failed to finalize inventory after successful payment:', inventoryError);
        // 決済は既に成立しているため処理は継続する（在庫は管理画面で手動調整が必要）
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: createdOrder.id,
        orderNumber,
        paymentId: paymentResult.paymentId,
        total: totals.total,
        redirectUrl: `/payment/success?order=${orderNumber}`,
      },
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    
    return NextResponse.json(
      {
        error: 'Payment processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Process payment with Square Payments API
 */
async function processSquarePayment({
  token,
  amount,
  orderNumber,
  customerEmail,
  orderId,
}: {
  token: string;
  amount: number;
  orderNumber: string;
  customerEmail: string;
  orderId: string;
}): Promise<{ success: boolean; paymentId?: string; orderId?: string; error?: string }> {
  try {
    // 設定確認のログ
    console.log('Square Payment Configuration:', {
      hasAccessToken: !!process.env.SQUARE_ACCESS_TOKEN,
      locationId: SQUARE_CONFIG.locationId,
      apiBaseUrl: SQUARE_CONFIG.apiBaseUrl,
      currency: SQUARE_CONFIG.currency,
      amount: convertToSquareAmount(amount),
      token: token.substring(0, 10) + '...',
      customerEmail
    });

    // バリデーション
    if (!token || typeof token !== 'string' || token.length < 10) {
      throw new Error('Invalid payment token format');
    }
    if (!SQUARE_CONFIG.locationId) {
      throw new Error('Square location ID not configured');
    }
    if (amount <= 0) {
      throw new Error('Invalid payment amount');
    }
    const idempotencyKey = uuidv4();
    const amountMoney = {
      amount: convertToSquareAmount(amount),
      currency: SQUARE_CONFIG.currency,
    };

    const requestBody = {
      source_id: token,
      idempotency_key: idempotencyKey,
      amount_money: amountMoney,
      autocomplete: true, // Automatically complete the payment
      location_id: SQUARE_CONFIG.locationId,
      reference_id: orderNumber,
      note: `MOSS COUNTRY Order: ${orderNumber}`,
      buyer_email_address: customerEmail,
    };

    console.log('🔍 Square API Request Details:', {
      endpoint: `${SQUARE_CONFIG.apiBaseUrl}/v2/payments`,
      locationId: SQUARE_CONFIG.locationId,
      amountFormatted: `¥${amount}`,
      squareAmount: convertToSquareAmount(amount),
      tokenLength: token.length,
      hasAccessToken: !!process.env.SQUARE_ACCESS_TOKEN,
      accessTokenLength: process.env.SQUARE_ACCESS_TOKEN?.length
    });

    const response = await fetch(`${SQUARE_CONFIG.apiBaseUrl}/v2/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-06-04',
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('🚨 Square payment failed:', {
        status: response.status,
        statusText: response.statusText,
        result,
        requestBody: {
          ...requestBody,
          source_id: requestBody.source_id.substring(0, 10) + '...' // トークンを一部マスク
        },
        errors: JSON.stringify(result.errors, null, 2)
      });

      // 特定のエラーコードに対応
      const firstError = result.errors?.[0];
      let errorMessage = `HTTP ${response.status}: Payment processing failed`;
      
      if (firstError) {
        switch (firstError.code) {
          case 'CARD_TOKEN_EXPIRED':
            errorMessage = 'カード情報の有効期限が切れました。再度お試しください。';
            break;
          case 'INVALID_LOCATION':
            errorMessage = '店舗設定に問題があります。管理者にお問い合わせください。';
            break;
          case 'CARD_DECLINED':
            errorMessage = 'カードが拒否されました。別のカードをお試しください。';
            break;
          case 'INSUFFICIENT_FUNDS':
            errorMessage = '残高不足です。別のカードをお試しください。';
            break;
          case 'CARD_TOKEN_USED':
            errorMessage = '決済処理でエラーが発生しました。再度お試しください。';
            break;
          default:
            errorMessage = firstError.detail || firstError.code || errorMessage;
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
      paymentId: result.payment?.id,
      orderId: result.payment?.order_id,
    };

  } catch (error) {
    console.error('Error processing Square payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown payment error',
    };
  }
}

