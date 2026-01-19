'use client';

import React, { useEffect, useState } from 'react';
import { FullScreenFV } from '@/components/ui/FullScreenFV';
import { getHeroImage } from '@/lib/imageUtils';

interface HeroProps {
  heroImageUrl?: string;
  heroImageAlt?: string;
}

export const Hero: React.FC<HeroProps> = ({ heroImageUrl, heroImageAlt }) => {
  const [imageUrl, setImageUrl] = useState<string>('/images/misc/moss01.jpeg');
  const [imageAlt, setImageAlt] = useState<string>('MOSS COUNTRY');

  useEffect(() => {
    // サーバーサイドで取得した画像URLがある場合はそれを使用
    if (heroImageUrl) {
      setImageUrl(heroImageUrl);
      if (heroImageAlt) {
        setImageAlt(heroImageAlt);
      }
    } else {
      // クライアントサイドで取得を試みる（フォールバック）
      getHeroImage('main').then((imageInfo) => {
        setImageUrl(imageInfo.src);
        setImageAlt(imageInfo.alt);
      }).catch(() => {
        // エラー時はデフォルト画像を使用
        setImageUrl('/images/misc/moss01.jpeg');
      });
    }
  }, [heroImageUrl, heroImageAlt]);

  const fvSlides = [
    {
      id: '1',
      image: imageUrl,
      title: 'MOSS COUNTRY',
      subtitle: '苔のある生活をあなたに。\n生活に『癒し』と『和み』を。',
      description: '苔の緑に心をゆだねて、穏やかなひとときを。\nMoss Countryが癒しの空間をお届けします。'
    }
  ];

  return (
    <FullScreenFV 
      slides={fvSlides}
      autoPlay={true}
      interval={8000}
    />
  );
};