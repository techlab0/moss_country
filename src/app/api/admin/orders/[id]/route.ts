import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { InventoryService } from '@/lib/inventory';
import { getOrderById, updateOrderStatus, deleteOrder, type Order, type OrderItemSnapshot } from '@/lib/orders';

const FINAL_STATUSES = ['cancelled', 'refunded'];

/**
 * 注文をキャンセル/削除する際の在庫の扱い。
 * 決済確定済み（paymentStatus === 'paid'、在庫は既に実在庫から減算済み）なら実在庫を復元し、
 * それ以外（決済前で在庫は「予約」段階）なら予約を解放するだけにする。
 */
async function restoreInventoryForCancelledOrder(
  order: { paymentStatus?: string; items?: OrderItemSnapshot[] },
  orderId: string
) {
  const items = (order.items || []).map(item => ({
    productId: item.productId,
    quantity: item.quantity,
  }));

  if (items.length === 0) return;

  if (order.paymentStatus === 'paid') {
    await InventoryService.restoreCartItems(items, orderId);
  } else {
    await InventoryService.releaseCartItems(items, orderId);
  }
}

function toApiOrder(order: Order) {
  return {
    _id: order.id,
    orderNumber: order.orderNumber,
    squareOrderId: order.squareOrderId,
    squarePaymentId: order.squarePaymentId,
    customer: {
      email: order.customerEmail,
      firstName: order.customerFirstName,
      lastName: order.customerLastName,
      phone: order.customerPhone,
    },
    items: order.items.map(item => ({
      product: { _id: item.productId, name: item.name },
      quantity: item.quantity,
      price: item.price,
      variant: item.variant,
    })),
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    tax: order.tax,
    total: order.total,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    shippingAddress: order.shippingAddress,
    shippingCarrier: order.shippingCarrier,
    trackingNumber: order.trackingNumber,
    notes: order.notes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
      return NextResponse.json({ error: '注文が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ order: toApiOrder(order) });
  } catch (error) {
    console.error('注文詳細取得エラー:', error);
    return NextResponse.json(
      { error: '注文詳細の取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const current = await getOrderById(id);

    if (!current) {
      return NextResponse.json({ error: '注文が見つかりません' }, { status: 404 });
    }

    const patchFields: Parameters<typeof updateOrderStatus>[1] = {};
    if (typeof body.status === 'string') patchFields.status = body.status;
    if (typeof body.paymentStatus === 'string') patchFields.paymentStatus = body.paymentStatus;
    if (typeof body.trackingNumber === 'string') patchFields.trackingNumber = body.trackingNumber;
    if (typeof body.notes === 'string') patchFields.notes = body.notes;

    // ステータスが新たに「キャンセル」「返金」へ変わる場合のみ在庫を戻す（二重処理防止）
    if (
      typeof body.status === 'string' &&
      body.status !== current.status &&
      FINAL_STATUSES.includes(body.status) &&
      !FINAL_STATUSES.includes(current.status)
    ) {
      await restoreInventoryForCancelledOrder(current, id);
    }

    await updateOrderStatus(id, patchFields);
    const updated = await getOrderById(id);

    return NextResponse.json({ order: updated ? toApiOrder(updated) : null });
  } catch (error) {
    console.error('注文更新エラー:', error);
    return NextResponse.json(
      { error: '注文の更新に失敗しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;

    const current = await getOrderById(id);

    if (!current) {
      return NextResponse.json({ error: '注文が見つかりません' }, { status: 404 });
    }

    if (!FINAL_STATUSES.includes(current.status)) {
      await restoreInventoryForCancelledOrder(current, id);
    }

    await deleteOrder(id);

    return NextResponse.json({ message: '注文を削除しました' });
  } catch (error) {
    console.error('注文削除エラー:', error);
    return NextResponse.json(
      { error: '注文の削除に失敗しました' },
      { status: 500 }
    );
  }
}
