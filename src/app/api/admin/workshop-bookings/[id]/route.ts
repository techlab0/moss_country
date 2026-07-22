import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { getBookingById, cancelBooking } from '@/lib/workshopBookings';
import { deleteBookingEvent } from '@/lib/googleCalendar';

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
    const booking = await getBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: '予約が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('ワークショップ予約詳細取得エラー:', error);
    return NextResponse.json({ error: '予約詳細の取得に失敗しました' }, { status: 500 });
  }
}

/**
 * 予約のキャンセル。現時点で対応しているのはキャンセルのみ
 * （日時変更・人数変更等は今回のスコープ外。変更したい場合はキャンセル→再予約とする）。
 * Googleカレンダー側のイベントも削除し、ダブルブッキング防止のため必ず両方を実施する。
 */
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
    const booking = await getBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: '予約が見つかりません' }, { status: 404 });
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'この予約は既にキャンセル済みです' }, { status: 400 });
    }

    // TODO(返金): credit_cardで決済済み(paymentStatus === 'paid')の予約をキャンセルする場合、
    // 現時点ではSquareへの返金は自動実行しない（スコープ外）。
    // 既存の src/lib/square.ts の refundPayment（src/app/api/admin/orders/[id]/refund/route.ts参照）を
    // 流用して、squarePaymentIdに対する返金APIを別途呼び出す運用フローを想定する。
    const needsManualRefund = booking.paymentMethod === 'credit_card' && booking.paymentStatus === 'paid';

    if (booking.googleEventId) {
      await deleteBookingEvent(booking.googleEventId);
    }

    await cancelBooking(id, { googleEventId: null });
    const updated = await getBookingById(id);

    return NextResponse.json({
      success: true,
      booking: updated,
      needsManualRefund,
    });
  } catch (error) {
    console.error('ワークショップ予約キャンセルエラー:', error);
    return NextResponse.json({ error: '予約のキャンセルに失敗しました' }, { status: 500 });
  }
}
