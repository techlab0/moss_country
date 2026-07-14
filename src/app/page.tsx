'use client';

import React, { useState, useEffect } from 'react';
import { Hero } from '@/components/sections/Hero';
import { LatestNews } from '@/components/sections/LatestNews';
import { AboutSection } from '@/components/sections/home/AboutSection';
import { ProductsSection } from '@/components/sections/home/ProductsSection';
import { WorkshopSection } from '@/components/sections/home/WorkshopSection';
import { CTASection } from '@/components/sections/home/CTASection';
import { HomeScrollJourney } from '@/components/sections/home/HomeScrollJourney';
import { SceneBackdrop } from '@/components/sections/home/SceneBackdrop';
import { defaultHeroImages } from '@/lib/imageUtils';
import { usePageContent } from '@/hooks/usePageContent';

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
    <div className="relative bg-[#050505]">
      <HomeScrollJourney>
        {/* 全シーン共通の固定背景ステージ（黒ベース＋シーンごとのテラリウム画像） */}
        <SceneBackdrop />

        {/* Hero Section（relative必須: 固定背景ステージより前面に描画するため） */}
        <div data-home-screen="regular" className="relative">
          <Hero heroImageUrl={heroImageUrl} />
        </div>

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
