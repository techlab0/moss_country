import type { Metadata } from 'next'
import { getSiteMetadataSettings } from '@/lib/sanity'
import { resolvePageDescription } from '@/lib/pageSeo'

// 説明文は管理画面（サイト設定 > SEO・計測）で上書きできる。
// 未入力のあいだは src/lib/pageSeo.ts の既定値を使う。
export async function generateMetadata(): Promise<Metadata> {
  const { pageSeo } = await getSiteMetadataSettings()
  const description = resolvePageDescription('/blog', pageSeo)

  return {
    // 文字列だけを指定すると配下の詳細ページにルートの titleTemplate が継承されない。
    // default はこのセグメント自身の値で、ルート側のテンプレートが後から適用される。
    title: {
      default: 'ブログ・ニュース',
      template: '%s | MOSS COUNTRY',
    },
    description,
    keywords: ['テラリウム', 'ブログ', 'ニュース', 'お手入れ', 'イベント', '新商品', '苔テラリウム', 'MOSS COUNTRY', 'moss country', 'mosscountry', 'モスカントリー'],
    openGraph: {
      title: 'ブログ・ニュース | MOSS COUNTRY',
      description: 'テラリウムの世界をもっと深く。MOSS COUNTRYからの最新情報をお届けします。',
      url: 'https://mosscountry.com/blog',
      images: [
        {
          url: '/images/og-blog.jpg',
          width: 1200,
          height: 630,
          alt: 'MOSS COUNTRY ブログ',
        },
      ],
    },
    twitter: {
      title: 'ブログ・ニュース | MOSS COUNTRY',
      description: 'テラリウムの世界をもっと深く。MOSS COUNTRYからの最新情報をお届けします。',
    },
    alternates: {
      canonical: 'https://mosscountry.com/blog',
    },
  }
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}