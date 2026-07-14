'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';

interface CTASectionProps {
  ov: (key: string) => string | undefined;
}

export function CTASection({ ov }: CTASectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const glow = glowRef.current;
    const buttons = buttonsRef.current;
    if (!section) return;

    gsap.registerPlugin(ScrollTrigger);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (reduceMotion) {
        if (glow) gsap.set(glow, { opacity: 1 });
        if (buttons) gsap.set(buttons, { y: 0, opacity: 1 });
        return;
      }

      // 静かなグロー：入場時にゆっくり浮かび上がる（統一バックドロップと喧嘩しないよう控えめに）
      if (glow) {
        gsap.set(glow, { opacity: 0 });
        gsap.to(glow, {
          opacity: 1,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 70%',
            once: true,
          },
        });
      }

      // ボタン：enterで浮上
      if (buttons) {
        gsap.set(buttons, { y: 28, opacity: 0 });
        gsap.to(buttons, {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: buttons,
            start: 'top 90%',
            once: true,
          },
        });
      }
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} data-home-screen="regular" data-scene-id="cta" className="py-16 sm:py-24 md:py-32 text-white relative overflow-hidden">
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(110, 145, 78, 0.14), transparent 68%)',
        }}
      />
      <div data-scene-content>
      <Container className="relative z-10">
        <div ref={cardRef} className="text-center rounded-2xl sm:rounded-3xl p-8 sm:p-12 md:p-16 mx-4 bg-stone-950/50 backdrop-blur-sm border border-emerald-400/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="mb-6 sm:mb-8">
            <span className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase text-emerald-200 font-medium">Get Started Today</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 sm:mb-8 leading-tight text-white">
            {ov('ctaTitle') !== undefined ? (
              <span className="whitespace-pre-line">{ov('ctaTitle')}</span>
            ) : (
              <>
                今すぐテラリウムを
                <br className="sm:hidden" />
                始めませんか？
              </>
            )}
          </h2>
          <div className="w-24 sm:w-32 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent mx-auto mb-6 sm:mb-8"></div>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl mb-8 sm:mb-10 md:mb-12 text-emerald-100 max-w-3xl mx-auto leading-relaxed font-light">
            {ov('ctaLead') !== undefined ? (
              <span className="whitespace-pre-line">{ov('ctaLead')}</span>
            ) : (
              <>
                オンラインストアでは、厳選されたテラリウムを豊富に取り揃えています。
                <br className="hidden sm:block" />
                全国配送対応で、あなたのもとへ小さな自然をお届けします。
              </>
            )}
          </p>
          <div ref={buttonsRef} className="flex flex-col gap-4 sm:gap-6 justify-center items-center sm:flex-row">
            <Link href="/products" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="px-8 sm:px-10 md:px-12 py-3 sm:py-4 text-base sm:text-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700 border-0 rounded-full transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
              >
                商品を見る
              </Button>
            </Link>
            <a href="/store" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="px-8 sm:px-10 md:px-12 py-3 sm:py-4 text-base sm:text-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700 border-0 rounded-full transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
              >
                アクセス
              </Button>
            </a>
          </div>
        </div>
      </Container>
      </div>
    </section>
  );
}
