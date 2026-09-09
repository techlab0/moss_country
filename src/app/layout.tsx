import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
import { GoogleTagManagerScript, GoogleTagManagerNoScript } from "@/components/analytics/GoogleTagManager";
import { getSiteMetadataSettings } from "@/lib/sanity";
import { mergeSeoSettings, buildRobotsDirectives } from "@/lib/seoSettings";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// メタデータは管理画面（サイト設定 > SEO・計測）の保存値から組み立てる。
// 特に robots は allowIndexing のトグルから導出する。以前はここで index:false を
// 直書きしていたため、管理画面でインデックスを許可してもメタタグがnoindexのままだった。
export async function generateMetadata(): Promise<Metadata> {
  const { allowIndexing, seo: savedSeo } = await getSiteMetadataSettings();
  const seo = mergeSeoSettings(savedSeo);

  return {
    metadataBase: new URL('https://mosscountry.com'),
    title: {
      default: seo.siteTitle,
      template: seo.titleTemplate,
    },
    description: seo.description,
    keywords: seo.keywords,
    authors: [{ name: 'MOSS COUNTRY' }],
    publisher: 'MOSS COUNTRY',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      title: seo.siteTitle,
      description: seo.ogDescription,
      url: 'https://mosscountry.com',
      siteName: 'MOSS COUNTRY',
      images: [
        {
          url: seo.ogImageUrl,
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
      title: seo.siteTitle,
      description: seo.ogDescription,
      images: [seo.ogImageUrl],
      creator: seo.twitterHandle,
      site: seo.twitterHandle,
    },
    robots: buildRobotsDirectives(allowIndexing),
    // 未設定ならキー自体を渡さず、ダミー値のメタタグを出力しない
    ...(seo.googleSiteVerification
      ? { verification: { google: seo.googleSiteVerification } }
      : {}),
    icons: {
      icon: [
        { url: '/images/mosscountry-favicon-circle-transparent.png', sizes: '1024x1024', type: 'image/png' },
        { url: '/favicon.ico', sizes: '16x16 24x24 32x32 48x48' },
      ],
      shortcut: '/favicon.ico',
      apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { seo: savedSeo } = await getSiteMetadataSettings();
  const { gtmContainerId } = mergeSeoSettings(savedSeo);

  return (
    <html lang="ja">
      <head>
        <GoogleTagManagerScript containerId={gtmContainerId} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleTagManagerNoScript containerId={gtmContainerId} />
        {/*
          JSON-LDはbodyに置く。手書きの<head>の中にinlineの<script>を置くと、
          ハイドレーション時にReactが同じscriptをheadへもう一度挿入することがあり、
          本番で構造化データが二重に出ていた（Search Consoleが同じ商品を2件検出）。
          JSON-LDは文書内のどこにあってもGoogleが読むため、bodyが安全。
        */}
        <StructuredData />
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
        <SpeedInsights />
      </body>
    </html>
  );
}
