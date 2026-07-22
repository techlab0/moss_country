// ワークショップ予約の空き枠計算ロジック（共通化）。
//
// GET /api/workshop/availability（一覧表示用）と POST /api/workshop/book
// （予約直前の再検証用）の両方から使う。ロジックを1箇所に集約することで、
// 「一覧では空き扱いだったのに予約時の再検証だけ判定がズレる」事故を防ぐ。
//
// 安全側の設計: 休業日データ・既存予約・Googleカレンダーのbusy時間帯のいずれかが
// 取得できない場合、空配列を返さずに CalendarUnavailableError を投げる。
// 「確認できない＝空いている」という誤判定を避けるため。

import { supabaseAdmin } from './supabase';
import { getBusyIntervals } from './googleCalendar';
import { getBookingsInDateRange } from './workshopBookings';
import {
  SLOT_START_TIMES,
  CAPACITY_PER_SLOT,
  jstDateTimeToIso,
  addMinutesToIso,
  addMinutesToTimeString,
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

/** 休業日・既存予約・Googleカレンダーのいずれかが確認できない場合に投げる例外。呼び出し元は503相当として扱うこと。 */
export class CalendarUnavailableError extends Error {}

function intervalsOverlap(aStartIso: string, aEndIso: string, bStartIso: string, bEndIso: string): boolean {
  const aStart = new Date(aStartIso).getTime();
  const aEnd = new Date(aEndIso).getTime();
  const bStart = new Date(bStartIso).getTime();
  const bEnd = new Date(bEndIso).getTime();
  return aStart < bEnd && bStart < aEnd;
}

/**
 * 指定期間内の 'closed'（休業日）日付一覧を取得する。
 * 取得に失敗した場合は CalendarUnavailableError を投げる。
 */
export async function getClosedDates(fromDate: string, toDate: string): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin
    .from('calendar_events')
    .select('date')
    .eq('type', 'closed')
    .gte('date', fromDate)
    .lte('date', toDate);

  if (error) {
    console.error('休業日カレンダーの取得に失敗しました:', error);
    throw new CalendarUnavailableError('休業日カレンダーを確認できません');
  }

  return new Set((data || []).map((row: { date: string }) => row.date));
}

/**
 * [fromDate, toDate]（両端含む、YYYY-MM-DD）の範囲で、指定した所要時間(分)における
 * 予約可能な枠一覧を計算する。
 *
 * 依存データ（休業日 / 既存予約 / Googleカレンダーのbusy時間帯）のいずれかが取得できない場合は
 * CalendarUnavailableError を投げる（呼び出し元で503等に倒すこと）。
 */
export async function computeAvailableSlots(
  fromDate: string,
  toDate: string,
  durationMin: number
): Promise<AvailableSlot[]> {
  if (fromDate > toDate) return [];

  let closedDates: Set<string>;
  let existingBookings: Awaited<ReturnType<typeof getBookingsInDateRange>>;
  let busyIntervals: Awaited<ReturnType<typeof getBusyIntervals>>;

  try {
    const rangeStartIso = jstDateTimeToIso(fromDate, '00:00');
    const rangeEndIso = addMinutesToIso(jstDateTimeToIso(toDate, '00:00'), 24 * 60);
    [closedDates, existingBookings, busyIntervals] = await Promise.all([
      getClosedDates(fromDate, toDate),
      getBookingsInDateRange(fromDate, toDate),
      getBusyIntervals(rangeStartIso, rangeEndIso),
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

  const dates = listDatesInRange(fromDate, toDate);
  const available: AvailableSlot[] = [];

  for (const date of dates) {
    if (!isBookableWeekday(date)) continue;
    if (closedDates.has(date)) continue;

    for (const slotStart of SLOT_START_TIMES) {
      const slotStartIso = jstDateTimeToIso(date, slotStart);
      const slotEndIso = addMinutesToIso(slotStartIso, durationMin);

      if (!isWithinLeadTime(slotStartIso)) continue;

      const overlapsBusy = busyIntervals.some(b => intervalsOverlap(slotStartIso, slotEndIso, b.start, b.end));
      if (overlapsBusy) continue;

      const booked = partySizeBySlot.get(`${date}|${slotStart}`) || 0;
      const remaining = CAPACITY_PER_SLOT - booked;
      if (remaining <= 0) continue;

      available.push({
        date,
        startTime: slotStart,
        endTime: addMinutesToTimeString(slotStart, durationMin),
        remaining,
      });
    }
  }

  return available;
}

/**
 * 予約作成の直前再検証用。指定した日付・開始時刻の枠がまだ指定人数分空いているかを判定する。
 * 依存データが取得できない場合は CalendarUnavailableError を投げる。
 */
export async function isSlotStillAvailable(
  date: string,
  startTime: string,
  durationMin: number,
  partySize: number
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const slots = await computeAvailableSlots(date, date, durationMin);
  const slot = slots.find(s => s.startTime === startTime);

  if (!slot) {
    return { ok: false, reason: 'この枠は現在予約できません（休業日・満枠・受付時間外・開始時刻不正のいずれかです）' };
  }
  if (slot.remaining < partySize) {
    return { ok: false, reason: `この枠の残り受け入れ可能人数は${slot.remaining}名です` };
  }
  return { ok: true };
}
