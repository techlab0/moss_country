import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '店舗情報・アクセス',
  description: '札幌市西区にあるMOSS COUNTRYの店舗情報とアクセス方法。営業時間、定休日、駐車場情報、電話番号など詳細情報をご案内。お気軽にお越しください。',
  keywords: ['店舗情報', 'アクセス', '札幌', '西区', '発寒', '営業時間', '電話番号', 'MOSS COUNTRY', 'moss country', 'mosscountry', 'モスカウントリー', 'モスカントリー', 'テラリウム専門店'],
  openGraph: {
    title: '店舗情報・アクセス | MOSS COUNTRY',
    description: '札幌市西区のテラリウム専門店。営業時間や詳細なアクセス情報をご案内。',
    url: 'https://moss-country.com/store',
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
    canonical: 'https://moss-country.com/store',
  },
}

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}