import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { listBookings, type WorkshopBookingStatus } from '@/lib/workshopBookings';

const VALID_STATUSES: WorkshopBookingStatus[] = ['confirmed', 'cancelled'];

// 管理画面用の予約一覧取得。認証必須。
export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const dateParam = searchParams.get('date') || undefined;
    const limitParam = searchParams.get('limit');

    if (statusParam && !VALID_STATUSES.includes(statusParam as WorkshopBookingStatus)) {
      return NextResponse.json({ error: 'statusが不正です' }, { status: 400 });
    }

    const bookings = await listBookings({
      status: statusParam as WorkshopBookingStatus | undefined,
      date: dateParam,
      limit: limitParam ? Number(limitParam) : undefined,
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('ワークショップ予約一覧取得エラー:', error);
    return NextResponse.json({ error: '予約一覧の取得に失敗しました' }, { status: 500 });
  }
}
