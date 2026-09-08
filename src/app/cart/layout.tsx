import type { Metadata } from 'next'

// 購入フローの途中ページなので検索結果には出さない。
// title を持たせるのはGA4のレポートでページを識別できるようにするため。
export const metadata: Metadata = {
  title: 'ショッピングカート',
  description: 'MOSS COUNTRYのショッピングカート。',
  robots: { index: false, follow: false },
}

export default function CartLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
