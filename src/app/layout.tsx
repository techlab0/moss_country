import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTopButton } from "@/components/ui/ScrollToTopButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://mosscountry.com'),
  title: {
    default: 'MOSS COUNTRY - 北海道の苔テラリウム専門店',
    template: '%s | MOSS COUNTRY',
  },
  description: '北海道初のカプセルテラリウム専門店。職人が手がける本格テラリウムと体験ワークショップを提供。小さなガラスの中に広がる、無限の自然の世界をお届けします。',
  keywords: ['テラリウム', '苔テラリウム', 'カプセルテラリウム', '札幌', '北海道', 'ワークショップ', '癒し', 'インテリア'],
  authors: [{ name: 'MOSS COUNTRY' }],
  openGraph: {
    title: 'MOSS COUNTRY - 北海道の苔テラリウム専門店',
    description: '小さなガラスの中に広がる、無限の自然の世界',
    url: 'https://mosscountry.com',
    siteName: 'MOSS COUNTRY',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'MOSS COUNTRY - 苔テラリウム',
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MOSS COUNTRY - 北海道の苔テラリウム専門店',
    description: '小さなガラスの中に広がる、無限の自然の世界',
    images: ['/images/og-image.jpg'],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header />
        <main>
          {children}
        </main>
        <Footer />
        <ScrollToTopButton />
      </body>
    </html>
  );
}
