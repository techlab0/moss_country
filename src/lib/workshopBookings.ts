// ワークショップ予約データアクセス層（Supabase / service role専用）
//
// bookingは顧客の氏名・メール・電話番号などのPIIを含むため、公開データセットのSanityではなく
// service_roleキーでのみアクセスできるSupabaseに保存する（docs/sql/create-workshop-bookings-table.sql参照）。
// 方針は src/lib/orders.ts に合わせている。
//
// 書き込み系（reserveBookingSlot / cancelBooking / updateBookingPayment）は失敗時に例外をthrowする。
// 呼び出し元（予約作成API・管理画面キャンセルAPI）はロールバック（Googleカレンダーイベント削除等）を
// 行う前提のため、ここで例外を握りつぶすとその処理が動かなくなる。
//
// 読み取り系（listBookings等）は失敗をログに残したうえで空配列/nullを返す（フェイルソフト）。
// ただし getBookingsInDateRange は空き枠計算の根拠データのため、失敗時に空配列を返すと
// 「予約が無い＝空いている」と誤判定してダブルブッキングを招く。そのため例外をthrowする。

import { supabaseAdmin } from './supabase';

export type WorkshopBookingPaymentMethod = 'credit_card' | 'on_site' | 'paypay';
export type WorkshopBookingPaymentStatus = 'pending' | 'paid' | 'refunded';
export type WorkshopBookingStatus = 'confirmed' | 'cancelled';

export interface WorkshopBooking {
  id: string;
  bookingNumber: string;
  workshopPlanId: string | null;
  workshopPlanName: string | null;
  date: string; // YYYY-MM-DD (JST暦日)
  startTime: string; // HH:MM (JST)
  endTime: string; // HH:MM (JST)
  partySize: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  paymentMethod: WorkshopBookingPaymentMethod | null;
  paymentStatus: WorkshopBookingPaymentStatus;
  total: number | null;
  squarePaymentId: string | null;
  /** 返金ID（Square: refund.id / PayPay: merchantRefundId）。返金していなければnull */
  refundId: string | null;
  googleEventId: string | null;
  status: WorkshopBookingStatus;
  notes: string | null;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkshopBookingInput {
  bookingNumber: string;
  workshopPlanId?: string | null;
  workshopPlanName?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  partySize: number;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  paymentMethod: WorkshopBookingPaymentMethod;
  paymentStatus?: WorkshopBookingPaymentStatus;
  total?: number | null;
  squarePaymentId?: string | null;
  googleEventId?: string | null;
  notes?: string | null;
  idempotencyKey: string;
}

export interface UpdateWorkshopBookingPaymentInput {
  paymentStatus?: WorkshopBookingPaymentStatus;
  squarePaymentId?: string | null;
  refundId?: string | null;
}

export interface ListWorkshopBookingsOptions {
  status?: WorkshopBookingStatus;
  date?: string;
  limit?: number;
}

// DB行（snake_case）の型
interface WorkshopBookingRow {
  id: string;
  booking_number: string;
  workshop_plan_id: string | null;
  workshop_plan_name: string | null;
  date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  payment_method: string | null;
  payment_status: string;
  total: number | null;
  square_payment_id: string | null;
  refund_id?: string | null;
  google_event_id: string | null;
  status: string;
  notes: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

function rowToBooking(row: WorkshopBookingRow): WorkshopBooking {
  return {
    id: row.id,
    bookingNumber: row.booking_number,
    workshopPlanId: row.workshop_plan_id,
    workshopPlanName: row.workshop_plan_name,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    partySize: row.party_size,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    paymentMethod: (row.payment_method as WorkshopBookingPaymentMethod) || null,
    paymentStatus: (row.payment_status as WorkshopBookingPaymentStatus) || 'pending',
    total: row.total,
    squarePaymentId: row.square_payment_id,
    refundId: row.refund_id ?? null,
    googleEventId: row.google_event_id,
    status: (row.status as WorkshopBookingStatus) || 'confirmed',
    notes: row.notes,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function inputToInsertRow(input: CreateWorkshopBookingInput) {
  return {
    booking_number: input.bookingNumber,
    workshop_plan_id: input.workshopPlanId ?? null,
    workshop_plan_name: input.workshopPlanName ?? null,
    date: input.date,
    start_time: input.startTime,
    end_time: input.endTime,
    party_size: input.partySize,
    customer_name: input.customerName ?? null,
    customer_email: input.customerEmail ?? null,
    customer_phone: input.customerPhone ?? null,
    payment_method: input.paymentMethod,
    payment_status: input.paymentStatus ?? 'pending',
    total: input.total ?? null,
    square_payment_id: input.squarePaymentId ?? null,
    google_event_id: input.googleEventId ?? null,
    notes: input.notes ?? null,
    idempotency_key: input.idempotencyKey,
  };
}

export class WorkshopSlotCapacityError extends Error {}

export interface ReserveBookingSlotResult {
  booking: WorkshopBooking;
  created: boolean;
}

/**
 * 予約枠を新規確保する。DBトリガーが同一枠の処理を直列化し、定員を最終保証する。
 * 同じidempotency_keyの再送なら既存予約を返し、後続処理を安全に再開できるようにする。
 */
export async function reserveBookingSlot(
  input: CreateWorkshopBookingInput
): Promise<ReserveBookingSlotResult> {
  const { data, error } = await supabaseAdmin
    .from('workshop_bookings')
    .insert([inputToInsertRow(input)])
    .select('*')
    .single();

  if (error || !data) {
    if (error?.message?.includes('WORKSHOP_SLOT_CAPACITY_EXCEEDED')) {
      throw new WorkshopSlotCapacityError('この枠は指定人数分の空きがありません');
    }
    // 同じ操作の再送。DBのUNIQUE制約を正として、既存予約を返して後続処理を冪等に再開する。
    if (error?.code === '23505') {
      const existing = await getBookingByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        return { booking: existing, created: false };
      }
    }
    console.error('ワークショップ予約の作成に失敗しました:', error);
    throw new Error('Failed to create workshop booking in database');
  }

  return { booking: rowToBooking(data), created: true };
}

export async function getBookingByIdempotencyKey(
  idempotencyKey: string
): Promise<WorkshopBooking | null> {
  const { data, error } = await supabaseAdmin
    .from('workshop_bookings')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (error) {
    console.error('冪等キーによるワークショップ予約取得に失敗しました:', {
      code: error.code,
      message: error.message,
    });
    throw error;
  }
  return data ? rowToBooking(data) : null;
}

export async function updateBookingGoogleEvent(
  id: string,
  googleEventId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('workshop_bookings')
    .update({ google_event_id: googleEventId })
    .eq('id', id);

  if (error) {
    console.error(`GoogleイベントIDの保存に失敗しました (id: ${id}):`, error);
    throw error;
  }
}

/**
 * IDで予約を1件取得する。見つからない/失敗した場合はnullを返す。
 */
export async function getBookingById(id: string): Promise<WorkshopBooking | null> {
  try {
    const { data, error } = await supabaseAdmin.from('workshop_bookings').select('*').eq('id', id).single();
    if (error) {
      if (error.code !== 'PGRST116') throw error;
      return null;
    }
    return data ? rowToBooking(data) : null;
  } catch (error) {
    console.warn(`ワークショップ予約の取得に失敗しました (id: ${id}):`, error);
    return null;
  }
}

/**
 * 予約番号で予約を1件取得する。見つからない/失敗した場合はnullを返す。
 */
export async function getBookingByNumber(bookingNumber: string): Promise<WorkshopBooking | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('workshop_bookings')
      .select('*')
      .eq('booking_number', bookingNumber)
      .single();
    if (error) {
      if (error.code !== 'PGRST116') throw error;
      return null;
    }
    return data ? rowToBooking(data) : null;
  } catch (error) {
    console.warn(`ワークショップ予約の取得に失敗しました (bookingNumber: ${bookingNumber}):`, error);
    return null;
  }
}

/**
 * 予約一覧を新しい順で取得する（管理画面用）。取得に失敗した場合はログを残し空配列を返す。
 */
export async function listBookings(opts?: ListWorkshopBookingsOptions): Promise<WorkshopBooking[]> {
  try {
    let query = supabaseAdmin.from('workshop_bookings').select('*').order('date', { ascending: false });

    if (opts?.status) {
      query = query.eq('status', opts.status);
    }
    if (opts?.date) {
      query = query.eq('date', opts.date);
    }
    if (opts?.limit) {
      query = query.limit(opts.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(rowToBooking);
  } catch (error) {
    console.warn('ワークショップ予約一覧の取得に失敗しました:', error);
    return [];
  }
}

/**
 * 指定日付範囲（[startDate, endDate]、両端含む、YYYY-MM-DD）内の confirmed 状態の予約を取得する。
 * 空き枠計算（利用可否API・予約作成APIの再検証）の根拠データとして使うため、
 * 他の読み取り系とは異なり失敗時に空配列を返さず例外をthrowする
 * （失敗を「予約なし＝空いている」と誤判定させないため）。
 */
export async function getBookingsInDateRange(startDate: string, endDate: string): Promise<WorkshopBooking[]> {
  const { data, error } = await supabaseAdmin
    .from('workshop_bookings')
    .select('*')
    .eq('status', 'confirmed')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    console.error(`ワークショップ予約の期間取得に失敗しました (${startDate} ~ ${endDate}):`, error);
    throw error;
  }

  return (data || []).map(rowToBooking);
}

/**
 * 予約をキャンセルする。Googleカレンダーイベントの削除は呼び出し元で行う
 * （このモジュールはSupabaseへのアクセスのみを担当するため）。
 * 失敗時はログを残したうえで例外をthrowする。
 */
export async function cancelBooking(id: string, patch?: { googleEventId?: string | null }): Promise<void> {
  const updateFields: Record<string, unknown> = { status: 'cancelled' };
  if (patch && 'googleEventId' in patch) {
    updateFields.google_event_id = patch.googleEventId ?? null;
  }

  const { error } = await supabaseAdmin.from('workshop_bookings').update(updateFields).eq('id', id);

  if (error) {
    console.error(`ワークショップ予約のキャンセルに失敗しました (id: ${id}):`, error);
    throw error;
  }
}

/**
 * 予約の決済関連フィールドを更新する（決済成功時のpaymentStatus更新等）。
 * 失敗時はログを残したうえで例外をthrowする。
 */
export async function updateBookingPayment(id: string, patch: UpdateWorkshopBookingPaymentInput): Promise<void> {
  const updateFields: Record<string, unknown> = {};
  if (patch.paymentStatus !== undefined) updateFields.payment_status = patch.paymentStatus;
  if (patch.squarePaymentId !== undefined) updateFields.square_payment_id = patch.squarePaymentId;
  if (patch.refundId !== undefined) updateFields.refund_id = patch.refundId;

  if (Object.keys(updateFields).length === 0) return;

  const { error } = await supabaseAdmin.from('workshop_bookings').update(updateFields).eq('id', id);

  if (error) {
    console.error(`ワークショップ予約の決済情報更新に失敗しました (id: ${id}):`, error);
    throw error;
  }
}

/**
 * 予約を完全に削除する（決済失敗時のロールバック用）。
 * 失敗時はログを残したうえで例外をthrowする。
 */
export async function deleteBooking(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('workshop_bookings').delete().eq('id', id);
  if (error) {
    console.error(`ワークショップ予約の削除に失敗しました (id: ${id}):`, error);
    throw error;
  }
}
