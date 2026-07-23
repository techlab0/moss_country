import { NextRequest, NextResponse } from 'next/server';
import { getOrderByNumber, updateOrderStatus } from '@/lib/orders';
import { InventoryService } from '@/lib/inventory';
import { sendMail } from '@/lib/mailer';
import { checkRateLimit } from '@/lib/simpleRateLimit';
import { getPaymentStatus, isPaypayConfigured } from '@/lib/paypayWebClient';

type VerifyStatus = 'paid' | 'pending' | 'failed';

interface VerifySuccessBody {
  success: true;
  status: VerifyStatus;
  orderNumber: string;
  total: number | null;
}

interface VerifyErrorBody {
  success: false;
  error: string;
}

/**
 * PayPayウェブ決済の決済結果を確認し、必要なら注文ステータス・在庫を確定/解放する。
 * PayPayのウェブ決済はSquareのようなWebhookを持たないため、戻りページ（/payment/paypay/return）から
 * このAPIを呼んで結果を反映する「戻り先ポーリング」方式にする。
 *
 * 冪等性: 既に paymentStatus が 'paid'/'failed' に確定済みの注文は、PayPayに問い合わせ直さず
 * 同じ結果をそのまま返す（戻りページの再読み込み・複数回アクセスで二重処理にならないようにする）。
 */
async function verifyPaypayOrder(orderNumber: string): Promise<{ httpStatus: number; body: VerifySuccessBody | VerifyErrorBody }> {
  if (!orderNumber) {
    return { httpStatus: 400, body: { success: false, error: '注文番号(order)が指定されていません' } };
  }

  if (!isPaypayConfigured()) {
    return { httpStatus: 503, body: { success: false, error: 'PayPay決済は現在ご利用いただけません' } };
  }

  const order = await getOrderByNumber(orderNumber);
  if (!order) {
    return { httpStatus: 404, body: { success: false, error: '注文が見つかりません' } };
  }

  if (order.paymentStatus === 'paid') {
    return { httpStatus: 200, body: { success: true, status: 'paid', orderNumber, total: order.total } };
  }
  if (order.paymentStatus === 'failed') {
    return { httpStatus: 200, body: { success: true, status: 'failed', orderNumber, total: order.total } };
  }

  const inventoryItems = order.items.map(item => ({ productId: item.productId, quantity: item.quantity }));

  let paymentStatus;
  try {
    paymentStatus = await getPaymentStatus(orderNumber);
  } catch (error) {
    // PayPay（中継）への問い合わせ自体が失敗した場合は「保留中」として返す。
    // ここで注文を失敗扱いにしてしまうと、実際には決済済みだった場合に二重課金の懸念が生じるため、
    // 判定できない場合は必ずpending側に倒す。
    console.error(`PayPay決済状況の取得に失敗しました (orderNumber: ${orderNumber}):`, error);
    return { httpStatus: 200, body: { success: true, status: 'pending', orderNumber, total: order.total } };
  }

  switch (paymentStatus.status) {
    case 'COMPLETED': {
      // 重要: この時点で決済は既に成立している。DB更新・在庫確定・メール送信のいずれが失敗しても
      // 顧客に「決済失敗」と返してはいけない（実際は課金済みのため）。既存 create-payment の
      // 教訓（決済成立後のDB更新失敗は握りつぶして成功扱い）に倣い、失敗はログに残すのみとする。
      try {
        await updateOrderStatus(order.id, {
          status: 'paid',
          paymentStatus: 'paid',
        });
      } catch (updateError) {
        console.error('🚨 PayPay決済は成立したが注文ステータスの更新に失敗しました。手動確認が必要です:', {
          orderId: order.id,
          orderNumber,
          error: updateError,
        });
      }

      try {
        await InventoryService.confirmCartPurchase(inventoryItems, order.id);
      } catch (inventoryError) {
        console.error('PayPay決済確定後の在庫確定に失敗しました（手動調整が必要）:', inventoryError);
      }

      if (order.customerEmail) {
        try {
          const customerName = [order.customerLastName, order.customerFirstName].filter(Boolean).join(' ');
          await sendMail({
            to: order.customerEmail,
            subject: `【MOSS COUNTRY】ご注文確認 (注文番号: ${order.orderNumber})`,
            text: [
              customerName ? `${customerName} 様` : 'お客様',
              '',
              'この度はMOSS COUNTRYにてご注文いただき、誠にありがとうございます。',
              'PayPayでのお支払いが完了しましたのでご確認ください。',
              '',
              `注文番号: ${order.orderNumber}`,
              `お支払い金額: ¥${(order.total ?? 0).toLocaleString()}`,
              '',
              '----',
              'MOSS COUNTRY',
            ].join('\n'),
          });
        } catch (mailError) {
          console.error(`PayPay注文確認メールの送信に失敗しました (orderNumber: ${orderNumber}):`, mailError);
        }
      }

      return { httpStatus: 200, body: { success: true, status: 'paid', orderNumber, total: order.total } };
    }

    case 'FAILED':
    case 'CANCELED':
    case 'EXPIRED': {
      try {
        await updateOrderStatus(order.id, { status: 'cancelled', paymentStatus: 'failed' });
      } catch (updateError) {
        console.error(`PayPay決済失敗後の注文ステータス更新に失敗しました (orderNumber: ${orderNumber}):`, updateError);
      }
      try {
        await InventoryService.releaseCartItems(inventoryItems, order.id);
      } catch (inventoryError) {
        console.error(`PayPay決済失敗後の在庫解放に失敗しました (orderNumber: ${orderNumber}):`, inventoryError);
      }
      return { httpStatus: 200, body: { success: true, status: 'failed', orderNumber, total: order.total } };
    }

    default:
      // CREATED / AUTHORIZED（顧客がまだPayPayアプリで支払いを完了していない）
      return { httpStatus: 200, body: { success: true, status: 'pending', orderNumber, total: order.total } };
  }
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(`paypay-verify:${ip}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json({ success: false, error: 'リクエストが多すぎます。しばらくしてから再度お試しください' }, { status: 429 });
  }

  const orderNumber = request.nextUrl.searchParams.get('order') || '';
  try {
    const { httpStatus, body } = await verifyPaypayOrder(orderNumber);
    return NextResponse.json(body, { status: httpStatus });
  } catch (error) {
    console.error('Error verifying PayPay payment:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(`paypay-verify:${ip}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json({ success: false, error: 'リクエストが多すぎます。しばらくしてから再度お試しください' }, { status: 429 });
  }

  try {
    const requestBody = await request.json().catch(() => ({}));
    const orderNumber = typeof (requestBody as { orderNumber?: unknown })?.orderNumber === 'string'
      ? (requestBody as { orderNumber: string }).orderNumber
      : '';
    const { httpStatus, body } = await verifyPaypayOrder(orderNumber);
    return NextResponse.json(body, { status: httpStatus });
  } catch (error) {
    console.error('Error verifying PayPay payment:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
