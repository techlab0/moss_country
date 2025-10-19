import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ワークショップ',
  description: '自分の手で作る、特別なテラリウム体験。MOSS COUNTRYの職人が丁寧に指導する本格的なテラリウム制作ワークショップ。初心者からお子様まで、どなたでもお楽しみいただけます。',
  keywords: ['テラリウムワークショップ', '体験教室', 'テラリウム作り', '札幌', '北海道', '手作り体験', '親子参加', 'MOSS COUNTRY', 'moss country', 'mosscountry', 'モスカントリー'],
  openGraph: {
    title: 'ワークショップ | MOSS COUNTRY',
    description: '自分の手で作る、特別なテラリウム体験。職人が丁寧に指導します。',
    url: 'https://moss-country.com/workshop',
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
    canonical: 'https://moss-country.com/workshop',
  },
}

export default function WorkshopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}