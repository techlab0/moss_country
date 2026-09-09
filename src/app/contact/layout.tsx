import type { Metadata } from 'next'
import { getSiteMetadataSettings } from '@/lib/sanity'
import { resolvePageDescription } from '@/lib/pageSeo'

// 説明文は管理画面（サイト設定 > SEO・計測）で上書きできる。
// 未入力のあいだは src/lib/pageSeo.ts の既定値を使う。
export async function generateMetadata(): Promise<Metadata> {
  const { pageSeo } = await getSiteMetadataSettings()
  const description = resolvePageDescription('/contact', pageSeo)

  return {
    title: 'お問い合わせ',
    description,
    keywords: ['お問い合わせ', '相談', '法人', '出張依頼', '札幌', '北海道', 'MOSS COUNTRY', 'moss country', 'mosscountry', 'モスカントリー'],
    openGraph: {
      title: 'お問い合わせ | MOSS COUNTRY',
      description: '商品・ワークショップ・出張依頼など、お気軽にご連絡ください。',
      url: 'https://mosscountry.com/contact',
    },
    twitter: {
      title: 'お問い合わせ | MOSS COUNTRY',
      description: '商品・ワークショップ・出張依頼など、お気軽にご連絡ください。',
    },
    alternates: {
      canonical: 'https://mosscountry.com/contact',
    },
  }
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
