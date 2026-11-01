import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '苔風景写真集 | MOSS COUNTRY',
  description: '森、庭園、水辺に広がる苔の景色を集めたMOSS COUNTRYの写真集です。',
  alternates: {
    canonical: 'https://mosscountry.com/moss-gallery',
  },
};

export default function MossGalleryLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
