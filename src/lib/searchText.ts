// 管理画面の検索ボックス用のテキスト正規化。
//
// レジ操作では変換前のひらがなのまま打ち込むことが多いため、「かさごけ」で「カサゴケ」に
// 一致させる必要がある。カタカナをひらがなへ寄せたうえで比較する。
// あわせてNFKC正規化で全角英数・半角カナの違いも吸収する（「ＷＳ」「ｶｻｺﾞｹ」も一致する）。
//
// 注意: 漢字は読みに変換できないため、「石」を「いし」で引くことはできない。
// それが必要になったら売上項目・商品に読み仮名のフィールドを持たせる必要がある。

/** カタカナ（ァ-ヶ）をひらがなに変換する。長音符「ー」はそのまま残す */
function katakanaToHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

/** 検索の比較に使う正規化済み文字列を返す */
export function normalizeForSearch(text: string): string {
  return katakanaToHiragana(text.normalize('NFKC').toLowerCase());
}

/** haystack が needle を含むか（ひらがな・カタカナ・全角半角の違いを無視して判定） */
export function includesNormalized(haystack: string, needle: string): boolean {
  return normalizeForSearch(haystack).includes(normalizeForSearch(needle));
}
