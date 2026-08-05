import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import {
  listBookings,
  reserveBookingSlot,
  updateBookingGoogleEvent,
  WorkshopSlotCapacityError,
  type WorkshopBookingStatus,
  type WorkshopBookingPaymentMethod,
} from '@/lib/workshopBookings';
import { createBookingEvent } from '@/lib/googleCalendar';
import { buildWorkshopBookingNumber, buildGoogleBookingEventId } from '@/lib/workshopBookingSafety';
import { WORKSHOP_SLOTS, CAPACITY_PER_SLOT, jstDateTimeToIso } from '@/lib/workshopBookingConfig';
import { computeAvailableSlots } from '@/lib/workshopAvailability';
import { randomUUID } from 'crypto';

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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// 手動登録で使える支払い方法。カード・PayPayはオンライン決済用でこちらからは登録しない。
const MANUAL_PAYMENT_METHODS: WorkshopBookingPaymentMethod[] = ['external', 'on_site'];

/**
 * 管理画面からの予約手動登録。じゃらん等の外部予約や電話・来店での予約を、
 * オンライン予約と同じ枠に載せてダブルブッキングを防ぐために使う。
 *
 * 定員の判定はDBトリガー（reserveBookingSlot）が最終保証する。ここでの事前チェックは
 * 分かりやすいエラーを返すためのもの。
 *
 * 売上の扱い:
 *  - external（じゃらん等で決済済み）: paymentStatus を paid にし、日別売上に計上する
 *  - on_site（当日店頭で精算）: pending のままにし、レジ会計側で計上する（二重計上を防ぐ）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const date = typeof body.date === 'string' ? body.date : '';
    const startTime = typeof body.startTime === 'string' ? body.startTime : '';
    const partySize = Number(body.partySize);
    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
    const customerPhone = typeof body.customerPhone === 'string' ? body.customerPhone.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const planName = typeof body.planName === 'string' ? body.planName.trim() : '';
    const total = body.total === undefined || body.total === null || body.total === '' ? null : Number(body.total);
    const paymentMethod = MANUAL_PAYMENT_METHODS.includes(body.paymentMethod)
      ? (body.paymentMethod as WorkshopBookingPaymentMethod)
      : 'external';

    if (!DATE_RE.test(date)) {
      return NextResponse.json({ error: '日付の形式が不正です（YYYY-MM-DD）' }, { status: 400 });
    }
    const slot = WORKSHOP_SLOTS.find(s => s.start === startTime);
    if (!slot) {
      return NextResponse.json({ error: '受付枠の開始時刻が不正です' }, { status: 400 });
    }
    if (!Number.isInteger(partySize) || partySize < 1 || partySize > CAPACITY_PER_SLOT) {
      return NextResponse.json({ error: `人数は1〜${CAPACITY_PER_SLOT}名で指定してください` }, { status: 400 });
    }
    if (!customerName) {
      return NextResponse.json({ error: 'お名前は必須です' }, { status: 400 });
    }
    if (total !== null && (!Number.isFinite(total) || total < 0)) {
      return NextResponse.json({ error: '金額が不正です' }, { status: 400 });
    }

    // 空き人数の事前チェック（受付停止中の枠でも管理者は登録できるようにするため、
    // 枠のON/OFFではなく残り人数だけを見る）
    const available = await computeAvailableSlots(date, date).catch(() => null);
    if (available) {
      const target = available.find(s => s.date === date && s.startTime === startTime);
      const remaining = target?.remaining ?? 0;
      if (remaining < partySize) {
        return NextResponse.json(
          { error: `この枠の残りは${remaining}名です（${partySize}名は登録できません）` },
          { status: 409 }
        );
      }
    }

    const idempotencyKey = randomUUID();
    const bookingNumber = buildWorkshopBookingNumber(idempotencyKey);

    let reservation;
    try {
      reservation = await reserveBookingSlot({
        bookingNumber,
        workshopPlanName: planName || '手動登録',
        date,
        startTime,
        endTime: slot.end,
        partySize,
        customerName,
        customerPhone: customerPhone || null,
        paymentMethod,
        // 外部サイトで決済済みのものだけ支払い済みにする（レジを通らないため売上に計上される）
        paymentStatus: paymentMethod === 'external' ? 'paid' : 'pending',
        total,
        notes: notes || null,
        idempotencyKey,
      });
    } catch (error) {
      if (error instanceof WorkshopSlotCapacityError) {
        return NextResponse.json({ error: 'この枠は指定人数分の空きがありません' }, { status: 409 });
      }
      throw error;
    }

    // Googleカレンダーにも入れて、店舗側の予定と突き合わせられるようにする。
    // 失敗しても予約自体は成立させる（カレンダーは後から手動で追加できる）。
    try {
      const event = await createBookingEvent({
        eventId: buildGoogleBookingEventId(idempotencyKey),
        idempotencyKey,
        summary: `WS予約(手動): ${customerName} / ${partySize}名`,
        description: [
          `予約番号: ${bookingNumber}`,
          `人数: ${partySize}名`,
          `氏名: ${customerName}`,
          customerPhone ? `電話: ${customerPhone}` : null,
          `支払い方法: ${paymentMethod === 'external' ? '外部予約（決済済み）' : '現地払い'}`,
          notes ? `備考: ${notes}` : null,
        ].filter(Boolean).join('\n'),
        startISO: jstDateTimeToIso(date, slot.start),
        endISO: jstDateTimeToIso(date, slot.end),
      });
      await updateBookingGoogleEvent(reservation.booking.id, event.eventId);
    } catch (calendarError) {
      console.error('手動予約: Googleカレンダーへの登録に失敗しました（予約は登録済み）:', {
        bookingNumber,
        error: calendarError,
      });
    }

    return NextResponse.json({ booking: reservation.booking });
  } catch (error) {
    console.error('ワークショップ予約の手動登録エラー:', error);
    const message = error instanceof Error ? error.message : '予約の登録に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
