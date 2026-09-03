import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '法人向け 苔テラリウムレンタル | Moss Country',
  description: 'オフィス・店舗・ホテル・クリニックなどへ、定期メンテナンス付きの苔テラリウムをお届けします。',
  robots: { index: false, follow: false, nocache: true },
};

export default function RentalTerrariumLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
