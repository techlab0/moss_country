import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HideOnAdmin } from "@/components/layout/HideOnAdmin";
import { ScrollToTopButton } from "@/components/ui/ScrollToTopButton";
import { CartProvider } from "@/contexts/CartContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PerformanceInit } from "@/components/PerformanceInit";
import { InventoryNotifications } from "@/components/ui/InventoryNotifications";
import { PageLoadingProvider } from "@/components/providers/PageLoadingProvider";
import { StructuredData } from "@/components/seo/StructuredData";

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
  description: 'MOSS COUNTRY（モスカントリー）は北海道初のカプセルテラリウム専門店。職人が手がける本格テラリウムと体験ワークショップを提供。小さなガラスの中に広がる、無限の自然の世界をお届けします。',
  keywords: ['テラリウム', '苔テラリウム', 'カプセルテラリウム', '札幌', '北海道', 'ワークショップ', '癒し', 'インテリア', 'MOSS COUNTRY', 'moss country', 'mosscountry', 'モスカントリー', '苔図鑑'],
  authors: [{ name: 'MOSS COUNTRY' }],
  publisher: 'MOSS COUNTRY',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
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
    creator: '@MossCountry',
    site: '@MossCountry',
  },
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-site-verification-code', // 後で実際の値に置き換え
  },
  icons: {
    icon: [
      { url: '/images/mosscountry-favicon-terrarium.png', sizes: '1024x1024', type: 'image/png' },
      { url: '/favicon.ico', sizes: '16x16 24x24 32x32 48x48' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <StructuredData />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <PageLoadingProvider maxLoadingTime={5000} minLoadingTime={800}>
            <CartProvider>
              <HideOnAdmin>
                <Header />
              </HideOnAdmin>
              <main>
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
              <HideOnAdmin>
                <Footer />
                <ScrollToTopButton />
              </HideOnAdmin>
              <PerformanceInit />
              <InventoryNotifications />
            </CartProvider>
          </PageLoadingProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
