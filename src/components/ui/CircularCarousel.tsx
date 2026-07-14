'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ImagePlaceholder } from './ImagePlaceholder';

interface CarouselItem {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  price?: string;
  link?: string;
}

interface CircularCarouselProps {
  items: CarouselItem[];
  className?: string;
}

export const CircularCarousel: React.FC<CircularCarouselProps> = ({
  items,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  // モバイル(<768px)は幅が足りず円弧が成立しないため、中央1枚のみの表示に切り替える
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const nextItem = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    // Clockwise: move right, items shift left
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setTimeout(() => {
      setDisplayIndex((prev) => (prev + 1) % items.length);
      setIsAnimating(false);
    }, 400);
  };

  const prevItem = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    // Counter-clockwise: move left, items shift right
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setTimeout(() => {
      setDisplayIndex((prev) => (prev - 1 + items.length) % items.length);
      setIsAnimating(false);
    }, 400);
  };

  const goToItem = (index: number) => {
    if (isAnimating || index === currentIndex) return;
    setIsAnimating(true);
    setCurrentIndex(index);
    setTimeout(() => {
      setDisplayIndex(index);
      setIsAnimating(false);
    }, 400);
  };

  // Calculate positions for horizontal-like arc arrangement
  const getItemStyle = (index: number) => {
    // モバイル: 中央の1枚だけをコンテナ中央に平置き。両脇は隠す（弧・縦オフセットなし）。
    // translate(-50%,-50%) でカードの高さに依存せず中央に固定する。
    if (isMobile) {
      if (index === currentIndex) {
        return {
          transform: 'translate(-50%, -50%) scale(1)',
          opacity: 1,
          zIndex: 10,
          transition: 'opacity 0.4s ease',
          visibility: 'visible' as const,
        };
      }
      return {
        transform: 'translate(-50%, -50%) scale(0.92)',
        opacity: 0,
        zIndex: 0,
        transition: 'opacity 0.35s ease',
        pointerEvents: 'none' as const,
        visibility: 'hidden' as const,
      };
    }

    const visibleRange = 2; // Show 2 items on each side of center (5 total)
    const relativeIndex = index - currentIndex;
    
    // Calculate the shortest path for normalization
    let normalizedIndex = relativeIndex;
    
    // Handle wrapping - find the shortest path
    if (relativeIndex > visibleRange) {
      // Check if going backwards is shorter
      const backwardDistance = relativeIndex - items.length;
      if (Math.abs(backwardDistance) < relativeIndex) {
        normalizedIndex = backwardDistance;
      } else {
        // If going backwards isn't shorter, hide the item
        return {
          transform: `translate(0px, 0px) scale(0)`,
          opacity: 0,
          zIndex: 0,
          transition: 'none',
          pointerEvents: 'none' as const,
          visibility: 'hidden' as const
        };
      }
    } else if (relativeIndex < -visibleRange) {
      // Check if going forwards is shorter
      const forwardDistance = relativeIndex + items.length;
      if (Math.abs(forwardDistance) < Math.abs(relativeIndex)) {
        normalizedIndex = forwardDistance;
      } else {
        // If going forwards isn't shorter, hide the item
        return {
          transform: `translate(0px, 0px) scale(0)`,
          opacity: 0,
          zIndex: 0,
          transition: 'none',
          pointerEvents: 'none' as const,
          visibility: 'hidden' as const
        };
      }
    }
    
    // Hide items outside visible range
    if (Math.abs(normalizedIndex) > visibleRange) {
      return {
        transform: `translate(0px, 0px) scale(0)`,
        opacity: 0,
        zIndex: 0,
        transition: 'none',
        pointerEvents: 'none' as const,
        visibility: 'hidden' as const
      };
    }
    
    // 円弧配置: 中央が最も高く手前、両脇へ向かって円周に沿って下がりながら小さくなる。
    // radius/maxAngle は横の広がり、縦の湾曲は arcDepth で別制御する。
    const radius = 540;
    const maxAngle = 50;
    const angle = (normalizedIndex / visibleRange) * maxAngle;

    // Calculate scale and opacity based on distance from center
    const distanceFromCenter = Math.abs(normalizedIndex);
    const scale = normalizedIndex === 0 ? 1.06 : Math.max(0.64, 1 - (distanceFromCenter * 0.22));
    
    // Smooth opacity transition
    let opacity = 1;
    if (normalizedIndex === 0) {
      opacity = 1; // Center item is always fully visible
    } else if (distanceFromCenter === visibleRange) {
      opacity = 0.2; // More fade for edge items
    } else if (distanceFromCenter === 1) {
      opacity = 0.7; // Semi-visible for adjacent items
    }
    
    // Calculate x, y positions for centered arc with additional spacing
    const radian = (angle * Math.PI) / 180;
    const cardSpacing = 46; // Additional horizontal spacing between cards
    const cardWidth = 256; // Card width in pixels (w-64 = 256px)
    const x = Math.sin(radian) * radius + (normalizedIndex * cardSpacing) - (cardWidth / 2); // Adjust center position
    // 縦位置は横半径と切り離し、円弧の落差(arcDepth)で制御する。
    // 中央(0)を最も高く、両脇へ向かって円周に沿って沈める。上限キャップは設けない
    // （設けると下端が一直線に揃って弧が潰れる）。上方に少し寄せて全体をコンテナ中央へ。
    const arcDepth = 300;
    const y = (1 - Math.cos(radian)) * arcDepth - 60;
    
    return {
      transform: `translate(${x}px, ${y}px) scale(${scale})`,
      opacity,
      zIndex: normalizedIndex === 0 ? 10 : Math.max(1, 5 - distanceFromCenter),
      transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      filter: normalizedIndex === 0 ? 'brightness(1.1) blur(0px)' : distanceFromCenter >= 2 ? 'blur(1px)' : 'blur(0px)',
      visibility: 'visible' as const
    };
  };

  const currentItem = items[displayIndex];

  return (
    <div className={`relative py-4 sm:py-6 [@media(max-height:720px)]:py-2 ${className}`}>
      {/* Navigation Buttons（カードと重ならないよう外縁に配置） */}
      <button
        onClick={prevItem}
        disabled={isAnimating}
        aria-label="前の作品へ"
        className="absolute left-0 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-stone-950/50 backdrop-blur-sm border border-emerald-400/20 flex items-center justify-center text-emerald-200 hover:bg-stone-900/70 hover:border-emerald-400/45 transition-all duration-300 disabled:opacity-50 group"
      >
        <svg className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={nextItem}
        disabled={isAnimating}
        aria-label="次の作品へ"
        className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-stone-950/50 backdrop-blur-sm border border-emerald-400/20 flex items-center justify-center text-emerald-200 hover:bg-stone-900/70 hover:border-emerald-400/45 transition-all duration-300 disabled:opacity-50 group"
      >
        <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Arc Arrangement Container。
          PC: 円弧の落差が収まる高さを確保（縦は切り取らない）。
          モバイル: 中央1枚ぶんの高さに収め、直下の説明文と重ならないようYもクリップする。 */}
      <div className="relative h-[22rem] [@media(max-height:720px)]:h-[20rem] overflow-clip md:h-[30rem] md:[@media(max-height:720px)]:h-[22rem] md:overflow-x-clip md:overflow-y-visible flex items-center justify-center mx-auto max-w-[76rem]">
        <div className="relative w-full h-full flex items-center justify-center">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={getItemStyle(index)}
              onClick={() => goToItem(index)}
            >
              {/* Card */}
              <div className="w-64 h-80 [@media(max-height:720px)]:h-72 bg-stone-950/60 backdrop-blur-md rounded-3xl border border-emerald-400/20 overflow-hidden shadow-2xl hover:shadow-3xl transition-shadow duration-300 relative">
                {/* Image */}
                <div className="h-48 [@media(max-height:720px)]:h-40 overflow-hidden">
                  <ImagePlaceholder
                    src={item.image}
                    alt={item.title}
                    width={400}
                    height={300}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                  />
                </div>
                
                {/* Frosted Glass Content */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-stone-950/80 backdrop-blur-xl border-t border-emerald-400/20 p-4 text-white shadow-lg">
                  <div className="text-xs uppercase tracking-wider text-emerald-300 mb-1">
                    {item.category}
                  </div>
                  <h3 className="text-lg font-light mb-2 leading-tight">
                    {item.title}
                  </h3>
                  {item.price && (
                    <div className="text-sm font-medium text-emerald-300">
                      {item.price}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Item Details */}
      <div className="mt-4 md:mt-5 [@media(max-height:720px)]:mt-2 text-center text-white">
        <div className="max-w-2xl mx-auto">
          <div
            className={`transform transition-all duration-500 ${
              isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
            }`}
          >
            <div className="text-sm uppercase tracking-wider text-emerald-300 mb-2">
              {currentItem.category}
            </div>
            <h2 className="text-2xl md:text-3xl font-light mb-3 leading-tight text-white">
              {currentItem.title}
            </h2>
            <p className="text-base md:text-lg text-gray-200 leading-relaxed mb-4 [@media(max-height:720px)]:mb-3 line-clamp-2 px-4">
              {currentItem.description}
            </p>
            {currentItem.price && (
              <div className="text-2xl font-light text-emerald-300 mb-5">
                {currentItem.price}
              </div>
            )}
            {currentItem.link ? (
              <Link href={currentItem.link} className="inline-block px-10 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all duration-300 transform hover:scale-105">
                詳しく見る
              </Link>
            ) : (
              <button className="px-10 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all duration-300 transform hover:scale-105">
                詳しく見る
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center space-x-3 mt-4 [@media(max-height:720px)]:mt-2">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => goToItem(index)}
            disabled={isAnimating}
            aria-label={`作品 ${index + 1} を表示`}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'bg-emerald-400 scale-125'
                : 'bg-stone-400/40 hover:bg-stone-400/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
};