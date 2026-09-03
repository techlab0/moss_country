import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'クラフトモスレンタル | Moss Country',
  description: '店舗・オフィス・イベント空間へ、クラフトモスを使った装飾作品をご提案します。',
  robots: { index: false, follow: false, nocache: true },
};

export default function CraftMossRentalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
