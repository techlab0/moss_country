'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Hero } from '@/components/sections/Hero';
import { LatestNews } from '@/components/sections/LatestNews';
import { AboutSection } from '@/components/sections/home/AboutSection';
import { ProductsSection } from '@/components/sections/home/ProductsSection';
import { WorkshopSection } from '@/components/sections/home/WorkshopSection';
import { CTASection } from '@/components/sections/home/CTASection';
import { HomeScrollJourney } from '@/components/sections/home/HomeScrollJourney';
import { defaultHeroImages } from '@/lib/imageUtils';
import { usePageContent } from '@/hooks/usePageContent';

const TerrariumExperience = dynamic(
  () => import('@/components/sections/TerrariumExperience').then((module) => module.TerrariumExperience),
  {
    ssr: false,
    loading: () => <section className="min-h-[100svh]" aria-hidden="true" />,
  },
);

// 統一バックドロップ用のSVGノイズ（feTurbulence）。外部リクエストなしのdata URI。
const NOISE_TEXTURE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export default function Home() {
  // 管理画面の「ページ編集」で保存された文言・画像を反映する（保存がなければ従来の文言）
  const { t, img, ov } = usePageContent('home');
  const [heroImageUrl, setHeroImageUrl] = useState<string>(defaultHeroImages['main'].src);

  // ヒーロー画像を取得（エラー時はデフォルト画像を維持）
  useEffect(() => {
    fetch(`/api/images/hero?page=main`)
      .then(res => res.json())
      .then((imageInfo) => {
        if (imageInfo?.src && !imageInfo.error) {
          setHeroImageUrl(imageInfo.src);
        }
      })
      .catch((error) => {
        console.warn('Failed to load hero image, using default:', error);
        // エラー時はデフォルト画像を維持（既に設定済み）
      });
  }, []);

  return (
    <div className="relative">
      {/* 統一バックドロップ:
          ページ全体をひとつの世界として繋ぐ、深い緑黒の縦グラデーション
          ＋ 淡い苔緑のグロー ＋ SVGノイズの微細な質感。
          -z-10のfixedなので、透過した各セクションの背後に常にこれが見える。 */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: [
              'radial-gradient(ellipse 85% 55% at 18% 10%, rgba(96, 134, 70, 0.05), transparent 62%)',
              'radial-gradient(ellipse 75% 50% at 84% 46%, rgba(96, 134, 70, 0.055), transparent 60%)',
              'radial-gradient(ellipse 95% 60% at 38% 90%, rgba(110, 148, 80, 0.045), transparent 64%)',
              'linear-gradient(180deg, #050807 0%, #0a0f0b 45%, #060a08 100%)',
            ].join(', '),
          }}
        />
        <div
          className="absolute inset-0"
          style={{ opacity: 0.035, backgroundImage: `url("${NOISE_TEXTURE}")` }}
        />
      </div>

      <HomeScrollJourney>
        {/* Hero Section */}
        <div data-home-screen="regular">
          <Hero heroImageUrl={heroImageUrl} />
        </div>

        <TerrariumExperience />

        {/* MOSS COUNTRYとは */}
        <AboutSection t={t} ov={ov} />

        {/* 新着情報 */}
        <LatestNews />

        {/* 商品カテゴリー概要 - 円形カルーセル */}
        <ProductsSection
          items={[
            {
              id: '1',
              title: t('carousel1Title'),
              description: t('carousel1Desc'),
              image: img('carousel1Image'),
              category: 'Terrarium',
              link: '/products'
            },
            {
              id: '2',
              title: t('carousel2Title'),
              description: t('carousel2Desc'),
              image: img('carousel2Image'),
              category: 'Moss Ball',
              link: '/products'
            },
            {
              id: '3',
              title: t('carousel3Title'),
              description: t('carousel3Desc'),
              image: img('carousel3Image'),
              category: 'Tools',
              link: '/products'
            },
            {
              id: '4',
              title: t('carousel4Title'),
              description: t('carousel4Desc'),
              image: img('carousel4Image'),
              category: 'Workshop',
              link: '/workshop'
            },
          ]}
        />

        {/* ワークショップ案内 */}
        <WorkshopSection t={t} ov={ov} img={img} />

        {/* ECサイト誘導CTA */}
        <CTASection ov={ov} />
      </HomeScrollJourney>
    </div>
  );
}
