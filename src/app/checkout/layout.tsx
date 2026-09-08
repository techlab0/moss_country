import type { Metadata } from 'next'

// 購入フローの途中ページなので検索結果には出さない。
// title を持たせるのはGA4のレポートでページを識別できるようにするため。
export const metadata: Metadata = {
  title: 'ご注文手続き',
  description: 'MOSS COUNTRYのご注文手続きページ。',
  robots: { index: false, follow: false },
}

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
