import type { Metadata } from 'next'
import { getSiteMetadataSettings } from '@/lib/sanity'
import { resolvePageDescription } from '@/lib/pageSeo'

// 説明文は管理画面（サイト設定 > SEO・計測）で上書きできる。
// 未入力のあいだは src/lib/pageSeo.ts の既定値を使う。
export async function generateMetadata(): Promise<Metadata> {
  const { pageSeo } = await getSiteMetadataSettings()
  const description = resolvePageDescription('/story', pageSeo)

  return {
    title: 'ブランドストーリー',
    description,
    keywords: ['ブランドストーリー', 'MOSS COUNTRYについて', '苔テラリウム専門店', '北海道', '札幌', 'こだわり', 'moss country', 'mosscountry', 'モスカントリー'],
    openGraph: {
      title: 'ブランドストーリー | MOSS COUNTRY',
      description: '小さな緑に込めた、大きな想い。MOSS COUNTRYの歩みをご紹介します。',
      url: 'https://mosscountry.com/story',
    },
    twitter: {
      title: 'ブランドストーリー | MOSS COUNTRY',
      description: '小さな緑に込めた、大きな想い。MOSS COUNTRYの歩みをご紹介します。',
    },
    alternates: {
      canonical: 'https://mosscountry.com/story',
    },
  }
}

export default function StoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
