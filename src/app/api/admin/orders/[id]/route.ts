import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { InventoryService } from '@/lib/inventory';

interface OrderInventoryItem {
  product: { _ref: string };
  quantity: number;
}

const FINAL_STATUSES = ['cancelled', 'refunded'];

/**
 * 注文をキャンセル/削除する際の在庫の扱い。
 * 決済確定済み（paymentStatus === 'paid'、在庫は既に実在庫から減算済み）なら実在庫を復元し、
 * それ以外（決済前で在庫は「予約」段階）なら予約を解放するだけにする。
 */
async function restoreInventoryForCancelledOrder(
  order: { paymentStatus?: string; items?: OrderInventoryItem[] },
  orderId: string
) {
  const items = (order.items || []).map(item => ({
    productId: item.product._ref,
    quantity: item.quantity,
  }));

  if (items.length === 0) return;

  if (order.paymentStatus === 'paid') {
    await InventoryService.restoreCartItems(items, orderId);
  } else {
    await InventoryService.releaseCartItems(items, orderId);
  }
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
    const order = await writeClient.fetch(
      `*[_id == $id][0] {
        _id,
        orderNumber,
        squareOrderId,
        squarePaymentId,
        customer,
        items[] {
          product-> { _id, name },
          quantity,
          price,
          variant
        },
        subtotal,
        shippingCost,
        tax,
        total,
        status,
        paymentStatus,
        paymentMethod,
        shippingAddress,
        billingAddress,
        shippingMethod,
        trackingNumber,
        notes,
        createdAt,
        updatedAt
      }`,
      { id }
    );

    if (!order) {
      return NextResponse.json({ error: '注文が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ order });
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

    const current = await writeClient.fetch(
      `*[_id == $id][0] { status, paymentStatus, items[] { product { _ref }, quantity } }`,
      { id }
    );

    if (!current) {
      return NextResponse.json({ error: '注文が見つかりません' }, { status: 404 });
    }

    const patchFields: Record<string, unknown> = { updatedAt: new Date().toISOString() };
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

    const updated = await writeClient.patch(id).set(patchFields).commit();

    return NextResponse.json({ order: updated });
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

    const current = await writeClient.fetch(
      `*[_id == $id][0] { status, paymentStatus, items[] { product { _ref }, quantity } }`,
      { id }
    );

    if (!current) {
      return NextResponse.json({ error: '注文が見つかりません' }, { status: 404 });
    }

    if (!FINAL_STATUSES.includes(current.status)) {
      await restoreInventoryForCancelledOrder(current, id);
    }

    await writeClient.delete(id);

    return NextResponse.json({ message: '注文を削除しました' });
  } catch (error) {
    console.error('注文削除エラー:', error);
    return NextResponse.json(
      { error: '注文の削除に失敗しました' },
      { status: 500 }
    );
  }
}
