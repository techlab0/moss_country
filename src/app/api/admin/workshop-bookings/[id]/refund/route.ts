import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyAdminSession } from '@/lib/auth';
import { getBookingById, cancelBooking, updateBookingPayment } from '@/lib/workshopBookings';
import { deleteBookingEvent } from '@/lib/googleCalendar';
import { refundPayment as refundSquarePayment } from '@/lib/square';
import { getPaymentStatus as getPaypayPaymentStatus, refundPayment as refundPaypayPayment } from '@/lib/paypayWebClient';
import { sendMail, STORE_EMAIL } from '@/lib/mailer';

// ワークショップ予約の返金。オンラインで事前決済された予約（Squareカード / PayPay）に対して
// 返金し、あわせて予約をキャンセルする（枠とGoogleカレンダーのイベントも解放する）。
//
// 金額を指定すると一部返金になる（キャンセルポリシーに沿ってキャンセル料を差し引く場合）。
// 省略すると残額全額。一部返金でも参加はされないため、予約は必ずキャンセルする。
//
// 返金を伴わない単なるキャンセルは PATCH /api/admin/workshop-bookings/[id] が担当する。
// 現地払い（on_site）は店頭での現金授受のため、このAPIの対象外。
export async function POST(
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

    if (booking.paymentStatus !== 'paid' && booking.paymentStatus !== 'refunded') {
      return NextResponse.json(
        { error: '支払い済みの予約のみ返金できます。未入金の予約はキャンセルしてください' },
        { status: 400 }
      );
    }

    if (!booking.total || booking.total <= 0) {
      return NextResponse.json({ error: '返金額が不正です' }, { status: 400 });
    }

    // 返金可能な残額。キャンセル料を差し引いた一部返金にも対応する。
    const alreadyRefunded = booking.refundedAmount || 0;
    const refundableAmount = booking.total - alreadyRefunded;
    if (refundableAmount <= 0) {
      return NextResponse.json({ error: 'この予約は既に全額返金済みです' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const requestedAmount = body?.amount === undefined || body?.amount === null || body?.amount === ''
      ? refundableAmount
      : Number(body.amount);

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return NextResponse.json({ error: '返金額は1円以上で指定してください' }, { status: 400 });
    }
    const refundAmount = Math.round(requestedAmount);
    if (refundAmount > refundableAmount) {
      return NextResponse.json(
        { error: `返金可能な残額は¥${refundableAmount.toLocaleString()}です` },
        { status: 400 }
      );
    }
    const isFullRefund = alreadyRefunded + refundAmount >= booking.total;

    let refundId: string;

    if (booking.paymentMethod === 'paypay') {
      // 返金にはPayPay側の paymentId（merchantPaymentId＝予約番号とは別物）が必要なため都度取得する
      const paypayStatus = await getPaypayPaymentStatus(booking.bookingNumber);
      if (paypayStatus.status !== 'COMPLETED' || !paypayStatus.paymentId) {
        return NextResponse.json(
          { error: `PayPay側の決済が完了状態ではないため返金できません（現在: ${paypayStatus.status}）` },
          { status: 400 }
        );
      }

      const refund = await refundPaypayPayment({
        merchantRefundId: uuidv4(),
        paymentId: paypayStatus.paymentId,
        amountJpy: refundAmount,
      });
      refundId = refund.refundId;
    } else if (booking.paymentMethod === 'credit_card') {
      if (!booking.squarePaymentId) {
        return NextResponse.json(
          { error: '決済IDが記録されていないため返金できません。Squareダッシュボードから返金してください' },
          { status: 400 }
        );
      }
      const refund = await refundSquarePayment(booking.squarePaymentId, refundAmount, uuidv4());
      refundId = refund.id;
    } else {
      return NextResponse.json(
        { error: '現地払いの予約はオンライン返金の対象外です。店頭で対応してください' },
        { status: 400 }
      );
    }

    // ---- ここから先は返金が既に成立している。失敗しても成功レスポンスを返す ----
    try {
      await updateBookingPayment(id, {
        // 一部返金でも予約はキャンセルするため、支払い状態は返金済みとして扱い、
        // 実際にいくら返したかは refundedAmount で持つ
        paymentStatus: 'refunded',
        refundId,
        refundedAmount: alreadyRefunded + refundAmount,
      });
    } catch (updateError) {
      // refund_id カラム未追加（マイグレーション未実行）でもここに来る。返金自体は成立しているため
      // ログに残して継続し、支払い状態だけでも更新を試みる。
      console.error('🚨 ワークショップ予約: 返金は成立したが決済状態の更新に失敗しました:', {
        bookingId: id,
        bookingNumber: booking.bookingNumber,
        refundId,
        error: updateError,
      });
      try {
        await updateBookingPayment(id, { paymentStatus: 'refunded' });
      } catch (retryError) {
        console.error('ワークショップ予約: 支払い状態のみの更新にも失敗しました:', retryError);
      }
    }

    // 返金した予約は開催しないため、枠とカレンダーイベントを解放する
    if (booking.status !== 'cancelled') {
      try {
        if (booking.googleEventId) {
          await deleteBookingEvent(booking.googleEventId);
        }
        await cancelBooking(id, { googleEventId: null });
      } catch (cancelError) {
        console.error('🚨 ワークショップ予約: 返金は成立したがキャンセル処理に失敗しました（手動確認が必要）:', {
          bookingId: id,
          bookingNumber: booking.bookingNumber,
          error: cancelError,
        });
      }
    }

    if (booking.customerEmail) {
      await sendMail({
        to: booking.customerEmail,
        replyTo: STORE_EMAIL,
        // 店舗にも控えを送る（お客様に届かない事態を店舗側で検知できるようにするため）
        bcc: STORE_EMAIL,
        subject: `【MOSS COUNTRY】ご予約のキャンセルと返金のお知らせ (予約番号: ${booking.bookingNumber})`,
        text: [
          `${booking.customerName || 'お客様'} 様`,
          '',
          isFullRefund
            ? 'ご予約をキャンセルし、お支払いいただいた全額を返金いたしました。'
            : 'ご予約をキャンセルし、下記の金額を返金いたしました。',
          '',
          `予約番号: ${booking.bookingNumber}`,
          `プラン: ${booking.workshopPlanName || 'ワークショップ'}`,
          `日時: ${booking.date} ${booking.startTime}〜${booking.endTime}`,
          `返金金額: ¥${refundAmount.toLocaleString()}`,
          ...(isFullRefund
            ? []
            : [
                `お支払い金額: ¥${booking.total.toLocaleString('ja-JP')}`,
                'キャンセルポリシーに基づき、キャンセル料を差し引いた金額を返金しております。',
              ]),
          `返金方法: ${booking.paymentMethod === 'paypay' ? 'PayPay' : 'クレジットカード'}`,
          '',
          '返金の反映までにはお支払い方法により数日かかる場合があります。',
          '',
          '----',
          'MOSS COUNTRY',
        ].join('\n'),
      });
    }

    const updated = await getBookingById(id);

    return NextResponse.json({
      success: true,
      booking: updated,
      refundId,
      amount: refundAmount,
      refundedAmount: alreadyRefunded + refundAmount,
      isFullRefund,
    });
  } catch (error) {
    console.error('ワークショップ予約の返金エラー:', error);
    const message = error instanceof Error ? error.message : '返金処理に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
