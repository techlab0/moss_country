import type { Metadata } from 'next'
import { getSiteMetadataSettings } from '@/lib/sanity'
import { resolvePageDescription } from '@/lib/pageSeo'

// 説明文は管理画面（サイト設定 > SEO・計測）で上書きできる。
// 未入力のあいだは src/lib/pageSeo.ts の既定値を使う。
export async function generateMetadata(): Promise<Metadata> {
  const { pageSeo } = await getSiteMetadataSettings()
  const description = resolvePageDescription('/workshop/mobile', pageSeo)

  return {
    title: '出張ワークショップ',
    description,
    keywords: ['出張ワークショップ', '企業イベント', '団体', '福利厚生', 'テラリウム体験', '札幌', '北海道', 'MOSS COUNTRY', 'moss country', 'mosscountry', 'モスカントリー'],
    openGraph: {
      title: '出張ワークショップ | MOSS COUNTRY',
      description: '職人が会場までうかがう出張ワークショップ。人数や会場に合わせてご提案します。',
      url: 'https://mosscountry.com/workshop/mobile',
    },
    twitter: {
      title: '出張ワークショップ | MOSS COUNTRY',
      description: '職人が会場までうかがう出張ワークショップ。人数や会場に合わせてご提案します。',
    },
    alternates: {
      canonical: 'https://mosscountry.com/workshop/mobile',
    },
  }
}

export default function MobileWorkshopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
