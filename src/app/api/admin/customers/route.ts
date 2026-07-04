import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { writeClient } from '@/lib/sanity';

interface OrderForCustomerAggregation {
  customer?: { email?: string; firstName?: string; lastName?: string; phone?: string };
  total?: number;
  paymentStatus?: string;
  createdAt?: string;
  shippingAddress?: { state?: string; city?: string };
}

// 顧客は独立したデータベースを持たず、全注文をメールアドレスで集計して算出する
// （GROQはgroup-by集計ができないため、既存のdashboard/statsと同じ「全件取得→JSでreduce」方式）
export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const orders: OrderForCustomerAggregation[] = await writeClient.fetch(
      `*[_type == "order"]{ customer, total, paymentStatus, createdAt, shippingAddress }`
    );

    const byEmail = new Map<string, {
      id: string;
      name: string;
      email: string;
      phone?: string;
      address?: string;
      totalOrders: number;
      totalSpent: number;
      lastOrderDate?: string;
      createdAt?: string;
    }>();

    for (const order of orders) {
      const email = order.customer?.email;
      if (!email) continue;

      const existing = byEmail.get(email);
      const orderDate = order.createdAt;
      const name = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || '不明';
      const address = order.shippingAddress
        ? `${order.shippingAddress.state || ''}${order.shippingAddress.city || ''}`
        : undefined;

      if (!existing) {
        byEmail.set(email, {
          id: email,
          name,
          email,
          phone: order.customer?.phone,
          address,
          totalOrders: 1,
          totalSpent: order.paymentStatus === 'paid' ? (order.total || 0) : 0,
          lastOrderDate: orderDate,
          createdAt: orderDate,
        });
      } else {
        existing.totalOrders += 1;
        if (order.paymentStatus === 'paid') {
          existing.totalSpent += order.total || 0;
        }
        if (orderDate && (!existing.lastOrderDate || orderDate > existing.lastOrderDate)) {
          existing.lastOrderDate = orderDate;
          existing.name = name;
          existing.phone = order.customer?.phone || existing.phone;
          existing.address = address || existing.address;
        }
        if (orderDate && (!existing.createdAt || orderDate < existing.createdAt)) {
          existing.createdAt = orderDate;
        }
      }
    }

    const customers = Array.from(byEmail.values()).sort((a, b) =>
      (b.lastOrderDate || '').localeCompare(a.lastOrderDate || '')
    );

    return NextResponse.json({
      success: true,
      customers
    });

  } catch (error) {
    console.error('Customer fetch error:', error);
    return NextResponse.json(
      { error: '顧客データの取得に失敗しました' },
      { status: 500 }
    );
  }
}