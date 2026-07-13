'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Container } from '@/components/layout/Container';
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
      className="relative py-6 sm:py-8 overflow-hidden"
    >
      <Container className="relative z-10">
        <div ref={headingRef} className="text-center mb-3 sm:mb-4 px-4">
          <div className="mb-3 sm:mb-4">
            <span className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase text-emerald-300 font-medium">Our Products</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-white mb-4 sm:mb-5 leading-tight">
            <span className="text-emerald-400 font-bold">MOSS COUNTRY&apos;s</span>
            <br />
            Work
          </h2>
          <div className="w-24 sm:w-32 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent mx-auto"></div>
        </div>

        <div ref={carouselRef}>
          <CircularCarousel items={items} />
        </div>
      </Container>
    </section>
  );
}
