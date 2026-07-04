import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/sanity';
import { recalculateCartTotals, InvalidCartError } from '@/lib/orderPricing';
import { InventoryService } from '@/lib/inventory';
import type { Cart, CheckoutFormData } from '@/types/ecommerce';

const OFFLINE_PAYMENT_METHODS: Record<string, string> = {
  bank_transfer: '銀行振込',
  cash_on_delivery: '代金引換',
};

/**
 * クレジットカード以外の支払い方法（銀行振込・代金引換）の注文を作成する。
 * これまでchekout画面はこれらの支払い方法を選ぶと画面上で「注文完了」を表示するだけで
 * 実際には注文が一切保存されていなかったため、新設した。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cart, customerData, orderData } = body as {
      cart: Cart;
      customerData: CheckoutFormData['customer'];
      orderData: Omit<CheckoutFormData, 'customer'>;
    };

    if (!cart || !customerData || !orderData) {
      return NextResponse.json(
        { error: 'Missing required data: cart, customerData, or orderData' },
        { status: 400 }
      );
    }

    if (!cart.items || cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    const paymentMethodLabel = OFFLINE_PAYMENT_METHODS[orderData.paymentMethod];
    if (!paymentMethodLabel) {
      return NextResponse.json(
        { error: 'このAPIは銀行振込・代金引換のみ対応しています' },
        { status: 400 }
      );
    }

    // 価格改ざん対策: クライアント申告額を信用せず、Sanityの正規価格から再計算する
    let totals;
    try {
      totals = await recalculateCartTotals(cart);
    } catch (error) {
      if (error instanceof InvalidCartError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    // 注文を確定する前に在庫を確保する
    const inventoryItems = cart.items.map(item => ({ productId: item.product._id, quantity: item.quantity }));
    const reservation = await InventoryService.reserveCartItems(inventoryItems);
    if (!reservation.success) {
      return NextResponse.json(
        { error: `在庫が不足しています（商品ID: ${reservation.productId}）` },
        { status: 400 }
      );
    }

    const orderNumber = `MOS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const notesWithPaymentMethod = `【支払い方法: ${paymentMethodLabel}】${orderData.notes ? `\n${orderData.notes}` : ''}`;

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
      // 銀行振込は入金確認まで、代金引換は配達完了まで未入金として扱う
      paymentStatus: 'pending',
      paymentMethod: orderData.paymentMethod,
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
      notes: notesWithPaymentMethod,
      metadata: {
        customData: {
          newsletter: orderData.newsletter,
          terms: orderData.terms,
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let createdOrder: { _id: string };
    try {
      createdOrder = await client.create(orderDoc);
      if (!createdOrder._id) {
        throw new Error('Failed to create order in database');
      }
    } catch (error) {
      // 注文作成に失敗した場合、確保済みの在庫予約を解放する
      await InventoryService.releaseCartItems(inventoryItems);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: createdOrder._id,
        orderNumber,
        total: totals.total,
      },
    });
  } catch (error) {
    console.error('Error creating offline-payment order:', error);
    return NextResponse.json(
      {
        error: 'Order creation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
