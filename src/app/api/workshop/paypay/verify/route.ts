import { NextRequest, NextResponse } from 'next/server';
import { getBookingByNumber, updateBookingPayment } from '@/lib/workshopBookings';
import { getPaymentStatus, isPaypayConfigured } from '@/lib/paypayWebClient';
import { sendMail, STORE_EMAIL } from '@/lib/mailer';
import { checkRateLimit } from '@/lib/simpleRateLimit';

// ワークショップ予約のPayPay決済結果を確認し、支払い状態を確定する。
// PayPayにはWebhookが無いため、戻りページ（/workshop/booking/paypay/return）から
// このAPIを呼ぶ「戻り先ポーリング」方式にする（EC注文の /api/payments/paypay/verify と同じ方針）。
//
// 決済が完了しなかった場合でも予約自体は取り消さない（現地払いと同じ「予約済み・未入金」の状態で残す）。
// お客様が支払わずに離脱した予約は、管理画面の予約一覧から店舗側でキャンセルする運用。

type VerifyStatus = 'paid' | 'pending' | 'failed';

interface VerifyResult {
  httpStatus: number;
  body:
    | { success: true; status: VerifyStatus; bookingNumber: string; total: number | null }
    | { success: false; error: string };
}

async function verifyBookingPayment(bookingNumber: string): Promise<VerifyResult> {
  if (!bookingNumber) {
    return { httpStatus: 400, body: { success: false, error: '予約番号(booking)が指定されていません' } };
  }

  if (!isPaypayConfigured()) {
    return { httpStatus: 503, body: { success: false, error: 'PayPay決済は現在ご利用いただけません' } };
  }

  const booking = await getBookingByNumber(bookingNumber);
  if (!booking) {
    return { httpStatus: 404, body: { success: false, error: '予約が見つかりません' } };
  }

  // 確定済みなら再度PayPayへ問い合わせない（戻りページの再読み込みで二重処理しないため）
  if (booking.paymentStatus === 'paid') {
    return { httpStatus: 200, body: { success: true, status: 'paid', bookingNumber, total: booking.total } };
  }

  if (booking.paymentMethod !== 'paypay') {
    return { httpStatus: 400, body: { success: false, error: 'この予約はPayPay決済ではありません' } };
  }

  let paymentStatus;
  try {
    paymentStatus = await getPaymentStatus(bookingNumber);
  } catch (error) {
    // 問い合わせ自体に失敗した場合は「保留中」として返す。ここで失敗扱いにすると、
    // 実際には決済済みだった場合に二重に支払わせてしまう懸念があるため必ずpending側に倒す。
    console.error(`ワークショップ予約のPayPay決済状況の取得に失敗しました (${bookingNumber}):`, error);
    return { httpStatus: 200, body: { success: true, status: 'pending', bookingNumber, total: booking.total } };
  }

  if (paymentStatus.status === 'COMPLETED') {
    try {
      await updateBookingPayment(booking.id, { paymentStatus: 'paid' });
    } catch (updateError) {
      // 決済は成立しているため、DB更新失敗は要手動確認としてログに残し「支払い済み」を返す
      console.error('🚨 ワークショップ予約: PayPay決済は成立したが支払い状態の更新に失敗しました:', {
        bookingNumber,
        error: updateError,
      });
    }

    if (booking.customerEmail) {
      await sendMail({
        to: booking.customerEmail,
        replyTo: STORE_EMAIL,
        subject: `【MOSS COUNTRY】お支払い完了 (予約番号: ${bookingNumber})`,
        text: [
          `${booking.customerName || 'お客様'} 様`,
          '',
          'ワークショップのお支払いが完了しました。',
          '',
          `予約番号: ${bookingNumber}`,
          `プラン: ${booking.workshopPlanName || 'ワークショップ'}`,
          `日時: ${booking.date} ${booking.startTime}〜${booking.endTime}`,
          `人数: ${booking.partySize}名`,
          `お支払い金額: ¥${(booking.total ?? 0).toLocaleString('ja-JP')}`,
          'お支払い方法: PayPay',
          '',
          '当日のご来店をお待ちしております。',
          '',
          '----',
          'MOSS COUNTRY',
        ].join('\n'),
      });
    }

    return { httpStatus: 200, body: { success: true, status: 'paid', bookingNumber, total: booking.total } };
  }

  if (
    paymentStatus.status === 'FAILED' ||
    paymentStatus.status === 'CANCELED' ||
    paymentStatus.status === 'EXPIRED'
  ) {
    return { httpStatus: 200, body: { success: true, status: 'failed', bookingNumber, total: booking.total } };
  }

  return { httpStatus: 200, body: { success: true, status: 'pending', bookingNumber, total: booking.total } };
}

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function GET(request: NextRequest) {
  if (!checkRateLimit(`workshop-paypay-verify:${clientIp(request)}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json(
      { success: false, error: 'リクエストが多すぎます。しばらくしてから再度お試しください' },
      { status: 429 }
    );
  }

  const bookingNumber = request.nextUrl.searchParams.get('booking') || '';
  const result = await verifyBookingPayment(bookingNumber);
  return NextResponse.json(result.body, { status: result.httpStatus });
}

export async function POST(request: NextRequest) {
  if (!checkRateLimit(`workshop-paypay-verify:${clientIp(request)}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json(
      { success: false, error: 'リクエストが多すぎます。しばらくしてから再度お試しください' },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const bookingNumber =
    typeof body.bookingNumber === 'string'
      ? body.bookingNumber
      : request.nextUrl.searchParams.get('booking') || '';
  const result = await verifyBookingPayment(bookingNumber);
  return NextResponse.json(result.body, { status: result.httpStatus });
}
