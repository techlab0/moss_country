import type { Metadata } from 'next'
import { getSiteMetadataSettings } from '@/lib/sanity'
import { resolvePageDescription } from '@/lib/pageSeo'

// 説明文は管理画面（サイト設定 > SEO・計測）で上書きできる。
// 未入力のあいだは src/lib/pageSeo.ts の既定値を使う。
export async function generateMetadata(): Promise<Metadata> {
  const { pageSeo } = await getSiteMetadataSettings()
  const description = resolvePageDescription('/store', pageSeo)

  return {
    title: '店舗情報・アクセス',
    description,
    keywords: ['店舗情報', 'アクセス', '札幌', '西区', '発寒', '営業時間', '電話番号', 'MOSS COUNTRY', 'moss country', 'mosscountry', 'モスカントリー', 'テラリウム専門店'],
    openGraph: {
      title: '店舗情報・アクセス | MOSS COUNTRY',
      description: '札幌市西区のテラリウム専門店。営業時間や詳細なアクセス情報をご案内。',
      url: 'https://mosscountry.com/store',
      images: [
        {
          url: '/images/og-store.jpg',
          width: 1200,
          height: 630,
          alt: 'MOSS COUNTRY 店舗',
        },
      ],
    },
    twitter: {
      title: '店舗情報・アクセス | MOSS COUNTRY',
      description: '札幌市西区のテラリウム専門店。営業時間や詳細なアクセス情報をご案内。',
    },
    alternates: {
      canonical: 'https://mosscountry.com/store',
    },
  }
}

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}