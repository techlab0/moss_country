// 管理画面の一覧でプラン名を短く見せるための整形。
//
// じゃらんのプラン名は販促文込みで100文字を超えることがあり
// （例: ＼実店舗オープン／【北海道/札幌】癒しの苔テラリウム作り体験 〜…〜当日持ち帰りOK♪♪＜女性・カップル…＞）、
// スマホの一覧では1件で画面が埋まってしまう。
//
// 経路（じゃらん / 手動 など）と（仮）は判断に使うので必ず残し、後ろだけを削る。
// 元の文字列は title 属性などで参照できるようにすること。

/** 「（仮）」「じゃらん / 」のような、必ず残したい接頭辞 */
const KEEP_PREFIX_RE = /^((?:（仮）)?(?:じゃらん \/ )?)/;

export const DEFAULT_PLAN_NAME_MAX = 24;

/**
 * 一覧表示用にプラン名を短くする。maxLength は接頭辞を除いた本体部分の上限。
 * 短ければそのまま返す。
 */
export function shortenPlanName(
  planName: string | null | undefined,
  maxLength: number = DEFAULT_PLAN_NAME_MAX
): string {
  if (!planName) return '';

  const prefix = planName.match(KEEP_PREFIX_RE)?.[1] ?? '';
  const body = planName.slice(prefix.length);

  if (body.length <= maxLength) return planName;

  return `${prefix}${body.slice(0, maxLength)}…`;
}
