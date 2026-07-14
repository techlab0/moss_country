'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';

interface WorkshopSectionProps {
  t: (key: string) => string;
  ov: (key: string) => string | undefined;
  img: (key: string) => string;
}

export function WorkshopSection({ t, ov, img }: WorkshopSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const textBlockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const imageWrap = imageWrapRef.current;
    const textBlock = textBlockRef.current;
    if (!section) return;

    gsap.registerPlugin(ScrollTrigger);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (reduceMotion) {
        if (imageWrap) gsap.set(imageWrap, { scale: 1.15, y: 0 });
        if (textBlock) gsap.set(textBlock, { clipPath: 'inset(0% 0% 0% 0%)' });
        return;
      }

      // 画像：控えめな視差（scrubで-6%〜6%のY移動）
      if (imageWrap) {
        gsap.set(imageWrap, { scale: 1.15 });
        gsap.fromTo(
          imageWrap,
          { yPercent: -6 },
          {
            yPercent: 6,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          },
        );
      }

      // テキストブロック：左からのマスクリビール（一度だけ）
      if (textBlock) {
        gsap.set(textBlock, { clipPath: 'inset(0% 100% 0% 0%)' });
        gsap.to(textBlock, {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: textBlock,
            start: 'top 82%',
            once: true,
          },
        });
      }
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} data-home-screen="regular" data-scene-id="workshop" className="relative py-16 sm:py-24 md:py-32 overflow-hidden">
      <div data-scene-content>
      <Container className="relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 md:gap-16 items-center">
          <div
            ref={textBlockRef}
            className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 relative overflow-hidden bg-stone-950/50 backdrop-blur-sm border border-emerald-400/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] order-2 md:order-1"
          >
            <div className="mb-4 sm:mb-6 relative z-10">
              <span className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase text-emerald-300 font-medium">Workshop Experience</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light text-white mb-3 sm:mb-4 leading-tight sm:leading-normal relative z-10">
              {t('workshopTitle')}
              <br />
              <span className="text-emerald-300 font-bold">{t('workshopTitleAccent')}</span>
            </h2>
            <div className="w-16 h-px bg-gradient-to-r from-emerald-400/70 to-transparent mb-4 sm:mb-5 relative z-10"></div>
            <p className="text-sm sm:text-base md:text-lg text-gray-200 mb-4 sm:mb-6 leading-relaxed font-light relative z-10">
              {ov('workshopLead') !== undefined ? (
                <span className="whitespace-pre-line">{ov('workshopLead')}</span>
              ) : (
                <>
                  経験豊富な職人が丁寧に指導する、本格的なテラリウム制作体験。
                  <br className="hidden sm:block" />
                  初心者の方でも安心して参加できるよう、基礎から応用まで幅広いコースをご用意しています。
                </>
              )}
            </p>
            <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 relative z-10">
              {(['workshopPoint1', 'workshopPoint2', 'workshopPoint3', 'workshopPoint4'] as const).map((key) => (
                <li key={key} className="flex items-center text-gray-200">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-emerald-400 mr-3 sm:mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm sm:text-base">{t(key)}</span>
                </li>
              ))}
            </ul>
            <a href="/workshop">
              <Button
                variant="primary"
                size="lg"
                className="px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base font-light bg-emerald-600 hover:bg-emerald-700 border-0 rounded-full transition-all duration-300 transform hover:scale-105 relative z-10 w-full sm:w-auto"
              >
                ワークショップ詳細
              </Button>
            </a>
          </div>
          <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 h-64 sm:h-80 md:h-96 relative overflow-hidden bg-stone-950/40 border border-emerald-400/10 order-1 md:order-2">
            <div ref={imageWrapRef} className="absolute inset-0">
              <ImagePlaceholder
                src={img('workshopImage')}
                alt="テラリウム制作の様子 - 職人による丁寧な指導"
                width={800}
                height={600}
                className="w-full h-full object-cover rounded-xl sm:rounded-2xl"
              />
            </div>
          </div>
        </div>
      </Container>
      </div>
    </section>
  );
}
