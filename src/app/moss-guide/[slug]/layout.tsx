import type { Metadata } from 'next'
import { getMossSpeciesBySlug } from '@/lib/sanity'

interface MossGuideDetailLayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

// Portable Text から冒頭の平文を取り出す。ブロック構造が想定外でも落とさない。
function extractPlainText(blocks: unknown, maxLength = 120): string {
  if (!Array.isArray(blocks)) return ''
  const text = blocks
    .map((block) => {
      const children = (block as { children?: unknown })?.children
      if (!Array.isArray(children)) return ''
      return children.map((child) => String((child as { text?: unknown })?.text ?? '')).join('')
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

export async function generateMetadata({ params }: MossGuideDetailLayoutProps): Promise<Metadata> {
  const { slug } = await params
  const species = await getMossSpeciesBySlug(slug)

  // 取得に失敗したときは苔図鑑の共通タイトルにフォールバックする（page.tsx側で notFound になる）。
  if (!species) {
    return { title: '苔図鑑' }
  }

  const commonName = species.commonNames?.[0]
  const label = commonName && commonName !== species.name ? `${species.name}（${commonName}）` : species.name
  const description =
    extractPlainText(species.description) ||
    `${species.name}の特徴、育成難易度、水分・光の条件など、テラリウムでの育て方をご紹介します。`

  return {
    title: label,
    description,
    openGraph: {
      title: `${label} | MOSS COUNTRY 苔図鑑`,
      description,
      url: `https://mosscountry.com/moss-guide/${slug}`,
    },
    twitter: {
      title: `${label} | MOSS COUNTRY 苔図鑑`,
      description,
    },
    alternates: {
      canonical: `https://mosscountry.com/moss-guide/${slug}`,
    },
  }
}

export default function MossGuideDetailLayout({ children }: MossGuideDetailLayoutProps) {
  return children
}
