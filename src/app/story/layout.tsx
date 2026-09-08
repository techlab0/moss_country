import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ブランドストーリー',
  description: '小さな緑に込めた、大きな想い。北海道の自然に魅せられたMOSS COUNTRYが、苔テラリウム専門店として大切にしている価値観と歩みをご紹介します。',
  keywords: ['ブランドストーリー', 'MOSS COUNTRYについて', '苔テラリウム専門店', '北海道', '札幌', 'こだわり', 'moss country', 'mosscountry', 'モスカントリー'],
  openGraph: {
    title: 'ブランドストーリー | MOSS COUNTRY',
    description: '小さな緑に込めた、大きな想い。MOSS COUNTRYの歩みをご紹介します。',
    url: 'https://mosscountry.com/story',
  },
  twitter: {
    title: 'ブランドストーリー | MOSS COUNTRY',
    description: '小さな緑に込めた、大きな想い。MOSS COUNTRYの歩みをご紹介します。',
  },
  alternates: {
    canonical: 'https://mosscountry.com/story',
  },
}

export default function StoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
