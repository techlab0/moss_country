import type { Metadata } from 'next'
import { getSiteMetadataSettings } from '@/lib/sanity'
import { resolvePageDescription } from '@/lib/pageSeo'

// 説明文は管理画面（サイト設定 > SEO・計測）で上書きできる。
// 未入力のあいだは src/lib/pageSeo.ts の既定値を使う。
export async function generateMetadata(): Promise<Metadata> {
  const { pageSeo } = await getSiteMetadataSettings()
  const description = resolvePageDescription('/workshop', pageSeo)

  return {
    // 文字列だけを指定すると配下セグメント（/workshop/mobile など）に
    // ルートの titleTemplate が継承されない。default はこのセグメント自身の値で、
    // ルート側のテンプレートが後から適用される。
    title: {
      default: 'ワークショップ',
      template: '%s | MOSS COUNTRY',
    },
    description,
    keywords: ['テラリウムワークショップ', '体験教室', 'テラリウム作り', '札幌', '北海道', '手作り体験', '親子参加', 'MOSS COUNTRY', 'moss country', 'mosscountry', 'モスカントリー'],
    openGraph: {
      title: 'ワークショップ | MOSS COUNTRY',
      description: '自分の手で作る、特別なテラリウム体験。職人が丁寧に指導します。',
      url: 'https://mosscountry.com/workshop',
      images: [
        {
          url: '/images/og-workshop.jpg',
          width: 1200,
          height: 630,
          alt: 'MOSS COUNTRY ワークショップ',
        },
      ],
    },
    twitter: {
      title: 'ワークショップ | MOSS COUNTRY',
      description: '自分の手で作る、特別なテラリウム体験。職人が丁寧に指導します。',
    },
    alternates: {
      canonical: 'https://mosscountry.com/workshop',
    },
  }
}

export default function WorkshopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}