// ワークショップ受付枠のON/OFFオーバーライド管理（Supabase / service role専用）。
//
// 既定は「営業日（休業日でない）なら枠OPEN」。workshop_slot_overrides テーブルには
// 管理者が明示的に変更した枠だけが入る（is_open=false で閉鎖、trueで再開）。
// 再開は行削除でも表現できるが、実装はシンプルにupsertへ統一する
// （is_open=trueの行が残っても「既定と同じ＝影響なし」なので害はない）。
//
// 空き枠計算（workshopAvailability.computeAvailableSlots）の根拠データとして使うため、
// 他の読み取り系（管理画面の一覧表示等）とは異なり、失敗時に空配列を返さず例外をthrowする。
// 「オーバーライドを確認できない＝すべてOPEN」と誤判定させないため
// （呼び出し元でCalendarUnavailableError相当に倒すこと）。

import { supabaseAdmin } from './supabase';

export interface WorkshopSlotOverride {
  date: string; // YYYY-MM-DD (JST暦日)
  startTime: string; // HH:MM (WORKSHOP_SLOTSのstartと一致)
  isOpen: boolean;
}

interface WorkshopSlotOverrideRow {
  date: string;
  start_time: string;
  is_open: boolean;
}

/**
 * 指定期間（[fromDate, toDate]、両端含む、YYYY-MM-DD）のオーバーライド一覧を取得する。
 * 取得に失敗した場合は例外をthrowする。
 */
export async function getOverridesInRange(fromDate: string, toDate: string): Promise<WorkshopSlotOverride[]> {
  const { data, error } = await supabaseAdmin
    .from('workshop_slot_overrides')
    .select('date, start_time, is_open')
    .gte('date', fromDate)
    .lte('date', toDate);

  if (error) {
    console.error(`ワークショップ受付枠オーバーライドの取得に失敗しました (${fromDate} ~ ${toDate}):`, error);
    throw error;
  }

  return (data || []).map((row: WorkshopSlotOverrideRow) => ({
    date: row.date,
    startTime: row.start_time,
    isOpen: row.is_open,
  }));
}

/**
 * 枠のON/OFFを設定する（upsert）。既存の同一(date, start_time)があれば更新する。
 * 失敗時はログを残したうえで例外をthrowする。
 */
export async function setOverride(date: string, startTime: string, isOpen: boolean): Promise<void> {
  const { error } = await supabaseAdmin
    .from('workshop_slot_overrides')
    .upsert(
      { date, start_time: startTime, is_open: isOpen, updated_at: new Date().toISOString() },
      { onConflict: 'date,start_time' }
    );

  if (error) {
    console.error(`ワークショップ受付枠オーバーライドの保存に失敗しました (${date} ${startTime}):`, error);
    throw error;
  }
}
