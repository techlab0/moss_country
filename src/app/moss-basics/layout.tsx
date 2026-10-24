import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '苔を知る | MOSS COUNTRY',
  description: '苔の体のつくり、育ち方、自然の中での役割、暮らしの中で楽しむための基本をわかりやすく紹介します。',
};

export default function MossBasicsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
