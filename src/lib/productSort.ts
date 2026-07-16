// 商品の並び替え用比較関数。ふりがな（nameReading）が入力されていればそれを優先し、
// 未入力の場合は商品名（name）で比較する（既存商品への後方互換フォールバック）。
export function compareByReading(
  a: { name: string; nameReading?: string },
  b: { name: string; nameReading?: string }
): number {
  const ka = a.nameReading?.trim() || a.name;
  const kb = b.nameReading?.trim() || b.name;
  return ka.localeCompare(kb, 'ja');
}

// 商品名からふりがなを機械的に補完できる場合のみ、ひらがなの読みを返す（それ以外は null）。
// 漢字が含まれる場合や、ひらがな・カタカナ以外の文字が混在する場合は変換できないため null。
// 呼び出し側（管理フォーム）は nameReading が未入力のときだけこの結果を採用し、手動入力を優先すること。
export function suggestReadingFromName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  // ひらがな・カタカナ・長音符・空白のみで構成されている場合だけ変換する
  if (!/^[ぁ-んァ-ヶー\s]+$/.test(trimmed)) return null;

  return trimmed.replace(/[ァ-ヶ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}
