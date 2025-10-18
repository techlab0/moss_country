'use client';

import React, { useState, useEffect } from 'react';
import { ImagePlaceholder } from './ImagePlaceholder';

interface FVSlide {
  id: string;
  image?: string;
  video?: string;
  title: string;
  subtitle: string;
  description: string;
}

interface FullScreenFVProps {
  slides: FVSlide[];
  autoPlay?: boolean;
  interval?: number;
}

export const FullScreenFV: React.FC<FullScreenFVProps> = ({
  slides,
  autoPlay = true,
  interval = 8000
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!autoPlay || slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, autoPlay, interval, slides.length]);

  const currentSlide = slides[currentIndex] || slides[0];

  return (
    <section 
      className="relative overflow-hidden"
      style={{ 
        height: '100vh',
        minHeight: '100vh',
        maxHeight: '100vh'
      }}
    >
      {/* Background Images/Videos with Natural Fade */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-[3000ms] ease-in-out ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {slide.video ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover scale-105"
              src={slide.video}
            />
          ) : (
            <ImagePlaceholder
              src={slide.image!}
              alt={slide.title}
              width={1920}
              height={1080}
              className="w-full h-full object-cover scale-105"
              priority={index === 0}
            />
          )}
          {/* Subtle movement effect */}
          <div 
            className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/30"
            style={{
              animation: index === currentIndex ? 'subtle-zoom 12s ease-out infinite' : 'none'
            }}
          />
        </div>
      ))}

      {/* Natural Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 z-10" />
      
      {/* Text Visibility Overlay */}
      <div className="absolute inset-0 z-15" />

      {/* Content */}
      <div 
        className="relative z-20 flex flex-col items-center text-white px-4"
        style={{ 
          height: '100vh',
          paddingTop: '15vh',    // 上部余白 15%
          paddingBottom: '15vh'  // 下部余白 15%（スクロールインジケーター用）
        }}
      >
        <div 
          className={`text-center max-w-6xl mx-auto flex flex-col justify-center h-full transform transition-all duration-2000 ease-out ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          {/* Animated Logo and Title */}
          <div className="mb-6 md:mb-8 lg:mb-12">
            {/* Logo */}
            <div 
              className="flex justify-center transform transition-all duration-1000 ease-out"
              style={{
                opacity: isLoaded ? 1 : 0,
                transform: isLoaded ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: '500ms',
                marginBottom: '8px' // 全デバイスで統一
              }}
            >
              <img 
                src="/images/moss_country_logo.avif" 
                alt="MOSS COUNTRY" 
                className="h-20 md:h-28 lg:h-32 w-auto drop-shadow-2xl"
              />
            </div>
            
            <div 
              className="text-xl md:text-3xl lg:text-4xl font-normal text-white transform transition-all duration-1000 ease-out drop-shadow-lg"
              style={{
                opacity: isLoaded ? 1 : 0,
                transform: isLoaded ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: '1200ms'
              }}
            >
              {currentSlide.subtitle}
            </div>
          </div>

          {/* Description */}
          <div 
            className="text-lg md:text-xl lg:text-2xl font-normal leading-relaxed text-white max-w-4xl mx-auto mb-8 md:mb-16 transform transition-all duration-1000 ease-out drop-shadow-lg"
            style={{
              opacity: isLoaded ? 1 : 0,
              transform: isLoaded ? 'translateY(0)' : 'translateY(20px)',
              transitionDelay: '1500ms'
            }}
          >
            {currentSlide.description}
          </div>

          {/* Floating CTA */}
          <div 
            className="transform transition-all duration-1000 ease-out mb-20 md:mb-16"
            style={{
              opacity: isLoaded ? 1 : 0,
              transform: isLoaded ? 'translateY(0)' : 'translateY(20px)',
              transitionDelay: '1800ms'
            }}
          >
            <a href="/workshop" className="group relative inline-block px-8 sm:px-12 md:px-16 py-4 sm:py-5 md:py-6 text-base sm:text-lg font-light bg-white/15 backdrop-blur-md border border-white/30 text-white rounded-full hover:bg-white/25 transition-all duration-500 transform hover:scale-105 shadow-2xl">
              <span className="relative z-10">体験する</span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400/0 via-emerald-400/15 to-emerald-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </a>
          </div>
        </div>
      </div>

      {/* Scroll Indicator - Leaf Icon */}
      <div 
        className="absolute left-1/2 transform -translate-x-1/2 z-20"
        style={{ bottom: '8vh' }} // 下部余白の中央に配置
      >
        <div className="flex flex-col items-center space-y-3 animate-bounce">
          <div className="text-white/70 text-xs md:text-sm font-light tracking-wider">SCROLL</div>
          <div className="w-px h-8 bg-gradient-to-b from-white/60 to-transparent" />
          {/* 植物アイコン（苔・葉っぱ風） */}
          <div className="relative transform hover:scale-110 transition-transform duration-300">
            <svg 
              className="w-6 h-6 md:w-8 md:h-8 text-white/80 animate-pulse" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Subtle Progress Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 right-8 z-20 flex space-x-2">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`w-12 h-1 rounded-full transition-all duration-500 ${
                index === currentIndex
                  ? 'bg-white'
                  : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};