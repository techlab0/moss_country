'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Hero } from '@/components/sections/Hero';
import { LatestNews } from '@/components/sections/LatestNews';
import { AboutSection } from '@/components/sections/home/AboutSection';
import { ProductShowcase } from '@/components/sections/home/ProductShowcase';
import { WorkshopSection } from '@/components/sections/home/WorkshopSection';
import { CTASection } from '@/components/sections/home/CTASection';
import { defaultHeroImages, defaultBackgroundImages } from '@/lib/imageUtils';
import { usePageContent } from '@/hooks/usePageContent';

const TerrariumExperience = dynamic(
  () => import('@/components/sections/TerrariumExperience').then((module) => module.TerrariumExperience),
  {
    ssr: false,
    loading: () => <section className="min-h-[100svh] bg-[#030706]" aria-hidden="true" />,
  },
);

export default function Home() {
  // 管理画面の「ページ編集」で保存された文言・画像を反映する（保存がなければ従来の文言）
  const { t, img, ov } = usePageContent('home');
  const [isMobile, setIsMobile] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string>(defaultHeroImages['main'].src);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>(defaultBackgroundImages['main'].src);
  const [backgroundImageMobileUrl, setBackgroundImageMobileUrl] = useState<string>(defaultBackgroundImages['main-mobile'].src);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // 背景画像を取得（エラー時はデフォルト画像を維持）
  useEffect(() => {
    // PC用背景画像
    fetch(`/api/images/background?page=main&mobile=false`)
      .then(res => res.json())
      .then((imageInfo) => {
        if (imageInfo?.src && !imageInfo.error) {
          setBackgroundImageUrl(imageInfo.src);
        }
      })
      .catch((error) => {
        console.warn('Failed to load background image (PC), using default:', error);
        // エラー時はデフォルト画像を維持（既に設定済み）
      });
    // モバイル用背景画像
    fetch(`/api/images/background?page=main&mobile=true`)
      .then(res => res.json())
      .then((imageInfo) => {
        if (imageInfo?.src && !imageInfo.error) {
          setBackgroundImageMobileUrl(imageInfo.src);
        }
      })
      .catch((error) => {
        console.warn('Failed to load background image (Mobile), using default:', error);
        // エラー時はデフォルト画像を維持（既に設定済み）
      });
  }, []);

  return (
    <div
      className="relative"
      style={{
        backgroundImage: isMobile
          ? `url('${backgroundImageMobileUrl}')`
          : `url('${backgroundImageUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Unified Background Overlay */}
      <div className="absolute inset-0 bg-emerald-900/20" />
      {/* Hero Section */}
      <Hero heroImageUrl={heroImageUrl} />

      <TerrariumExperience />

      {/* MOSS COUNTRYとは */}
      <AboutSection t={t} ov={ov} />

      {/* 新着情報 */}
      <LatestNews />

      {/* 商品ショーケース */}
      <ProductShowcase
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
    </div>
  );
}
