import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '苔図鑑',
  description: 'テラリウムに使用される様々な苔の種類と特徴をご紹介。育成難易度、水分要求量、光の条件など、苔選びに役立つ詳細情報が満載です。苔の魅力的な世界を探検しましょう。',
  keywords: ['苔図鑑', '苔の種類', 'テラリウム苔', '苔の育て方', '蘚類', '苔類', 'ツノゴケ類', '苔の特徴', 'MOSS COUNTRY', 'moss country', 'mosscountry', 'モスカウントリー', 'モスカントリー'],
  openGraph: {
    title: '苔図鑑 | MOSS COUNTRY',
    description: '様々な苔の種類と特徴をご紹介。苔選びに役立つ詳細情報が満載です。',
    url: 'https://moss-country.com/moss-guide',
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
    canonical: 'https://moss-country.com/moss-guide',
  },
}

export default function MossGuideLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}