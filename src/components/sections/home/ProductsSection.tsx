'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CircularCarousel } from '@/components/ui/CircularCarousel';

export interface ProductsSectionItem {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  link: string;
}

interface ProductsSectionProps {
  items: ProductsSectionItem[];
}

export function ProductsSection({ items }: ProductsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const heading = headingRef.current;
    const carousel = carouselRef.current;
    if (!section) return;

    gsap.registerPlugin(ScrollTrigger);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = [heading, carousel].filter((el): el is HTMLDivElement => el !== null);

    const ctx = gsap.context(() => {
      if (reduceMotion) {
        gsap.set(targets, { y: 0, opacity: 1 });
        return;
      }

      // Aboutと同系の控えめな入場リビール（enterで一回だけ）
      gsap.set(targets, { y: 24, opacity: 0 });
      gsap.to(targets, {
        y: 0,
        opacity: 1,
        duration: 0.9,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 78%',
          once: true,
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      data-home-screen="regular"
      data-scene-id="products"
      className="relative py-4 sm:py-5 overflow-hidden"
    >
      {/* カルーセルの左右カードが不自然に切れないよう、Containerより広い専用ラッパーを使う */}
      <div data-scene-content className="relative z-10 w-full max-w-[84rem] mx-auto px-2 sm:px-4">
        <div ref={headingRef} className="text-center mb-2 sm:mb-3 px-4">
          <div className="mb-2 sm:mb-3">
            <span className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase text-emerald-300 font-medium">Our Products</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-[2.1rem] font-light text-white mb-3 sm:mb-4 leading-tight">
            <span className="text-emerald-400 font-bold">MOSS COUNTRY&apos;s</span>{' '}Work
          </h2>
          <div className="w-24 sm:w-32 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent mx-auto"></div>
        </div>

        <div ref={carouselRef}>
          <CircularCarousel items={items} />
        </div>
      </div>
    </section>
  );
}
