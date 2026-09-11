'use client';

import { useEffect, type ReactNode } from 'react';
import Lenis from 'lenis';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './HomeScrollJourney.module.css';

interface HomeScrollJourneyProps {
  children: ReactNode;
}

export function HomeScrollJourney({ children }: HomeScrollJourneyProps) {
  useEffect(() => {
    const desktopPointer = window.matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!desktopPointer.matches || reducedMotion.matches) return;

    // 区画へ吸着させず、操作した距離に応じて進む自由スクロールのまま、
    // PCの強いホイール入力だけを抑えて滑らかに追従させる。
    const lenis = new Lenis({
      smoothWheel: true,
      syncTouch: false,
      lerp: 0.12,
      wheelMultiplier: 0.65,
      stopInertiaOnNavigate: true,
    });
    const unsubscribe = lenis.on('scroll', () => ScrollTrigger.update());
    let animationFrameId = 0;

    const update = (time: number) => {
      lenis.raf(time);
      animationFrameId = window.requestAnimationFrame(update);
    };
    animationFrameId = window.requestAnimationFrame(update);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      unsubscribe();
      lenis.destroy();
    };
  }, []);

  return (
    <div className={styles.journey} data-home-journey>
      {children}
    </div>
  );
}
