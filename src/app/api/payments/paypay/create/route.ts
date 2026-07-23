import { NextRequest, NextResponse } from 'next/server';
import { recalculateCartTotals, InvalidCartError } from '@/lib/orderPricing';
import { InventoryService } from '@/lib/inventory';
import { createOrder, updateOrderStatus } from '@/lib/orders';
import { isCarrierId } from '@/lib/shipping';
import { checkRateLimit } from '@/lib/simpleRateLimit';
import { createWebPayment, isPaypayConfigured } from '@/lib/paypayWebClient';
import type { Cart, CheckoutFormData } from '@/types/ecommerce';

/**
 * PayPayウェブ決済（EC）の支払いURLを発行するAPI。
 *
 * removable設計の要: `isPaypayConfigured()`（PAYPAY_RELAY_URL / PAYPAY_RELAY_SECRET の有無）が
 * falseの間は503を返すだけで、他の決済手段（credit_card / bank_transfer / cash_on_delivery）には
 * 一切影響しない。
 *
 * 決済リンク発行前に在庫を確保し、Supabaseへ注文を pending で保存する流れは
 * src/app/api/payments/create-payment-link/route.ts（Square Payment Link）と同じ方針。
 * 発行に失敗した場合は確保済みの在庫予約を解放し、作成済みの注文があればキャンセル扱いにする。
 */
export async function POST(request: NextRequest) {
  try {
    // 在庫予約を伴うAPIのため、連打による在庫枯渇DoSを防ぐレート制限をかける
    // （src/app/api/orders/create-offline/route.ts と同じ制限値）
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(`paypay-create:${ip}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'リクエストが多すぎます。しばらくしてから再度お試しください' },
        { status: 429 }
      );
    }

    // PayPayウェブ決済が未設定（承認前・無効化中）の場合は503のみを返す。
    // これ以外のロジックには一切触れないため、既存の決済手段への影響はない。
    if (!isPaypayConfigured()) {
      return NextResponse.json(
        { error: 'PayPay決済は現在ご利用いただけません' },
        { status: 503 }
      );
    }

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

    // クライアント申告の配送業者は 'yupack' | 'yamato' 以外を受け付けない（不正値はnull扱い）
    const shippingCarrier = isCarrierId(orderData.shippingCarrier) ? orderData.shippingCarrier : null;

    // 価格・送料改ざん対策: クライアント申告額を信用せず、Sanityの正規データと送料設定から再計算する
    let totals;
    try {
      totals = await recalculateCartTotals(cart, {
        prefecture: orderData.shippingAddress?.state,
        express: orderData.shippingMethod === 'express',
        carrier: shippingCarrier ?? undefined,
      });
    } catch (error) {
      if (error instanceof InvalidCartError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    // 決済URLを発行する前に在庫を確保する（Sanityのstock/reservedに対するアトミックな増減）
    const inventoryItems = cart.items.map(item => ({ productId: item.product._id, quantity: item.quantity }));
    const reservation = await InventoryService.reserveCartItems(inventoryItems);
    if (!reservation.success) {
      return NextResponse.json(
        { error: `在庫が不足しています（商品ID: ${reservation.productId}）` },
        { status: 400 }
      );
    }

    const orderNumber = `MOS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    let createdOrder: { id: string; orderNumber: string } | undefined;
    let paymentUrl: string;

    try {
      // 注文をSupabaseに保存（pending）。merchantPaymentIdにはこの注文番号を使う。
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
        paymentMethod: 'paypay',
        shippingAddress: orderData.shippingAddress,
        shippingCarrier,
        notes: orderData.notes || '',
      });

      // 決済後リダイレクト・戻りURLの基点。本番はNEXT_PUBLIC_SITE_URLで独自ドメインを指定する
      // （src/lib/square.ts の SQUARE_CONFIG.appBaseUrl と同じ方針。未設定時はこのリクエストの
      // オリジンにフォールバックする）
      const siteBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
      const redirectUrl = `${siteBaseUrl}/payment/paypay/return?order=${encodeURIComponent(orderNumber)}`;

      const orderItems = cart.items.map(item => ({
        name: item.variant?.name ? `${item.product.name}（${item.variant.name}）` : item.product.name,
        quantity: item.quantity,
        unitPriceJpy: item.price,
      }));

      const webPayment = await createWebPayment({
        merchantPaymentId: orderNumber,
        amountJpy: totals.total,
        orderDescription: `MOSS COUNTRY Order ${orderNumber} - ${cart.items.length} item(s)`,
        orderItems,
        redirectUrl,
      });

      paymentUrl = webPayment.paymentUrl;
    } catch (error) {
      // 注文作成・PayPay決済URL発行のいずれかに失敗した場合、確保済みの在庫予約を解放し、
      // 注文が作成済みであればキャンセル扱いにする（既存 create-payment-link のロールバック方針に合わせる）
      await InventoryService.releaseCartItems(inventoryItems);
      if (createdOrder) {
        try {
          await updateOrderStatus(createdOrder.id, { status: 'cancelled', paymentStatus: 'failed' });
        } catch (rollbackError) {
          console.error('PayPay決済URL発行失敗後の注文キャンセル更新にも失敗しました:', rollbackError);
        }
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentUrl,
        orderNumber,
        total: totals.total,
      },
    });
  } catch (error) {
    console.error('Error creating PayPay web payment:', error);

    return NextResponse.json(
      {
        error: 'Failed to create PayPay payment',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
