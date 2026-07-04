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
      *[_type == "order"] | order(createdAt desc) {
        _id,
        orderNumber,
        customer,
        total,
        status,
        paymentStatus,
        paymentMethod,
        createdAt,
        "itemCount": count(items)
      }
    `);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('注文一覧取得エラー:', error);
    return NextResponse.json(
      { error: '注文一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
