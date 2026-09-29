import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'はじめてのテラリウム｜起源・魅力・楽しみ方',
  description:
    'テラリウムの起源、暮らしにもたらす魅力、人気の理由、おすすめしたい人、置き場所や始め方を苔テラリウム専門店Moss Countryがご案内します。',
  alternates: { canonical: '/terrarium-guide' },
  openGraph: {
    title: '小さな森を、暮らしの中へ。｜MOSS COUNTRY',
    description: 'テラリウムの歴史と魅力、置き場所、初めての選び方をご紹介します。',
    url: '/terrarium-guide',
    images: ['/images/terrarium-generated/terrarium-hero-key-030-v1.png'],
  },
};

export default function TerrariumGuideLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
