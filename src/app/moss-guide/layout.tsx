import type { Metadata } from 'next'
import { getSiteMetadataSettings } from '@/lib/sanity'
import { resolvePageDescription } from '@/lib/pageSeo'

// 説明文は管理画面（サイト設定 > SEO・計測）で上書きできる。
// 未入力のあいだは src/lib/pageSeo.ts の既定値を使う。
export async function generateMetadata(): Promise<Metadata> {
  const { pageSeo } = await getSiteMetadataSettings()
  const description = resolvePageDescription('/moss-guide', pageSeo)

  return {
    // 文字列だけを指定すると配下の詳細ページにルートの titleTemplate が継承されない。
    // default はこのセグメント自身の値で、ルート側のテンプレートが後から適用される。
    title: {
      default: '苔図鑑',
      template: '%s | MOSS COUNTRY',
    },
    description,
    keywords: ['苔図鑑', '苔の種類', 'テラリウム苔', '苔の育て方', '蘚類', '苔類', 'ツノゴケ類', '苔の特徴', 'MOSS COUNTRY', 'moss country', 'mosscountry', 'モスカントリー'],
    openGraph: {
      title: '苔図鑑 | MOSS COUNTRY',
      description: '様々な苔の種類と特徴をご紹介。苔選びに役立つ詳細情報が満載です。',
      url: 'https://mosscountry.com/moss-guide',
      images: [
        {
          url: '/images/og-moss-guide.jpg',
          width: 1200,
          height: 630,
          alt: 'MOSS COUNTRY 苔図鑑',
        },
      ],
    },
    twitter: {
      title: '苔図鑑 | MOSS COUNTRY',
      description: '様々な苔の種類と特徴をご紹介。苔選びに役立つ詳細情報が満載です。',
    },
    alternates: {
      canonical: 'https://mosscountry.com/moss-guide',
    },
  }
}

export default function MossGuideLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}