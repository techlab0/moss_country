import type { Metadata } from 'next'
import { getMossSpeciesBySlug } from '@/lib/sanity'
import { buildMetaDescription, normalizeDescription } from '@/lib/metaDescription'

interface MossGuideDetailLayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string }>
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
  // description フィールドは全件が空で、解説は basicInfo に入っている。
  // 名前を先頭に置くことで、basicInfo が未入力の苔でも説明文が他ページと重複しない。
  const description =
    normalizeDescription(species.seoDescription) ||
    buildMetaDescription([
      `${label}の特徴と育て方。`,
      species.basicInfo,
      '育成難易度・水分・光の条件まで、モスカントリー（MOSS COUNTRY）の苔図鑑がご紹介します。',
    ])

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
