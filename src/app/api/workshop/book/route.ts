import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { checkRateLimit } from '@/lib/simpleRateLimit';
import { getSimpleWorkshopById } from '@/lib/sanity';
import { convertToSquareAmount, SQUARE_CONFIG } from '@/lib/square';
import { createBookingEvent, deleteBookingEvent } from '@/lib/googleCalendar';
import { isSlotStillAvailable, CalendarUnavailableError } from '@/lib/workshopAvailability';
import {
  createBooking,
  deleteBooking,
  updateBookingPayment,
  type WorkshopBookingPaymentMethod,
} from '@/lib/workshopBookings';
import { sendMail, STORE_EMAIL } from '@/lib/mailer';
import {
  SLOT_START_TIMES,
  CAPACITY_PER_SLOT,
  resolveWorkshopDurationMinutes,
  jstDateTimeToIso,
  addMinutesToIso,
  addMinutesToTimeString,
  todayJstDateStr,
  maxBookableDateStr,
} from '@/lib/workshopBookingConfig';

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
}: {
  token: string;
  amount: number;
  referenceId: string;
  customerEmail?: string | null;
}): Promise<{ success: boolean; paymentId?: string; error?: string }> {
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
      idempotency_key: uuidv4(),
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
      return { success: false, error: errorMessage };
    }

    return { success: true, paymentId: result.payment?.id };
  } catch (error) {
    console.error('ワークショップ予約のSquare決済処理中にエラーが発生しました:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown payment error' };
  }
}

function generateBookingNumber(): string {
  return `WS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
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

// 公開API（予約作成）。認証不要。
export async function POST(request: NextRequest) {
  let createdEventId: string | null = null;
  let createdBookingId: string | null = null;

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

    // ---- 入力バリデーション ----
    if (!planId || typeof planId !== 'string') {
      return NextResponse.json({ error: 'planIdは必須です' }, { status: 400 });
    }
    if (!date || !DATE_RE.test(date)) {
      return NextResponse.json({ error: 'dateの形式が不正です（YYYY-MM-DD）' }, { status: 400 });
    }
    if (!startTime || !SLOT_START_TIMES.includes(startTime)) {
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

    const durationMin = resolveWorkshopDurationMinutes(plan);
    const total = plan.price * (partySize as number);

    // ---- 空き枠の再検証（一覧表示と同じロジック。表示後に他の予約が入っている可能性があるため必須） ----
    try {
      const slotCheck = await isSlotStillAvailable(date, startTime, durationMin, partySize as number);
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

    const bookingNumber = generateBookingNumber();
    const startISO = jstDateTimeToIso(date, startTime);
    const endISO = addMinutesToIso(startISO, durationMin);
    const endTime = addMinutesToTimeString(startTime, durationMin);

    // ---- Googleカレンダーへイベント作成。失敗したら予約を確定させずここで終了する ----
    try {
      const event = await createBookingEvent({
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
      createdEventId = event.eventId;
    } catch (error) {
      console.error('ワークショップ予約: Googleカレンダーへのイベント作成に失敗しました:', error);
      return NextResponse.json(
        { error: 'カレンダーへの登録に失敗したため予約を確定できませんでした。時間をおいて再度お試しください。' },
        { status: 503 }
      );
    }

    // ---- Supabaseへ保存（pending状態でまず作成） ----
    let booking;
    try {
      booking = await createBooking({
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
        googleEventId: createdEventId,
        notes: notes || null,
      });
      createdBookingId = booking.id;
    } catch (error) {
      console.error('ワークショップ予約: Supabaseへの保存に失敗しました。Googleカレンダーイベントをロールバックします:', error);
      if (createdEventId) await deleteBookingEvent(createdEventId);
      return NextResponse.json({ error: '予約の保存に失敗しました' }, { status: 500 });
    }

    // ---- 決済分岐 ----
    let paymentStatus: 'pending' | 'paid' = 'pending';

    if (paymentMethod === 'credit_card') {
      const chargeResult = await chargeSquareCard({
        token: body.paymentToken!.token!,
        amount: total,
        referenceId: bookingNumber,
        customerEmail,
      });

      if (!chargeResult.success) {
        // 決済失敗: カレンダーイベント削除＋予約削除でロールバック（在庫予約解放と同様の考え方）
        console.error('ワークショップ予約: 決済失敗のためロールバックします:', {
          bookingNumber,
          error: chargeResult.error,
        });
        if (createdEventId) await deleteBookingEvent(createdEventId);
        try {
          if (createdBookingId) await deleteBooking(createdBookingId);
        } catch (rollbackError) {
          console.error('ワークショップ予約: 決済失敗後の予約削除にも失敗しました。手動確認が必要です:', {
            bookingId: createdBookingId,
            bookingNumber,
            rollbackError,
          });
        }
        return NextResponse.json(
          { error: '決済に失敗しました', message: chargeResult.error || 'Unknown payment error' },
          { status: 400 }
        );
      }

      paymentStatus = 'paid';
      try {
        await updateBookingPayment(booking.id, { paymentStatus: 'paid', squarePaymentId: chargeResult.paymentId });
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
      { error: '予約処理に失敗しました', message: error instanceof Error ? error.message : 'unknown' },
      { status: 500 }
    );
  }
}
