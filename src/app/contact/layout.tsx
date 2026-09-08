import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'お問い合わせ',
  description: 'MOSS COUNTRYへのお問い合わせページ。商品・ワークショップ・出張依頼・法人のご相談など、お気軽にご連絡ください。',
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

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
