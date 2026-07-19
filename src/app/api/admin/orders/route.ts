import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { getOrders } from '@/lib/orders';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const orders = (await getOrders()).map(order => ({
      _id: order.id,
      orderNumber: order.orderNumber,
      customer: {
        email: order.customerEmail,
        firstName: order.customerFirstName,
        lastName: order.customerLastName,
      },
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      itemCount: order.items.length,
    }));

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('注文一覧取得エラー:', error);
    return NextResponse.json(
      { error: '注文一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
