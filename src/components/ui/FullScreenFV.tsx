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
    <section className="relative h-screen overflow-hidden">
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
      <div className="relative z-20 h-full flex flex-col justify-center items-center text-white px-4">
        <div 
          className={`text-center max-w-6xl mx-auto transform transition-all duration-2000 ease-out ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          {/* Animated Logo and Title */}
          <div className="mb-12">
            {/* Logo */}
            <div 
              className="flex justify-center mb-8 transform transition-all duration-1000 ease-out"
              style={{
                opacity: isLoaded ? 1 : 0,
                transform: isLoaded ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: '500ms'
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
            className="text-lg md:text-xl lg:text-2xl font-normal leading-relaxed text-white max-w-4xl mx-auto mb-16 transform transition-all duration-1000 ease-out drop-shadow-lg"
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
            className="transform transition-all duration-1000 ease-out mb-16"
            style={{
              opacity: isLoaded ? 1 : 0,
              transform: isLoaded ? 'translateY(0)' : 'translateY(20px)',
              transitionDelay: '1800ms'
            }}
          >
            <a href="/workshop" className="group relative inline-block px-16 py-6 text-lg font-light bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full hover:bg-white/20 transition-all duration-500 transform hover:scale-105 shadow-2xl">
              <span className="relative z-10">体験する</span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </a>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-20">
        <div className="flex flex-col items-center space-y-4 animate-bounce">
          <div className="w-px h-16 bg-gradient-to-b from-white/60 to-transparent" />
          <div className="w-6 h-10 border-2 border-white/60 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/80 rounded-full mt-2 animate-pulse" />
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