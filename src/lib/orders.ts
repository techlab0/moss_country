// 注文データアクセス層（Supabase / service role専用）
//
// orderは顧客の氏名・メール・電話番号などのPIIを含むため、公開データセットのSanityではなく
// service_roleキーでのみアクセスできるSupabaseに保存する（docs/sql/create-orders-table.sql参照）。
//
// 書き込み系（createOrder / updateOrderStatus）は失敗時に例外をthrowする。
// 呼び出し元（決済API・Webhook・管理画面PATCH）は既存のtry/catchで在庫ロールバックや
// 500エラー応答を行う前提のため、ここで例外を握りつぶすとその処理が動かなくなる。
//
// 読み取り系（getOrders等）は失敗をログに残したうえで空配列/nullを返す。
// 管理画面の一覧・集計は複数データソースをマージすることが多く、1クエリの失敗で
// 画面全体を落とすよりも、部分的にでも表示を継続する方針（userManager.ts等の既存の
// フォールバック方針に合わせた）。

import { supabaseAdmin } from './supabase';
import type { Address, PaymentStatus } from '@/types/ecommerce';

// src/types/ecommerce.ts の OrderStatus には実際に全APIルート・管理画面で使われている
// 'paid'（決済完了。配送状況の'shipped'/'delivered'とは別軸のステータスとして既存コードが
// 使用している）が含まれていないため、実際の運用値に合わせてここで定義し直す。
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

// 注文明細のスナップショット（商品参照ではなく購入時点の内容を保持する）
export interface OrderItemSnapshot {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  variant?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerEmail: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerPhone: string | null;
  items: OrderItemSnapshot[];
  subtotal: number | null;
  shippingCost: number | null;
  tax: number | null;
  total: number | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  shippingAddress: Address | null;
  notes: string | null;
  trackingNumber: string | null;
  squareOrderId: string | null;
  squarePaymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  orderNumber: string;
  customerEmail?: string | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerPhone?: string | null;
  items: OrderItemSnapshot[];
  subtotal?: number | null;
  shippingCost?: number | null;
  tax?: number | null;
  total?: number | null;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: string | null;
  shippingAddress?: Address | null;
  notes?: string | null;
  squareOrderId?: string | null;
  squarePaymentId?: string | null;
}

export interface UpdateOrderStatusInput {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: string | null;
  trackingNumber?: string | null;
  notes?: string | null;
  squareOrderId?: string | null;
  squarePaymentId?: string | null;
}

export interface GetOrdersOptions {
  status?: OrderStatus;
  limit?: number;
}

// DB行（snake_case）の型
interface OrderRow {
  id: string;
  order_number: string;
  customer_email: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_phone: string | null;
  items: OrderItemSnapshot[];
  subtotal: number | null;
  shipping_cost: number | null;
  tax: number | null;
  total: number | null;
  status: string;
  payment_status: string;
  payment_method: string | null;
  shipping_address: Address | null;
  notes: string | null;
  tracking_number: string | null;
  square_order_id: string | null;
  square_payment_id: string | null;
  created_at: string;
  updated_at: string;
}

function rowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerEmail: row.customer_email,
    customerFirstName: row.customer_first_name,
    customerLastName: row.customer_last_name,
    customerPhone: row.customer_phone,
    items: row.items || [],
    subtotal: row.subtotal,
    shippingCost: row.shipping_cost,
    tax: row.tax,
    total: row.total,
    status: (row.status as OrderStatus) || 'pending',
    paymentStatus: (row.payment_status as PaymentStatus) || 'pending',
    paymentMethod: row.payment_method,
    shippingAddress: row.shipping_address,
    notes: row.notes,
    trackingNumber: row.tracking_number,
    squareOrderId: row.square_order_id,
    squarePaymentId: row.square_payment_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function inputToInsertRow(input: CreateOrderInput) {
  return {
    order_number: input.orderNumber,
    customer_email: input.customerEmail ?? null,
    customer_first_name: input.customerFirstName ?? null,
    customer_last_name: input.customerLastName ?? null,
    customer_phone: input.customerPhone ?? null,
    items: input.items,
    subtotal: input.subtotal ?? null,
    shipping_cost: input.shippingCost ?? null,
    tax: input.tax ?? null,
    total: input.total ?? null,
    status: input.status ?? 'pending',
    payment_status: input.paymentStatus ?? 'pending',
    payment_method: input.paymentMethod ?? null,
    shipping_address: input.shippingAddress ?? null,
    notes: input.notes ?? null,
    square_order_id: input.squareOrderId ?? null,
    square_payment_id: input.squarePaymentId ?? null,
  };
}

/**
 * 注文を新規作成する。
 * 呼び出し元（決済API群）は作成失敗時に確保済みの在庫予約を解放する前提のため、
 * 失敗時はログを残したうえで例外をthrowする（呼び出し元のcatchに委ねる）。
 */
export async function createOrder(input: CreateOrderInput): Promise<{ orderNumber: string; id: string }> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert([inputToInsertRow(input)])
    .select('id, order_number')
    .single();

  if (error || !data) {
    console.error('注文の作成に失敗しました:', error);
    throw new Error('Failed to create order in database');
  }

  return { orderNumber: data.order_number, id: data.id };
}

/**
 * 注文一覧を新しい順で取得する。取得に失敗した場合はログを残し空配列を返す。
 */
export async function getOrders(opts?: GetOrdersOptions): Promise<Order[]> {
  try {
    let query = supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false });

    if (opts?.status) {
      query = query.eq('status', opts.status);
    }
    if (opts?.limit) {
      query = query.limit(opts.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(rowToOrder);
  } catch (error) {
    console.warn('注文一覧の取得に失敗しました:', error);
    return [];
  }
}

/**
 * IDで注文を1件取得する。見つからない/失敗した場合はnullを返す。
 */
export async function getOrderById(id: string): Promise<Order | null> {
  try {
    const { data, error } = await supabaseAdmin.from('orders').select('*').eq('id', id).single();
    if (error) {
      if (error.code !== 'PGRST116') throw error;
      return null;
    }
    return data ? rowToOrder(data) : null;
  } catch (error) {
    console.warn(`注文の取得に失敗しました (id: ${id}):`, error);
    return null;
  }
}

/**
 * 注文番号で注文を1件取得する。見つからない/失敗した場合はnullを返す。
 */
export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single();
    if (error) {
      if (error.code !== 'PGRST116') throw error;
      return null;
    }
    return data ? rowToOrder(data) : null;
  } catch (error) {
    console.warn(`注文の取得に失敗しました (orderNumber: ${orderNumber}):`, error);
    return null;
  }
}

/**
 * Square の Order ID または Payment ID から注文を1件取得する。
 * SquareのWebhookは squareOrderId が保存されていない/一致しないケースに備えて
 * squarePaymentId でもフォールバック検索できる必要があるため用意した
 * （仕様書に明記の無い追加関数。webhookハンドラの既存動作を維持するために必要）。
 */
export async function getOrderBySquareId(params: { squareOrderId?: string | null; squarePaymentId?: string | null }): Promise<Order | null> {
  try {
    const orFilters: string[] = [];
    if (params.squareOrderId) orFilters.push(`square_order_id.eq.${params.squareOrderId}`);
    if (params.squarePaymentId) orFilters.push(`square_payment_id.eq.${params.squarePaymentId}`);
    if (orFilters.length === 0) return null;

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .or(orFilters.join(','))
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToOrder(data) : null;
  } catch (error) {
    console.warn('Square IDでの注文取得に失敗しました:', error);
    return null;
  }
}

/**
 * 直近の注文をN件取得する。失敗した場合はログを残し空配列を返す。
 */
export async function getRecentOrders(limit: number): Promise<Order[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(rowToOrder);
  } catch (error) {
    console.warn('直近の注文取得に失敗しました:', error);
    return [];
  }
}

/**
 * 顧客メールアドレスで注文を検索する。失敗した場合はログを残し空配列を返す。
 */
export async function getOrdersByEmail(email: string): Promise<Order[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('customer_email', email)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToOrder);
  } catch (error) {
    console.warn(`顧客の注文取得に失敗しました (email: ${email}):`, error);
    return [];
  }
}

/**
 * 注文のステータス等を更新する。管理画面のPATCHやWebhookからのステータス反映で使用する。
 * 失敗時はログを残したうえで例外をthrowする（呼び出し元が成功/失敗を判別できる必要があるため）。
 */
export async function updateOrderStatus(id: string, patch: UpdateOrderStatusInput): Promise<void> {
  const updateFields: Record<string, unknown> = {};
  if (patch.status !== undefined) updateFields.status = patch.status;
  if (patch.paymentStatus !== undefined) updateFields.payment_status = patch.paymentStatus;
  if (patch.paymentMethod !== undefined) updateFields.payment_method = patch.paymentMethod;
  if (patch.trackingNumber !== undefined) updateFields.tracking_number = patch.trackingNumber;
  if (patch.notes !== undefined) updateFields.notes = patch.notes;
  if (patch.squareOrderId !== undefined) updateFields.square_order_id = patch.squareOrderId;
  if (patch.squarePaymentId !== undefined) updateFields.square_payment_id = patch.squarePaymentId;

  const { error } = await supabaseAdmin.from('orders').update(updateFields).eq('id', id);

  if (error) {
    console.error(`注文ステータスの更新に失敗しました (id: ${id}):`, error);
    throw error;
  }
}

/**
 * 注文を削除する。管理画面の完全削除機能で使用する。
 * 失敗時はログを残したうえで例外をthrowする。
 */
export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('orders').delete().eq('id', id);
  if (error) {
    console.error(`注文の削除に失敗しました (id: ${id}):`, error);
    throw error;
  }
}

/**
 * 指定期間（ISO文字列、[startISO, endISO)）内に作成された注文を取得する。
 * 売上集計（sales/monthly, sales/[date]）で使用する。失敗した場合はログを残し空配列を返す。
 */
export async function getOrdersInDateRange(startISO: string, endISO: string): Promise<Order[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .gte('created_at', startISO)
      .lt('created_at', endISO)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToOrder);
  } catch (error) {
    console.warn(`期間指定での注文取得に失敗しました (${startISO} ~ ${endISO}):`, error);
    return [];
  }
}
