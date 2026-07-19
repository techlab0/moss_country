import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { getRecentOrders } from '@/lib/orders';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const orders = (await getRecentOrders(5)).map(order => ({
      _id: order.id,
      orderNumber: order.orderNumber,
      customerName: `${order.customerFirstName || ''} ${order.customerLastName || ''}`.trim(),
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
    }));

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Recent orders fetch error:', error);
    return NextResponse.json(
      { error: '最近の注文の取得に失敗しました' },
      { status: 500 }
    );
  }
}
