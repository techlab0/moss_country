import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ブログ・ニュース',
  description: 'MOSS COUNTRYからの最新情報、イベント出店のお知らせ、テラリウムのお手入れ方法、新商品のご紹介などをお届けします。苔テラリウムの世界をもっと深く知ることができるコンテンツが満載です。',
  keywords: ['テラリウム', 'ブログ', 'ニュース', 'お手入れ', 'イベント', '新商品', '苔テラリウム', 'MOSS COUNTRY', 'moss country', 'mosscountry', 'モスカウントリー', 'モスカントリー'],
  openGraph: {
    title: 'ブログ・ニュース | MOSS COUNTRY',
    description: 'テラリウムの世界をもっと深く。MOSS COUNTRYからの最新情報をお届けします。',
    url: 'https://moss-country.com/blog',
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
    canonical: 'https://moss-country.com/blog',
  },
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}