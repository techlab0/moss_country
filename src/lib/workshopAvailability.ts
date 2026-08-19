// ワークショップ予約の空き枠計算ロジック（共通化）。
//
// GET /api/workshop/availability（一覧表示用）と POST /api/workshop/book
// （予約直前の再検証用）の両方から使う。ロジックを1箇所に集約することで、
// 「一覧では空き扱いだったのに予約時の再検証だけ判定がズレる」事故を防ぐ。
//
// 安全側の設計: 営業日データ・既存予約・Googleカレンダーのbusy時間帯のいずれかが
// 取得できない場合、空配列を返さずに CalendarUnavailableError を投げる。
// 「確認できない＝空いている」という誤判定を避けるため。

import { supabaseAdmin } from './supabase';
import { getBusyIntervals } from './googleCalendar';
import { getBookingsInDateRange } from './workshopBookings';
import { getOverridesInRange } from './workshopSlotOverrides';
import {
  buildWorkshopCalendarPolicy,
  isWorkshopBusinessDate,
  type WorkshopCalendarPolicy,
} from './workshopCalendarPolicy';
import {
  WORKSHOP_SLOTS,
  CAPACITY_PER_SLOT,
  jstDateTimeToIso,
  addMinutesToIso,
  isBookableWeekday,
  isWithinLeadTime,
  listDatesInRange,
} from './workshopBookingConfig';

export interface AvailableSlot {
  date: string;
  startTime: string;
  endTime: string;
  remaining: number;
}

/** 営業日・既存予約・Googleカレンダーのいずれかが確認できない場合に投げる例外。呼び出し元は503相当として扱うこと。 */
export class CalendarUnavailableError extends Error {}

function intervalsOverlap(aStartIso: string, aEndIso: string, bStartIso: string, bEndIso: string): boolean {
  const aStart = new Date(aStartIso).getTime();
  const aEnd = new Date(aEndIso).getTime();
  const bStart = new Date(bStartIso).getTime();
  const bEnd = new Date(bEndIso).getTime();
  return aStart < bEnd && bStart < aEnd;
}

/**
 * 指定期間内のカレンダー項目を取得し、営業日・休業日の判定情報を返す。
 * 取得に失敗した場合は CalendarUnavailableError を投げる。
 */
export async function getWorkshopCalendarPolicy(
  fromDate: string,
  toDate: string
): Promise<WorkshopCalendarPolicy> {
  const { data, error } = await supabaseAdmin
    .from('calendar_events')
    .select('date, type')
    .gte('date', fromDate)
    .lte('date', toDate);

  if (error) {
    console.error('営業日カレンダーの取得に失敗しました:', error);
    throw new CalendarUnavailableError('営業日カレンダーを確認できません');
  }

  return buildWorkshopCalendarPolicy(data || []);
}

/**
 * 受付枠の状態。computeAvailableSlots は open のものだけを返すため、
 * 「満席」「受付していない」枠は結果に現れない。じゃらん側の在庫を閉じる判断には
 * それらこそが必要なので、全部の枠を状態付きで返す関数を別に用意している。
 */
export type SlotState =
  /** 予約を受け付けられる */
  | 'open'
  /** 定員に達している */
  | 'full'
  /** 営業日でない・曜日対象外・枠停止中・カレンダーに別予定 */
  | 'closed'
  /** 受付締切（開始24時間前）を過ぎている */
  | 'past';

export interface SlotStatus {
  date: string;
  startTime: string;
  endTime: string;
  /** open のときの残り人数。それ以外は0 */
  remaining: number;
  state: SlotState;
  /** closed の理由（管理画面にそのまま表示する） */
  reason?: string;
}

/**
 * 営業日カレンダーに1件でも登録がある月（YYYY-MM）を返す。
 *
 * 未登録の月は「休業」ではなく「まだ予定を決めていない」状態なので、
 * じゃらん側を閉じるべき日として警告しても意味がない（月まるごと警告になり、
 * 本当に対応が必要な日が埋もれる）。警告対象をこの月に絞るために使う。
 */
export async function getRegisteredCalendarMonths(
  fromDate: string,
  toDate: string
): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin
    .from('calendar_events')
    .select('date')
    .gte('date', fromDate)
    .lte('date', toDate);

  if (error) {
    console.error('営業日カレンダーの登録月の取得に失敗しました:', error);
    throw new CalendarUnavailableError('営業日カレンダーを確認できません');
  }

  return new Set((data || []).map((row: { date: string }) => row.date.slice(0, 7)));
}

/**
 * [fromDate, toDate]の全受付枠を、状態付きで返す。
 * computeAvailableSlots はこの結果から open だけを取り出したもので、
 * 判定ロジックの二重化を避けるため両者は同じ計算を共有する。
 */
export async function computeSlotStatuses(fromDate: string, toDate: string): Promise<SlotStatus[]> {
  if (fromDate > toDate) return [];

  let calendarPolicy: WorkshopCalendarPolicy;
  let existingBookings: Awaited<ReturnType<typeof getBookingsInDateRange>>;
  let busyIntervals: Awaited<ReturnType<typeof getBusyIntervals>>;
  let overrides: Awaited<ReturnType<typeof getOverridesInRange>>;

  try {
    const rangeStartIso = jstDateTimeToIso(fromDate, '00:00');
    const rangeEndIso = addMinutesToIso(jstDateTimeToIso(toDate, '00:00'), 24 * 60);
    [calendarPolicy, existingBookings, busyIntervals, overrides] = await Promise.all([
      getWorkshopCalendarPolicy(fromDate, toDate),
      getBookingsInDateRange(fromDate, toDate),
      getBusyIntervals(rangeStartIso, rangeEndIso),
      getOverridesInRange(fromDate, toDate),
    ]);
  } catch (error) {
    if (error instanceof CalendarUnavailableError) throw error;
    console.error('空き枠計算に必要なデータの取得に失敗しました:', error);
    throw new CalendarUnavailableError('予約カレンダーに接続できません');
  }

  // 同一日・同一開始時刻の予約人数を集計（プランを問わず1枠の定員として扱う）
  const partySizeBySlot = new Map<string, number>();
  for (const booking of existingBookings) {
    const key = `${booking.date}|${booking.startTime}`;
    partySizeBySlot.set(key, (partySizeBySlot.get(key) || 0) + booking.partySize);
  }

  // 管理画面で明示的に閉鎖された枠（is_open=false）のみを除外対象とする
  const closedSlotKeys = new Set(
    overrides.filter(o => !o.isOpen).map(o => `${o.date}|${o.startTime}`)
  );

  const dates = listDatesInRange(fromDate, toDate);
  const statuses: SlotStatus[] = [];

  for (const date of dates) {
    // 日単位で受け付けない理由。判定順は従来のcomputeAvailableSlotsと同じ
    const dayClosedReason = !isBookableWeekday(date)
      ? '受付対象の曜日ではありません'
      : !isWorkshopBusinessDate(calendarPolicy, date)
        ? '営業日ではありません（定休日・イベント出店など）'
        : null;

    for (const slot of WORKSHOP_SLOTS) {
      const base = { date, startTime: slot.start, endTime: slot.end };

      if (dayClosedReason) {
        statuses.push({ ...base, remaining: 0, state: 'closed', reason: dayClosedReason });
        continue;
      }

      if (closedSlotKeys.has(`${date}|${slot.start}`)) {
        statuses.push({ ...base, remaining: 0, state: 'closed', reason: '受付枠を停止中です' });
        continue;
      }

      const slotStartIso = jstDateTimeToIso(date, slot.start);
      const slotEndIso = jstDateTimeToIso(date, slot.end);

      if (!isWithinLeadTime(slotStartIso)) {
        statuses.push({ ...base, remaining: 0, state: 'past' });
        continue;
      }

      const overlapsBusy = busyIntervals.some(b => intervalsOverlap(slotStartIso, slotEndIso, b.start, b.end));
      if (overlapsBusy) {
        statuses.push({
          ...base,
          remaining: 0,
          state: 'closed',
          reason: 'Googleカレンダーに別の予定が入っています',
        });
        continue;
      }

      const booked = partySizeBySlot.get(`${date}|${slot.start}`) || 0;
      const remaining = CAPACITY_PER_SLOT - booked;

      if (remaining <= 0) {
        statuses.push({ ...base, remaining: 0, state: 'full' });
        continue;
      }

      statuses.push({ ...base, remaining, state: 'open' });
    }
  }

  return statuses;
}

/**
 * [fromDate, toDate]（両端含む、YYYY-MM-DD）の範囲で予約可能な枠一覧を計算する。
 * 予約可能な枠だけを返す（満席・受付停止の枠は含まれない）。
 */
export async function computeAvailableSlots(fromDate: string, toDate: string): Promise<AvailableSlot[]> {
  const statuses = await computeSlotStatuses(fromDate, toDate);
  return statuses
    .filter((s) => s.state === 'open')
    .map(({ date, startTime, endTime, remaining }) => ({ date, startTime, endTime, remaining }));
}

/**
 * 予約作成の直前再検証用。指定した日付・開始時刻の枠がまだ指定人数分空いているかを判定する。
 * 依存データが取得できない場合は CalendarUnavailableError を投げる。
 */
export async function isSlotStillAvailable(
  date: string,
  startTime: string,
  partySize: number
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const slots = await computeAvailableSlots(date, date);
  const slot = slots.find(s => s.startTime === startTime);

  if (!slot) {
    return { ok: false, reason: 'この枠は現在予約できません（営業日未登録・休業日・満枠・受付時間外・開始時刻不正・枠停止のいずれかです）' };
  }
  if (slot.remaining < partySize) {
    return { ok: false, reason: `この枠の残り受け入れ可能人数は${slot.remaining}名です` };
  }
  return { ok: true };
}
