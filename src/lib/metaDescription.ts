/**
 * meta description を組み立てるための共通処理。
 *
 * Sanityのテキストは Portable Text・プレーン文字列・古いオブジェクト形式が混在しており、
 * さらに管理画面から入力された本文には Markdown の装飾記号や箇条書き記号が混ざる。
 * そのままメタタグに出すと検索結果に記号が並ぶため、平文へ均してから使う。
 */

/** 日本語の検索結果で切られにくい長さ。これを超える分は落とす。 */
export const META_DESCRIPTION_MAX = 120

/** Portable Text・文字列・レガシーなオブジェクトのいずれからも平文を取り出す */
export function toPlainText(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value
      .map((block) => {
        const children = (block as { children?: unknown })?.children
        if (!Array.isArray(children)) return ''
        return children.map((child) => String((child as { text?: unknown })?.text ?? '')).join('')
      })
      .join(' ')
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .filter((v): v is string => typeof v === 'string')
      .join(' ')
  }
  return ''
}

/**
 * 装飾記号と改行を落として1行にする。
 * 中黒(・)は「水分・光」のように語の一部なので残す。
 */
export function normalizeDescription(value: unknown): string {
  return toPlainText(value)
    .replace(/\*+/g, '')
    .replace(/[▪■◆●•]️?\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 句点で自然に切れるならそこで、切れないなら文字数で切って「…」を付ける */
export function truncateDescription(text: string, max = META_DESCRIPTION_MAX): string {
  const chars = [...text]
  if (chars.length <= max) return text
  const head = chars.slice(0, max).join('')
  const lastStop = head.lastIndexOf('。')
  // 短く切られすぎるくらいなら「…」で終わらせるほうが情報量が多い
  if (lastStop >= Math.floor(max * 0.6)) return head.slice(0, lastStop + 1)
  return `${head}…`
}

/**
 * 空の要素を除いて連結し、上限まで詰めた meta description を返す。
 * ページ固有の情報（商品名・価格など）を先に渡すと、CMS側の説明文が
 * 他ページと同じ定型文でも description が重複しなくなる。
 */
export function buildMetaDescription(parts: unknown[], max = META_DESCRIPTION_MAX): string {
  const text = parts
    .map(normalizeDescription)
    .filter(Boolean)
    .join(' ')
  return truncateDescription(text, max)
}
