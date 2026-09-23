export interface WorkshopCalendarEntry {
  date: string;
  type: string;
}

export interface WorkshopCalendarPolicy {
  businessDates: Set<string>;
  closedDates: Set<string>;
}

/**
 * カレンダー管理の登録内容から、ワークショップを受け付けられる日を判定する。
 * 営業日（open）の登録が必須で、同日に休業日（closed）があれば休業を優先する。
 * イベントだけの日や未登録日は営業日として扱わない。
 */
export function buildWorkshopCalendarPolicy(
  entries: readonly WorkshopCalendarEntry[]
): WorkshopCalendarPolicy {
  const businessDates = new Set<string>();
  const closedDates = new Set<string>();

  for (const entry of entries) {
    if (entry.type === 'open') businessDates.add(entry.date);
    if (entry.type === 'closed') closedDates.add(entry.date);
  }

  return { businessDates, closedDates };
}

export function isWorkshopBusinessDate(
  policy: WorkshopCalendarPolicy,
  date: string
): boolean {
  return policy.businessDates.has(date) && !policy.closedDates.has(date);
}

/**
 * 受付枠設定が保存されている場合は、そのON/OFFを営業日表示より優先する。
 * 未設定の場合だけ、従来どおり営業日カレンダーを既定値として使う。
 */
export function isWorkshopSlotEnabled(
  policy: WorkshopCalendarPolicy,
  date: string,
  override: boolean | undefined
): boolean {
  return override ?? isWorkshopBusinessDate(policy, date);
}
