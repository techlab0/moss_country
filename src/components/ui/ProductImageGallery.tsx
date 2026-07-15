'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ProductImageWithFallback } from './ProductImageWithFallback';

export interface GalleryImage {
  full: string;
  thumb: string;
}

interface ProductImageGalleryProps {
  images: GalleryImage[];
  alt: string;
  fallbackSrc: string;
}

// スワイプ判定に使う最小の水平移動量(px)。これ未満は誤操作扱いで無視する。
const SWIPE_THRESHOLD = 40;

export function ProductImageGallery({ images, alt, fallbackSrc }: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const total = images.length;
  const hasMultiple = total > 1;
  const activeImage = images[activeIndex] ?? images[0];

  const goToPrev = () => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev + 1) % total);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const diff = endX - touchStartX.current;
    touchStartX.current = null;

    if (!hasMultiple || Math.abs(diff) < SWIPE_THRESHOLD) return;
    if (diff < 0) {
      goToNext();
    } else {
      goToPrev();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!hasMultiple) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToNext();
    }
  };

  // アクティブなサムネイルを帯の表示範囲に自動スクロール（縦スクロールは起こさない）
  useEffect(() => {
    const activeThumb = thumbRefs.current[activeIndex];
    activeThumb?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeIndex]);

  if (!activeImage) return null;

  return (
    <div className="space-y-3">
      <div
        className="relative aspect-square overflow-hidden rounded-lg bg-white/80 flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        tabIndex={hasMultiple ? 0 : -1}
      >
        <ProductImageWithFallback
          src={activeImage.full}
          alt={`${alt} ${activeIndex + 1}`}
          width={600}
          height={600}
          className="w-full h-full object-contain"
          fallbackSrc={fallbackSrc}
        />

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={goToPrev}
              aria-label="前の画像へ"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
            >
              <span aria-hidden="true" className="text-xl leading-none">‹</span>
            </button>
            <button
              type="button"
              onClick={goToNext}
              aria-label="次の画像へ"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
            >
              <span aria-hidden="true" className="text-xl leading-none">›</span>
            </button>

            <div className="absolute bottom-2 right-2 z-10 rounded-full bg-black/60 text-white text-xs px-2 py-0.5">
              {activeIndex + 1} / {total}
            </div>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              ref={(el) => {
                thumbRefs.current[index] = el;
              }}
              onClick={() => setActiveIndex(index)}
              aria-label={`${alt} ${index + 1}を表示`}
              aria-current={index === activeIndex}
              className={`w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 overflow-hidden rounded bg-white/80 flex items-center justify-center transition-opacity ${
                index === activeIndex ? 'ring-2 ring-moss-green opacity-100' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <ProductImageWithFallback
                src={image.thumb}
                alt={`${alt} ${index + 1}のサムネイル`}
                width={96}
                height={96}
                className="w-full h-full object-contain"
                fallbackSrc={fallbackSrc}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
