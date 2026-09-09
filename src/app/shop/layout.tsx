import type { Metadata } from 'next'
import { getSiteMetadataSettings } from '@/lib/sanity'
import { resolvePageDescription } from '@/lib/pageSeo'

// 説明文は管理画面（サイト設定 > SEO・計測）で上書きできる。
// 未入力のあいだは src/lib/pageSeo.ts の既定値を使う。
export async function generateMetadata(): Promise<Metadata> {
  const { pageSeo } = await getSiteMetadataSettings()
  const description = resolvePageDescription('/shop', pageSeo)

  return {
    // 文字列だけを指定すると配下の詳細ページにルートの titleTemplate が継承されない。
    // default はこのセグメント自身の値で、ルート側のテンプレートが後から適用される。
    title: {
      default: 'オンラインショップ',
      template: '%s | MOSS COUNTRY',
    },
    description,
    keywords: ['苔テラリウム', '通販', 'オンラインショップ', 'テラリウム販売', '苔', 'ギフト', '北海道', 'MOSS COUNTRY', 'moss country', 'mosscountry', 'モスカントリー'],
    openGraph: {
      title: 'オンラインショップ | MOSS COUNTRY',
      description: '北海道の自然から生まれた苔テラリウムを全国へお届けします。',
      url: 'https://mosscountry.com/shop',
    },
    twitter: {
      title: 'オンラインショップ | MOSS COUNTRY',
      description: '北海道の自然から生まれた苔テラリウムを全国へお届けします。',
    },
    alternates: {
      canonical: 'https://mosscountry.com/shop',
    },
  }
}

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
