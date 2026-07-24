import { NextRequest, NextResponse } from 'next/server';
import { recalculateCartTotals, InvalidCartError } from '@/lib/orderPricing';
import { InventoryService } from '@/lib/inventory';
import { sendMail, STORE_EMAIL } from '@/lib/mailer';
import { createOrder } from '@/lib/orders';
import { checkRateLimit } from '@/lib/simpleRateLimit';
import { isCarrierId } from '@/lib/shipping';
import { assertPurchaseAllowed } from '@/lib/purchaseLock';
import type { Cart, CheckoutFormData } from '@/types/ecommerce';

const OFFLINE_PAYMENT_METHODS: Record<string, string> = {
  bank_transfer: '銀行振込',
  cash_on_delivery: '代金引換',
};

const CARRIER_LABELS: Record<string, string> = {
  yupack: 'ゆうパック（日本郵便）',
  yamato: '宅急便（ヤマト運輸）',
};

/**
 * クレジットカード以外の支払い方法（銀行振込・代金引換）の注文を作成する。
 * これまでchekout画面はこれらの支払い方法を選ぶと画面上で「注文完了」を表示するだけで
 * 実際には注文が一切保存されていなかったため、新設した。
 */
export async function POST(request: NextRequest) {
  try {
    // このAPIは在庫予約を伴うため、連打による在庫枯渇DoSを防ぐレート制限をかける
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(`create-offline:${ip}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'リクエストが多すぎます。しばらくしてから再度お試しください' },
        { status: 429 }
      );
    }

    // 購入ロック中は注文を確定させない（閲覧・カート追加は制限しない管理者トグル）
    const purchaseLock = await assertPurchaseAllowed();
    if (purchaseLock.locked) {
      return NextResponse.json({ error: purchaseLock.message }, { status: 403 });
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

    const paymentMethodLabel = OFFLINE_PAYMENT_METHODS[orderData.paymentMethod];
    if (!paymentMethodLabel) {
      return NextResponse.json(
        { error: 'このAPIは銀行振込・代金引換のみ対応しています' },
        { status: 400 }
      );
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

    let createdOrder: { id: string; orderNumber: string };
    try {
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
        // 銀行振込は入金確認まで、代金引換は配達完了まで未入金として扱う
        paymentStatus: 'pending',
        paymentMethod: orderData.paymentMethod,
        shippingAddress: orderData.shippingAddress,
        shippingCarrier,
        notes: notesWithPaymentMethod,
      });
    } catch (error) {
      // 注文作成に失敗した場合、確保済みの在庫予約を解放する
      await InventoryService.releaseCartItems(inventoryItems);
      throw error;
    }

    // 注文保存成功後、顧客宛の注文確認メールと店舗宛の新規注文通知メールを送信する
    // （送信の成否は注文作成フローには影響させない）
    const itemLines = cart.items.map(item => {
      const variantLabel = item.variant?.name ? `（${item.variant.name}）` : '';
      return `・${item.product.name}${variantLabel} × ${item.quantity} = ¥${(item.price * item.quantity).toLocaleString()}`;
    });
    const addr = orderData.shippingAddress;
    const shippingAddressLines = addr
      ? [
          `〒${addr.postalCode} ${addr.state}${addr.city}${addr.address1}${addr.address2 ? ' ' + addr.address2 : ''}`,
          `${addr.lastName} ${addr.firstName} 様`,
          addr.phone ? `電話番号: ${addr.phone}` : null,
        ].filter(Boolean).join('\n')
      : '未入力';

    let customerConfirmed = false;
    let storeNotified = false;
    try {
      const customerResult = await sendMail({
        to: customerData.email,
        subject: `【MOSS COUNTRY】ご注文確認 (注文番号: ${orderNumber})`,
        text: [
          `${customerData.lastName} ${customerData.firstName} 様`,
          '',
          'この度はMOSS COUNTRYにてご注文いただき、誠にありがとうございます。',
          '以下の内容でご注文を承りました。',
          '',
          `注文番号: ${orderNumber}`,
          '',
          '【ご注文内容】',
          ...itemLines,
          '',
          `小計: ¥${totals.subtotal.toLocaleString()}`,
          `送料: ¥${totals.shippingCost.toLocaleString()}`,
          `消費税: ¥${totals.tax.toLocaleString()}`,
          `合計: ¥${totals.total.toLocaleString()}`,
          '',
          `お支払い方法: ${paymentMethodLabel}`,
          shippingCarrier ? `配送業者: ${CARRIER_LABELS[shippingCarrier]}` : null,
          '',
          '【お届け先】',
          shippingAddressLines,
          '',
          '----',
          'MOSS COUNTRY',
        ].filter((line): line is string => line !== null).join('\n'),
      });
      customerConfirmed = customerResult.sent;

      const storeResult = await sendMail({
        to: STORE_EMAIL,
        subject: `【MOSS COUNTRY】新規注文（オフライン決済）: ${orderNumber}`,
        text: [
          'オフライン決済（銀行振込・代金引換）の新規注文がありました。',
          '',
          `注文番号: ${orderNumber}`,
          `お客様: ${customerData.lastName} ${customerData.firstName} (${customerData.email})`,
          `電話番号: ${customerData.phone || '未入力'}`,
          '',
          '【ご注文内容】',
          ...itemLines,
          '',
          `合計: ¥${totals.total.toLocaleString()}`,
          `お支払い方法: ${paymentMethodLabel}`,
          shippingCarrier ? `配送業者: ${CARRIER_LABELS[shippingCarrier]}` : null,
          '',
          '【お届け先】',
          shippingAddressLines,
        ].filter((line): line is string => line !== null).join('\n'),
      });
      storeNotified = storeResult.sent;
    } catch (mailError) {
      // メール送信の失敗で注文作成自体は失敗させない
      console.error('Failed to send offline order emails:', mailError);
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: createdOrder.id,
        orderNumber,
        total: totals.total,
      },
      email: { customerConfirmed, storeNotified },
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
