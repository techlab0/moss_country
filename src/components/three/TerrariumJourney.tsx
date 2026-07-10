'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Shippori_Mincho } from 'next/font/google';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { TerrariumFallback } from './TerrariumFallback';
import { clamp, smoothstep } from './terrariumUtils';
import type { ProgressRef } from './TerrariumScene';

const TerrariumScene = dynamic(
  () => import('./TerrariumScene').then((mod) => mod.TerrariumScene),
  { ssr: false }
);

const shipporiMincho = Shippori_Mincho({
  weight: ['400', '500'],
  subsets: ['latin'],
  preload: false,
  display: 'swap',
});

/** 縦書きで現れる5語と、進行度上での担当区間 */
const STAGE_WORDS: { word: string; start: number; end: number }[] = [
  { word: 'うつわ', start: 0.0, end: 0.15 },
  { word: '大地', start: 0.15, end: 0.35 },
  { word: 'いし', start: 0.35, end: 0.5 },
  { word: 'こけ', start: 0.5, end: 0.75 },
  { word: '森になる', start: 0.75, end: 0.9 },
];

function wordVisibility(progress: number, start: number, end: number) {
  const width = end - start;
  const fade = Math.min(width * 0.35, 0.06);
  const fadeIn = smoothstep(start, start + fade, progress);
  const fadeOut = 1 - smoothstep(end - fade, end, progress);
  return clamp(Math.min(fadeIn, fadeOut), 0, 1);
}

function detectWebglSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export function TerrariumJourney() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<ProgressRef>({ value: 0 });
  const lastReportedProgress = useRef(0);

  const [progress, setProgress] = useState(0);
  const [shouldMount3D, setShouldMount3D] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [ready, setReady] = useState(false);

  // 環境判定（reduced-motion / WebGL 非対応ならフォールバック）
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const webglOk = detectWebglSupport();
    setUseFallback(reduceMotion || !webglOk);
    setIsMobile(window.innerWidth < 768);
    setReady(true);

    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ビューポートに近づいたら3D本体を遅延マウント
  useEffect(() => {
    if (useFallback || !ready) return;
    const el = sectionRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldMount3D(true);
            io.disconnect();
          }
        });
      },
      { rootMargin: '50% 0px 50% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [useFallback, ready]);

  // Lenis + GSAP ScrollTrigger（このコンポーネントのマウント中だけ全ページに適用）
  useEffect(() => {
    if (useFallback || !ready) return;

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        progressRef.current.value = self.progress;
        if (Math.abs(self.progress - lastReportedProgress.current) > 0.0015) {
          lastReportedProgress.current = self.progress;
          setProgress(self.progress);
        }
      },
    });

    return () => {
      trigger.kill();
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, [useFallback, ready]);

  if (!ready) {
    // 初回判定が終わるまでは高さのゆらぎを避けるため何も描画しない
    return <div ref={sectionRef} className="h-screen w-full bg-[#0c0f0d]" />;
  }

  if (useFallback) {
    return <TerrariumFallback fontClassName={shipporiMincho.className} />;
  }

  const finalOpacity = smoothstep(0.9, 0.97, progress);

  return (
    <section ref={sectionRef} className="relative" style={{ height: '400vh' }}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-30 h-32 bg-gradient-to-b from-black to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-32 bg-gradient-to-t from-black to-transparent"
        aria-hidden
      />
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#0c0f0d]">
        {shouldMount3D && <TerrariumScene progressRef={progressRef} isMobile={isMobile} />}

        <div className={`absolute inset-0 z-20 ${shipporiMincho.className}`}>
          {STAGE_WORDS.map(({ word, start, end }) => {
            const visibility = wordVisibility(progress, start, end);
            if (visibility <= 0.001) return null;
            return (
              <div
                key={word}
                className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 sm:right-16 md:right-24"
                style={{
                  writingMode: 'vertical-rl',
                  opacity: visibility,
                  filter: `blur(${(1 - visibility) * 10}px)`,
                  color: '#e8ede9',
                  letterSpacing: '0.35em',
                  transition: 'filter 0.05s linear',
                }}
              >
                <span className="text-3xl font-medium sm:text-5xl md:text-6xl">{word}</span>
              </div>
            );
          })}

          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
            style={{ opacity: finalOpacity }}
          >
            <p
              className="text-lg leading-relaxed sm:text-2xl md:text-3xl"
              style={{ color: '#e8ede9', letterSpacing: '0.15em' }}
            >
              小さなガラスの中に、無限の自然。
            </p>
            <p className="mt-8 text-xs sm:text-sm" style={{ color: '#9fb0a4', letterSpacing: '0.35em' }}>
              MOSS COUNTRY
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
