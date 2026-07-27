import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/simpleRateLimit';
import { consumeDistributedRateLimit } from '@/lib/distributedRateLimit';
import { getSimpleWorkshopById } from '@/lib/sanity';
import { convertToSquareAmount, SQUARE_CONFIG } from '@/lib/square';
import { createBookingEvent, deleteBookingEvent } from '@/lib/googleCalendar';
import { isSlotStillAvailable, CalendarUnavailableError } from '@/lib/workshopAvailability';
import {
  reserveBookingSlot,
  deleteBooking,
  cancelBooking,
  updateBookingGoogleEvent,
  updateBookingPayment,
  WorkshopSlotCapacityError,
  type WorkshopBooking,
  type WorkshopBookingPaymentMethod,
} from '@/lib/workshopBookings';
import { sendMail, STORE_EMAIL } from '@/lib/mailer';
import { assertPurchaseAllowed } from '@/lib/purchaseLock';
import {
  WORKSHOP_SLOTS,
  CAPACITY_PER_SLOT,
  jstDateTimeToIso,
  todayJstDateStr,
  maxBookableDateStr,
} from '@/lib/workshopBookingConfig';
import {
  buildGoogleBookingEventId,
  buildSquareIdempotencyKey,
  buildWorkshopBookingNumber,
  isValidWorkshopIdempotencyKey,
  validateWorkshopCustomerInput,
} from '@/lib/workshopBookingSafety';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PAYMENT_METHODS: WorkshopBookingPaymentMethod[] = ['credit_card', 'on_site', 'paypay'];

interface BookRequestBody {
  planId?: string;
  date?: string;
  startTime?: string;
  partySize?: number;
  customer?: { name?: string; email?: string; phone?: string };
  paymentMethod?: string;
  notes?: string;
  paymentToken?: { token?: string };
  idempotencyKey?: string;
}

/**
 * Square Payments APIでその場カード決済を行う。
 * src/app/api/payments/create-payment/route.ts の processSquarePayment と同じ方式
 * （source_idトークン, autocomplete: true）だが、注文とは別のドメイン（予約）のため
 * ここに専用実装として持つ（既存の決済・注文ロジックには一切手を入れない）。
 */
async function chargeSquareCard({
  token,
  amount,
  referenceId,
  customerEmail,
  idempotencyKey,
}: {
  token: string;
  amount: number;
  referenceId: string;
  customerEmail?: string | null;
  idempotencyKey: string;
}): Promise<{ success: boolean; paymentId?: string; error?: string; indeterminate?: boolean }> {
  try {
    if (!token || typeof token !== 'string' || token.length < 10) {
      return { success: false, error: 'Invalid payment token format' };
    }
    if (!SQUARE_CONFIG.locationId) {
      return { success: false, error: 'Square location ID not configured' };
    }
    if (amount <= 0) {
      return { success: false, error: 'Invalid payment amount' };
    }

    const requestBody = {
      source_id: token,
      idempotency_key: buildSquareIdempotencyKey(idempotencyKey),
      amount_money: {
        amount: convertToSquareAmount(amount),
        currency: SQUARE_CONFIG.currency,
      },
      autocomplete: true,
      location_id: SQUARE_CONFIG.locationId,
      reference_id: referenceId,
      note: `MOSS COUNTRY ワークショップ予約: ${referenceId}`,
      buyer_email_address: customerEmail || undefined,
    };

    const response = await fetch(`${SQUARE_CONFIG.apiBaseUrl}/v2/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-06-04',
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('🚨 ワークショップ予約のSquare決済に失敗しました:', { status: response.status, result });
      const firstError = result.errors?.[0];
      const errorMessage = firstError?.detail || firstError?.code || `HTTP ${response.status}: Payment processing failed`;
      return {
        success: false,
        error: errorMessage,
        indeterminate: response.status >= 500 || firstError?.code === 'TEMPORARY_ERROR',
      };
    }

    return { success: true, paymentId: result.payment?.id };
  } catch (error) {
    console.error('ワークショップ予約のSquare決済処理中にエラーが発生しました:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown payment error',
      indeterminate: true,
    };
  }
}

/**
 * CreatePaymentの応答を受け取れず成否不明になった場合、Square公式の
 * CancelPaymentByIdempotencyKeyで未確定・承認済み決済を取り消してから再試行可能にする。
 */
async function cancelSquarePaymentByIdempotencyKey(idempotencyKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${SQUARE_CONFIG.apiBaseUrl}/v2/payments/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-06-04',
      },
      body: JSON.stringify({
        idempotency_key: buildSquareIdempotencyKey(idempotencyKey),
      }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      console.error('Square決済の成否不明状態を解消できませんでした:', {
        status: response.status,
        errors: result?.errors?.map((item: { code?: string }) => item.code),
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error('Square決済の成否不明状態を解消中に通信エラーが発生しました:', error);
    return false;
  }
}

function buildConfirmationEmailBody(params: {
  bookingNumber: string;
  planName: string;
  date: string;
  startTime: string;
  endTime: string;
  partySize: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  customerName: string;
}): string {
  const paymentLabel =
    params.paymentMethod === 'credit_card'
      ? params.paymentStatus === 'paid'
        ? 'クレジットカード（決済完了）'
        : 'クレジットカード（決済処理中）'
      : '現地精算（当日店舗にてお支払いください）';

  return [
    `${params.customerName} 様`,
    '',
    'MOSS COUNTRY ワークショップのご予約を承りました。',
    '',
    `予約番号: ${params.bookingNumber}`,
    `プラン: ${params.planName}`,
    `日時: ${params.date} ${params.startTime}〜${params.endTime}`,
    `人数: ${params.partySize}名`,
    `金額: ¥${params.total.toLocaleString('ja-JP')}`,
    `お支払い方法: ${paymentLabel}`,
    '',
    'ご不明な点がございましたら本メールへ返信にてお問い合わせください。',
    '',
    'MOSS COUNTRY',
  ].join('\n');
}

function bookingMatchesRequest(
  booking: WorkshopBooking,
  input: {
    planId: string;
    date: string;
    startTime: string;
    partySize: number;
    customerEmail: string;
    paymentMethod: WorkshopBookingPaymentMethod;
    total: number;
  }
): boolean {
  return (
    booking.workshopPlanId === input.planId &&
    booking.date === input.date &&
    booking.startTime === input.startTime &&
    booking.partySize === input.partySize &&
    booking.customerEmail === input.customerEmail &&
    booking.paymentMethod === input.paymentMethod &&
    booking.total === input.total
  );
}

function successPayload(booking: WorkshopBooking, paymentStatus = booking.paymentStatus) {
  return {
    success: true,
    bookingNumber: booking.bookingNumber,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    partySize: booking.partySize,
    total: booking.total,
    paymentMethod: booking.paymentMethod,
    paymentStatus,
  };
}

async function rollbackReservation(bookingId: string, googleEventId: string | null): Promise<void> {
  let calendarRemoved = !googleEventId;
  if (googleEventId) {
    try {
      await deleteBookingEvent(googleEventId);
      calendarRemoved = true;
    } catch (error) {
      // Google側のIDを失わないよう、DB行は削除せずcancelledで保持して管理者が再試行できるようにする。
      console.error('予約ロールバック時にGoogleイベントを削除できませんでした:', {
        bookingId,
        googleEventId,
        error,
      });
    }
  }

  if (calendarRemoved) {
    await deleteBooking(bookingId);
  } else {
    await cancelBooking(bookingId);
  }
}

// 公開API（予約作成）。認証不要。
export async function POST(request: NextRequest) {
  try {
    // 公開エンドポイントのため、スパム予約（Googleカレンダーを埋める・現地払いはトークン不要）を
    // 防ぐレート制限をかける
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(`workshop-book:${ip}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'リクエストが多すぎます。しばらくしてから再度お試しください' },
        { status: 429 }
      );
    }
    try {
      const allowed = await consumeDistributedRateLimit(`workshop-book:${ip}`, 5, 10 * 60);
      if (!allowed) {
        return NextResponse.json(
          { error: 'リクエストが多すぎます。しばらくしてから再度お試しください' },
          { status: 429 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: '予約受付の安全確認に接続できません。しばらくしてから再度お試しください。' },
        { status: 503 }
      );
    }

    // 購入ロック中は予約（決済含む）を確定させない（閲覧は制限しない管理者トグル）
    const purchaseLock = await assertPurchaseAllowed();
    if (purchaseLock.locked) {
      return NextResponse.json({ error: purchaseLock.message }, { status: 403 });
    }

    const body = (await request.json()) as BookRequestBody;

    const planId = body.planId;
    const date = body.date;
    const startTime = body.startTime;
    // partySize はJSONのnumberで送られる想定だが、フォーム経由の文字列送信にも耐えるよう軽く正規化する
    const partySize =
      typeof body.partySize === 'number' ? body.partySize : Number(body.partySize);
    const customerName = body.customer?.name?.trim();
    const customerEmail = body.customer?.email?.trim();
    const customerPhone = body.customer?.phone?.trim();
    const paymentMethod = body.paymentMethod as WorkshopBookingPaymentMethod | undefined;
    const notes = body.notes?.trim();
    const idempotencyKey = body.idempotencyKey;

    // ---- 入力バリデーション ----
    if (!planId || typeof planId !== 'string') {
      return NextResponse.json({ error: 'planIdは必須です' }, { status: 400 });
    }
    if (!date || !DATE_RE.test(date)) {
      return NextResponse.json({ error: 'dateの形式が不正です（YYYY-MM-DD）' }, { status: 400 });
    }
    const matchedSlot = WORKSHOP_SLOTS.find(s => s.start === startTime);
    if (!startTime || !matchedSlot) {
      return NextResponse.json({ error: '指定された開始時刻は受け付けていません' }, { status: 400 });
    }
    if (!Number.isInteger(partySize) || (partySize as number) <= 0) {
      return NextResponse.json({ error: 'partySizeは1以上の整数で指定してください' }, { status: 400 });
    }
    if ((partySize as number) > CAPACITY_PER_SLOT) {
      return NextResponse.json({ error: `1回のご予約は最大${CAPACITY_PER_SLOT}名までです` }, { status: 400 });
    }
    if (!customerName || !customerEmail) {
      return NextResponse.json({ error: '氏名・メールアドレスは必須です' }, { status: 400 });
    }
    const customerInputError = validateWorkshopCustomerInput({
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      notes,
    });
    if (customerInputError) {
      return NextResponse.json({ error: customerInputError }, { status: 400 });
    }
    if (!isValidWorkshopIdempotencyKey(idempotencyKey)) {
      return NextResponse.json({ error: '予約操作IDの形式が不正です' }, { status: 400 });
    }
    if (!paymentMethod || !PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ error: '支払い方法が不正です' }, { status: 400 });
    }
    if (date < todayJstDateStr() || date > maxBookableDateStr()) {
      return NextResponse.json({ error: 'ご指定の日付は予約受付期間外です' }, { status: 400 });
    }
    if (paymentMethod === 'credit_card' && !body.paymentToken?.token) {
      return NextResponse.json({ error: 'クレジットカード決済にはpaymentTokenが必要です' }, { status: 400 });
    }

    // ---- プラン再検証（改ざん対策: 価格・所要時間はSanityの正規データから取得し直す） ----
    const plan = await getSimpleWorkshopById(planId);
    if (!plan) {
      return NextResponse.json({ error: '指定されたワークショッププランが見つかりません' }, { status: 400 });
    }
    if (!plan.price || plan.price <= 0) {
      return NextResponse.json({ error: 'このプランは現在予約を受け付けていません（価格未設定）' }, { status: 400 });
    }

    const total = plan.price * (partySize as number);

    // ---- 空き枠の再検証（一覧表示と同じロジック。表示後に他の予約が入っている可能性があるため必須） ----
    try {
      const slotCheck = await isSlotStillAvailable(date, startTime, partySize as number);
      if (!slotCheck.ok) {
        return NextResponse.json({ error: slotCheck.reason }, { status: 409 });
      }
    } catch (error) {
      if (error instanceof CalendarUnavailableError) {
        return NextResponse.json(
          { error: '予約カレンダーに接続できません。しばらくしてから再度お試しください。' },
          { status: 503 }
        );
      }
      throw error;
    }

    const bookingNumber = buildWorkshopBookingNumber(idempotencyKey);
    // 枠全体（start〜end）を占有する。プランの所要時間は使わない（予約可否バリデーションで既にWORKSHOP_SLOTSのstartと一致確認済み）
    const startISO = jstDateTimeToIso(date, startTime);
    const endTime = matchedSlot.end;
    const endISO = jstDateTimeToIso(date, endTime);

    // ---- DBで枠を原子的に確保。最終的な定員判定はDBトリガーを正とする ----
    let reservation;
    try {
      reservation = await reserveBookingSlot({
        bookingNumber,
        workshopPlanId: plan._id,
        workshopPlanName: plan.title,
        date,
        startTime,
        endTime,
        partySize: partySize as number,
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
        paymentMethod,
        paymentStatus: 'pending',
        total,
        googleEventId: null,
        notes: notes || null,
        idempotencyKey,
      });
    } catch (error) {
      if (error instanceof WorkshopSlotCapacityError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      console.error('ワークショップ予約枠の確保に失敗しました:', error);
      return NextResponse.json(
        { error: '予約枠を確保できませんでした。時間をおいて再度お試しください。' },
        { status: 503 }
      );
    }

    const booking = reservation.booking;
    if (!reservation.created) {
      if (
        !bookingMatchesRequest(booking, {
          planId: plan._id,
          date,
          startTime,
          partySize: partySize as number,
          customerEmail,
          paymentMethod,
          total,
        })
      ) {
        return NextResponse.json(
          { error: '同じ予約操作IDが別の内容で使用されています', code: 'IDEMPOTENCY_CONFLICT' },
          { status: 409 }
        );
      }
      if (booking.status === 'cancelled') {
        return NextResponse.json(
          { error: 'この予約操作は既にキャンセルされています', code: 'IDEMPOTENCY_CONFLICT' },
          { status: 409 }
        );
      }

      const completed =
        booking.paymentMethod === 'credit_card'
          ? booking.paymentStatus === 'paid'
          : Boolean(booking.googleEventId);
      if (completed) {
        return NextResponse.json(successPayload(booking));
      }

      // 同時に届いた同じリクエストは、先行処理へ任せる。通信断後の再開は2分後から許可する。
      const createdAtMs = new Date(booking.createdAt).getTime();
      if (Number.isFinite(createdAtMs) && Date.now() - createdAtMs < 2 * 60 * 1000) {
        return NextResponse.json(
          { error: '同じ予約を処理中です。少し待ってから再度ご確認ください。', code: 'BOOKING_IN_PROGRESS' },
          { status: 409 }
        );
      }
    }

    // ---- Googleカレンダーへ決定的IDで登録。再送時の409は同じイベントとして扱う ----
    const requestedEventId = buildGoogleBookingEventId(idempotencyKey);
    let eventCreatedNow = false;
    try {
      const event = await createBookingEvent({
        eventId: requestedEventId,
        idempotencyKey,
        summary: `WS予約: ${plan.title} / ${customerName} / ${partySize}名`,
        description: [
          `予約番号: ${bookingNumber}`,
          `プラン: ${plan.title}`,
          `人数: ${partySize}名`,
          `氏名: ${customerName}`,
          `メール: ${customerEmail}`,
          customerPhone ? `電話: ${customerPhone}` : null,
          `支払い方法: ${paymentMethod}`,
          notes ? `備考: ${notes}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        startISO,
        endISO,
      });
      eventCreatedNow = event.created;
      if (booking.googleEventId !== event.eventId) {
        await updateBookingGoogleEvent(booking.id, event.eventId);
        booking.googleEventId = event.eventId;
      }
    } catch (error) {
      console.error('ワークショップ予約: Googleカレンダーへのイベント作成に失敗しました:', error);
      if (eventCreatedNow) {
        try {
          await deleteBookingEvent(requestedEventId);
        } catch (deleteError) {
          console.error('Googleイベント作成後のロールバックにも失敗しました:', deleteError);
        }
      }
      if (reservation.created) {
        try {
          await deleteBooking(booking.id);
        } catch (deleteError) {
          console.error('カレンダー登録失敗後の予約枠解放にも失敗しました:', deleteError);
        }
      }
      return NextResponse.json(
        { error: 'カレンダーへの登録に失敗したため予約を確定できませんでした。時間をおいて再度お試しください。' },
        { status: 503 }
      );
    }

    // ---- 決済分岐 ----
    let paymentStatus: 'pending' | 'paid' =
      booking.paymentStatus === 'paid' ? 'paid' : 'pending';

    if (paymentMethod === 'credit_card' && paymentStatus !== 'paid') {
      if (!reservation.created) {
        // 前回が決済応答受信前に中断した可能性を先に解消する。
        const previousPaymentCleared = await cancelSquarePaymentByIdempotencyKey(idempotencyKey);
        if (!previousPaymentCleared) {
          return NextResponse.json(
            {
              error: '決済状況を確認中です。店舗へお問い合わせください。',
              code: 'PAYMENT_STATUS_UNKNOWN',
            },
            { status: 503 }
          );
        }
      }

      const chargeResult = await chargeSquareCard({
        token: body.paymentToken!.token!,
        amount: total,
        referenceId: bookingNumber,
        customerEmail,
        idempotencyKey,
      });

      if (!chargeResult.success) {
        if (chargeResult.indeterminate) {
          const cancelled = await cancelSquarePaymentByIdempotencyKey(idempotencyKey);
          if (!cancelled) {
            // 支払い済みの可能性があるため、予約枠・イベント・冪等キーを保持して手動確認可能にする。
            return NextResponse.json(
              {
                error: '決済結果を確認できません。再度決済せず、店舗へお問い合わせください。',
                code: 'PAYMENT_STATUS_UNKNOWN',
              },
              { status: 503 }
            );
          }
        }

        // 決済失敗: カレンダーイベント削除＋予約削除でロールバック（在庫予約解放と同様の考え方）
        console.error('ワークショップ予約: 決済失敗のためロールバックします:', {
          bookingNumber,
          error: chargeResult.error,
        });
        try {
          await rollbackReservation(booking.id, booking.googleEventId);
        } catch (rollbackError) {
          console.error('ワークショップ予約: 決済失敗後のロールバックに失敗しました。手動確認が必要です:', {
            bookingId: booking.id,
            bookingNumber,
            rollbackError,
          });
        }
        return NextResponse.json(
          { error: '決済に失敗しました。カード情報を確認して再度お試しください。' },
          { status: 400 }
        );
      }

      paymentStatus = 'paid';
      try {
        await updateBookingPayment(booking.id, { paymentStatus: 'paid', squarePaymentId: chargeResult.paymentId });
        booking.paymentStatus = 'paid';
        booking.squarePaymentId = chargeResult.paymentId || null;
      } catch (updateError) {
        // 決済は既に成立しているため、DB更新失敗は要手動確認としてログに残し処理は継続する
        // （create-payment/route.tsの既存注文フローと同じ方針: 二重課金を避けるため成功レスポンスは返す）
        console.error('🚨 ワークショップ予約: 決済は成立したが決済状態の更新に失敗しました。手動確認が必要です:', {
          bookingId: booking.id,
          bookingNumber,
          squarePaymentId: chargeResult.paymentId,
          error: updateError,
        });
      }
    }
    // on_site / paypay はpayment_status: 'pending'のまま（現地精算）。
    // TODO(paypay): 現時点ではon_siteと同様「現地/別途」扱い。オンラインPayPay決済（動的QR）は次フェーズで、
    // src/lib/paypay.ts の店頭動的QR決済の仕組みを流用する想定。

    // ---- 確認メール送信（顧客・店舗。失敗しても例外を投げない sendMail のためtry不要） ----
    const emailBody = buildConfirmationEmailBody({
      bookingNumber,
      planName: plan.title,
      date,
      startTime,
      endTime,
      partySize: partySize as number,
      total,
      paymentMethod,
      paymentStatus,
      customerName,
    });
    await sendMail({
      to: customerEmail,
      subject: `【MOSS COUNTRY】ワークショップご予約確認（${bookingNumber}）`,
      text: emailBody,
    });
    await sendMail({
      to: STORE_EMAIL,
      subject: `【新規予約】ワークショップ ${date} ${startTime} (${bookingNumber})`,
      text: emailBody,
    });

    // ---- 取引明細シートへの同期（任意・fire-and-forget。失敗しても予約処理には影響させない） ----
    void (async () => {
      try {
        const { upsertTransactionRow } = await import('@/lib/googleSheets');
        await upsertTransactionRow({
          datetime: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
          type: 'ワークショップ予約',
          txId: bookingNumber,
          customerName,
          customerEmail: customerEmail || '',
          paymentMethod:
            paymentMethod === 'credit_card' ? 'クレジット(オンライン)' : paymentMethod === 'paypay' ? 'PayPay(現地)' : '現地払い',
          itemsSummary: `${plan.title}×${partySize}名`,
          subtotal: total,
          shipping: 0,
          tax: 0,
          total,
          status: paymentStatus === 'paid' ? '支払い済み' : '入金待ち',
          updatedAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        });
      } catch (error) {
        console.error('ワークショップ予約のシート同期に失敗しました（予約処理自体には影響ありません）:', error);
      }
    })();

    return NextResponse.json({
      success: true,
      bookingNumber,
      date,
      startTime,
      endTime,
      partySize,
      total,
      paymentMethod,
      paymentStatus,
    });
  } catch (error) {
    console.error('ワークショップ予約作成エラー:', error);
    return NextResponse.json(
      { error: '予約処理に失敗しました。時間をおいて再度お試しください。' },
      { status: 500 }
    );
  }
}
