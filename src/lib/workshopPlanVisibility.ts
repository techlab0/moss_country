export interface WorkshopPageTextOverride {
  key?: string;
  value?: string;
}

/**
 * ページ編集の6つの紹介カードから、新規予約で隠すsimpleWorkshop IDを求める。
 * 同じ予約プランが複数カードに設定された場合は、全カードが非表示のときだけ予約対象外にする。
 */
export function hiddenWorkshopPlanIdsFromOverrides(
  overrides: WorkshopPageTextOverride[]
): string[] {
  const values = new Map(overrides.map(item => [item.key, item.value]));
  const visibilityByPlan = new Map<string, boolean[]>();

  for (let number = 1; number <= 6; number += 1) {
    const planId = values.get(`plan${number}BookingPlanId`);
    if (!planId) continue;
    const states = visibilityByPlan.get(planId) || [];
    states.push(values.get(`plan${number}Visible`) !== 'false');
    visibilityByPlan.set(planId, states);
  }

  return [...visibilityByPlan.entries()]
    .filter(([, states]) => states.every(isVisible => !isVisible))
    .map(([planId]) => planId);
}
