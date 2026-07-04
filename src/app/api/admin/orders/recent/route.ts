import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const orders = await writeClient.fetch(`
      *[_type == "order"] | order(createdAt desc) [0...5] {
        _id,
        orderNumber,
        "customerName": customer.firstName + " " + customer.lastName,
        total,
        status,
        createdAt
      }
    `);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Recent orders fetch error:', error);
    return NextResponse.json(
      { error: '最近の注文の取得に失敗しました' },
      { status: 500 }
    );
  }
}
