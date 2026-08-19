// 文中の特定の語だけをリンクにするための分割。
//
// フッターの営業日表記（例:「不定休（カレンダーをご確認ください）」）は
// 管理画面から自由に編集できる文字列なので、文全体をリンクにも、決め打ちの
// 位置で切ることもできない。「カレンダー」という語が含まれていればそこだけを
// リンクにし、含まれていなければ元の文をそのまま表示する。

export interface LinkifyPart {
  text: string;
  isKeyword: boolean;
}

/**
 * text を keyword の出現位置で分割する。
 * keyword が含まれない場合は、元の文字列1つだけを返す（リンクは作られない）。
 */
export function linkifyKeyword(
  text: string | null | undefined,
  keyword: string
): LinkifyPart[] {
  if (!text) return [];
  if (!keyword || !text.includes(keyword)) return [{ text: text ?? '', isKeyword: false }];

  const parts: LinkifyPart[] = [];
  let rest = text;

  while (rest.includes(keyword)) {
    const index = rest.indexOf(keyword);
    if (index > 0) parts.push({ text: rest.slice(0, index), isKeyword: false });
    parts.push({ text: keyword, isKeyword: true });
    rest = rest.slice(index + keyword.length);
  }

  if (rest) parts.push({ text: rest, isKeyword: false });

  return parts;
}
