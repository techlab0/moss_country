import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '出張ワークショップ',
  description: 'MOSS COUNTRYの職人が会場までうかがう出張ワークショップ。企業イベント、学校、地域イベント、福利厚生など、人数や会場に合わせてご提案します。',
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

export default function MobileWorkshopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
