import type { Metadata } from 'next'

export const metadata: Metadata = {
  // 文字列だけを指定すると配下の詳細ページにルートの titleTemplate が継承されない。
  // default はこのセグメント自身の値で、ルート側のテンプレートが後から適用される。
  title: {
    default: 'オンラインショップ',
    template: '%s | MOSS COUNTRY',
  },
  description: '北海道の自然から生まれた苔テラリウムのオンラインショップ。完成品テラリウム、苔、資材、ギフトまで。ひとつひとつ手作りの作品を全国へお届けします。',
  keywords: ['苔テラリウム', '通販', 'オンラインショップ', 'テラリウム販売', '苔', 'ギフト', '北海道', 'MOSS COUNTRY', 'moss country', 'mosscountry', 'モスカントリー'],
  openGraph: {
    title: 'オンラインショップ | MOSS COUNTRY',
    description: '北海道の自然から生まれた苔テラリウムを全国へお届けします。',
    url: 'https://mosscountry.com/shop',
  },
  twitter: {
    title: 'オンラインショップ | MOSS COUNTRY',
    description: '北海道の自然から生まれた苔テラリウムを全国へお届けします。',
  },
  alternates: {
    canonical: 'https://mosscountry.com/shop',
  },
}

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
