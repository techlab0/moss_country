// ワークショップ予約バックエンドの既定設定値。
//
// 現時点では管理画面から変更する仕組みはなく、すべてこのファイル内の定数として持つ。
// 将来的に管理画面（サイト設定）から変更できるようにする場合は、ここをSupabaseの
// app_settings 等から読み込む形に差し替える想定（既存の siteSettingsDefaults.ts / appSettings.ts
// と同様の構成にする想定でコメントを残している）。

import type { SimpleWorkshop } from '@/types/sanity';

export const TIME_ZONE = 'Asia/Tokyo';

/**
 * 受付枠（JST、24時間表記）。じゃらん掲載の2枠と同一。
 * 予約はプランの所要時間に関わらず枠全体（start〜end）を占有する
 * （＝枠の空き判定はプランのdurationではなくこの固定windowで行う）。
 * 枠ごとのON/OFFは管理画面（受付枠設定）から workshop_slot_overrides テーブル経由で変更する
 * （src/lib/workshopSlotOverrides.ts 参照）。
 */
export const WORKSHOP_SLOTS: ReadonlyArray<{ start: string; end: string }> = [
  { start: '11:30', end: '13:30' },
  { start: '15:00', end: '17:00' },
];

/** 1枠あたりの最大受け入れ人数（同一日・同一開始時刻の予約party_size合計がこれ以上なら満枠扱い） */
export const CAPACITY_PER_SLOT = 4;

/** simpleWorkshop側にduration指定が無い/パースできない場合のデフォルト所要時間（分） */
export const DEFAULT_DURATION_MIN = 120;

/** 予約受付曜日（0=日, 1=月, ..., 6=土）。既定は全曜日を対象にし、休業日はSupabase calendar_events(type='closed')側で制御する */
export const BOOKABLE_WEEKDAYS: readonly number[] = [0, 1, 2, 3, 4, 5, 6];

/** 何日先まで予約可能か */
export const ADVANCE_DAYS = 60;

/** 予約受付の締切（開始時刻の何時間前まで受け付けるか） */
export const MIN_LEAD_HOURS = 24;

const JST_OFFSET_MINUTES = 9 * 60;

/**
 * simpleWorkshop.duration（Sanity側の自由記述文字列。想定される表記例:
 * "120分" "2時間" "1時間30分" など）から所要分数を推測する。
 *
 * 注意（要確認事項）: 現状の getSimpleWorkshops クエリはこれまで duration フィールドを
 * 取得していなかった（型定義 SimpleWorkshop.duration は存在するが未使用だった）ため、
 * 本実装に合わせてクエリにも duration を追加した。ただし実際のSanity documentに
 * durationがどんな書式で入力されているか（あるいはそもそも運用されていないか）は
 * 実データを確認できていない。ここでは代表的な表記パターンのみに対応し、
 * パースできない・未設定の場合は安全側で DEFAULT_DURATION_MIN にフォールバックする。
 *
 * 注意: 受付枠がWORKSHOP_SLOTSの固定windowになったため、空き枠計算（予約可否判定）では
 * この関数の戻り値は使わない。表示用（プラン一覧のおおよその所要時間表示等）にのみ残している。
 */
export function resolveWorkshopDurationMinutes(plan?: Pick<SimpleWorkshop, 'duration'> | null): number {
  const raw = plan?.duration?.trim();
  if (!raw) return DEFAULT_DURATION_MIN;

  const hourMinMatch = raw.match(/(\d+)\s*時間\s*(?:(\d+)\s*分)?/);
  if (hourMinMatch) {
    const hours = parseInt(hourMinMatch[1], 10);
    const mins = hourMinMatch[2] ? parseInt(hourMinMatch[2], 10) : 0;
    const total = hours * 60 + mins;
    return total > 0 ? total : DEFAULT_DURATION_MIN;
  }

  const minOnlyMatch = raw.match(/(\d+)\s*分/);
  if (minOnlyMatch) {
    const total = parseInt(minOnlyMatch[1], 10);
    return total > 0 ? total : DEFAULT_DURATION_MIN;
  }

  const numOnly = raw.match(/^(\d+)$/);
  if (numOnly) {
    const total = parseInt(numOnly[1], 10);
    return total > 0 ? total : DEFAULT_DURATION_MIN;
  }

  return DEFAULT_DURATION_MIN;
}

/** JSTの日付(YYYY-MM-DD)+時刻(HH:MM)からRFC3339形式（+09:00オフセット）のISO文字列を作る */
export function jstDateTimeToIso(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}:00+09:00`;
}

/** +09:00オフセット付きのミリ秒エポックをRFC3339(JSTオフセット)文字列に変換する内部ヘルパー */
function msToJstIso(ms: number): string {
  const jstMs = ms + JST_OFFSET_MINUTES * 60000;
  const d = new Date(jstMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+09:00`
  );
}

/** RFC3339(JSTオフセット付き)のISO文字列に分を加算し、同じ形式で返す */
export function addMinutesToIso(iso: string, minutes: number): string {
  const ms = new Date(iso).getTime() + minutes * 60000;
  return msToJstIso(ms);
}

/** "HH:MM" 形式の時刻文字列に分を加算した "HH:MM" を返す（日跨ぎは考慮しない簡易ヘルパー） */
export function addMinutesToTimeString(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

/** 指定日(YYYY-MM-DD, JST暦日)が予約受付対象の曜日かどうか */
export function isBookableWeekday(dateStr: string): boolean {
  // dateStrはJSTの暦日。日付部分だけをUTCとしてDate化しても曜日の算出結果はズレない
  // （getUTCDayは年月日成分のみに依存するため、実時刻のタイムゾーンオフセットとは無関係）。
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return BOOKABLE_WEEKDAYS.includes(day);
}

/** 開始からADVANCE_DAYS日後までの日付(YYYY-MM-DD)を列挙する */
export function listDatesInRange(fromStr: string, toStr: string): string[] {
  const dates: string[] = [];
  const from = new Date(`${fromStr}T00:00:00Z`);
  const to = new Date(`${toStr}T00:00:00Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return dates;
  }
  const cursor = new Date(from);
  while (cursor <= to) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/** 今日(JST暦日, YYYY-MM-DD)を返す */
export function todayJstDateStr(): string {
  return new Date(Date.now() + JST_OFFSET_MINUTES * 60000).toISOString().slice(0, 10);
}

/** 今日からADVANCE_DAYS日後(JST暦日, YYYY-MM-DD)を返す */
export function maxBookableDateStr(): string {
  const d = new Date(Date.now() + JST_OFFSET_MINUTES * 60000);
  d.setUTCDate(d.getUTCDate() + ADVANCE_DAYS);
  return d.toISOString().slice(0, 10);
}

/** 指定の枠開始時刻(JST ISO)が MIN_LEAD_HOURS の受付締切より後（＝まだ受付可能）かどうか */
export function isWithinLeadTime(slotStartIso: string): boolean {
  const slotStartMs = new Date(slotStartIso).getTime();
  return slotStartMs - Date.now() >= MIN_LEAD_HOURS * 3600 * 1000;
}
