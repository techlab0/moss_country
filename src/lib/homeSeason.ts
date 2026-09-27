export type HomeSeason = 'spring' | 'summer' | 'autumn' | 'winter';

/** 日本で一般的な3か月区切りで、トップページの季節演出を決める。 */
export function getHomeSeason(month: number): HomeSeason {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError('月は1〜12で指定してください');
  }
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/** 閲覧時点の日本時間から季節を決める。 */
export function getCurrentHomeSeason(now: Date = new Date()): HomeSeason {
  const month = Number(new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    timeZone: 'Asia/Tokyo',
  }).format(now));
  return getHomeSeason(month);
}
