'use client';

import React, { useState } from 'react';
import { ImagePlaceholder } from './ImagePlaceholder';

interface CarouselItem {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  price?: string;
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
  const [isAnimating, setIsAnimating] = useState(false);

  const nextItem = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    // Clockwise: move right, items shift left
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setTimeout(() => setIsAnimating(false), 800);
  };

  const prevItem = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    // Counter-clockwise: move left, items shift right
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setTimeout(() => setIsAnimating(false), 800);
  };

  const goToItem = (index: number) => {
    if (isAnimating || index === currentIndex) return;
    setIsAnimating(true);
    setCurrentIndex(index);
    setTimeout(() => setIsAnimating(false), 800);
  };

  // Calculate positions for horizontal-like arc arrangement
  const getItemStyle = (index: number) => {
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
    
    const radius = 600; // Larger radius for more spacing
    const maxAngle = 50; // Wider angle spread for more spacing
    const angle = (normalizedIndex / visibleRange) * maxAngle;
    
    // Calculate scale and opacity based on distance from center
    const distanceFromCenter = Math.abs(normalizedIndex);
    const scale = normalizedIndex === 0 ? 1.0 : Math.max(0.7, 1 - (distanceFromCenter * 0.2));
    
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
    const cardSpacing = 80; // Additional horizontal spacing between cards
    const cardWidth = 256; // Card width in pixels (w-64 = 256px)
    const x = Math.sin(radian) * radius + (normalizedIndex * cardSpacing) - (cardWidth / 2); // Adjust center position
    const y = -Math.cos(radian) * radius + radius - 150; // Adjusted for better centering
    
    return {
      transform: `translate(${x}px, ${y}px) scale(${scale})`,
      opacity,
      zIndex: normalizedIndex === 0 ? 10 : Math.max(1, 5 - distanceFromCenter),
      transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      filter: normalizedIndex === 0 ? 'brightness(1.1) blur(0px)' : distanceFromCenter >= 2 ? 'blur(1px)' : 'blur(0px)',
      visibility: 'visible' as const
    };
  };

  const currentItem = items[currentIndex];

  return (
    <div className={`relative py-12 ${className}`}>
      {/* Navigation Buttons */}
      <button
        onClick={prevItem}
        disabled={isAnimating}
        className="absolute left-8 top-1/2 transform -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-amber-100/20 backdrop-blur-md border border-amber-800/30 flex items-center justify-center text-amber-800 hover:bg-amber-100/30 transition-all duration-300 disabled:opacity-50 group"
      >
        <svg className="w-8 h-8 transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={nextItem}
        disabled={isAnimating}
        className="absolute right-8 top-1/2 transform -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-amber-100/20 backdrop-blur-md border border-amber-800/30 flex items-center justify-center text-amber-800 hover:bg-amber-100/30 transition-all duration-300 disabled:opacity-50 group"
      >
        <svg className="w-8 h-8 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Arc Arrangement Container */}
      <div className="relative h-96 flex items-center justify-center overflow-hidden mx-auto max-w-6xl">
        <div className="relative w-full h-full flex items-center justify-center">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={getItemStyle(index)}
              onClick={() => goToItem(index)}
            >
              {/* Card */}
              <div className="w-64 h-80 bg-amber-50/20 backdrop-blur-md rounded-3xl border border-amber-800/30 overflow-hidden shadow-2xl hover:shadow-3xl transition-shadow duration-300 relative">
                {/* Image */}
                <div className="h-48 overflow-hidden">
                  <ImagePlaceholder
                    src={item.image}
                    alt={item.title}
                    width={400}
                    height={300}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                  />
                </div>
                
                {/* Frosted Glass Content */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-amber-900/80 backdrop-blur-xl border-t border-amber-800/50 p-4 text-white shadow-lg">
                  <div className="text-xs uppercase tracking-wider text-amber-200 mb-1">
                    {item.category}
                  </div>
                  <h3 className="text-lg font-light mb-2 leading-tight">
                    {item.title}
                  </h3>
                  {item.price && (
                    <div className="text-sm font-medium text-amber-200">
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
      <div className="mt-16 text-center text-white">
        <div className="max-w-2xl mx-auto">
          <div 
            className={`transform transition-all duration-500 ${
              isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
            }`}
          >
            <div className="text-sm uppercase tracking-wider text-emerald-300 mb-4">
              {currentItem.category}
            </div>
            <h2 className="text-4xl md:text-5xl font-light mb-6 leading-tight text-white">
              {currentItem.title}
            </h2>
            <p className="text-xl text-gray-200 leading-relaxed mb-8">
              {currentItem.description}
            </p>
            {currentItem.price && (
              <div className="text-3xl font-light text-emerald-300 mb-8">
                {currentItem.price}
              </div>
            )}
            <button className="px-12 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all duration-300 transform hover:scale-105">
              詳しく見る
            </button>
          </div>
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center space-x-3 mt-12">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => goToItem(index)}
            disabled={isAnimating}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'bg-amber-600 scale-125'
                : 'bg-stone-400/40 hover:bg-stone-400/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
};