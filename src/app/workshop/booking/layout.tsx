import type { Metadata } from 'next'

// 予約フローの途中ページなので検索結果には出さない。
// title を持たせるのはGA4のレポートでページを識別できるようにするため。
export const metadata: Metadata = {
  title: 'ワークショップ予約',
  description: 'MOSS COUNTRYのワークショップ予約ページ。',
  robots: { index: false, follow: false },
}

export default function WorkshopBookingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
