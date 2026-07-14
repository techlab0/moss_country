'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './HomeScrollJourney.module.css';

interface HomeScrollJourneyProps {
  children: ReactNode;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const easeInOutQuint = (value: number) => (
  value < 0.5
    ? 16 * value ** 5
    : 1 - ((-2 * value + 2) ** 5) / 2
);

export function HomeScrollJourney({ children }: HomeScrollJourneyProps) {
  const journeyRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const inputLockedRef = useRef(false);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const journey = journeyRef.current;
    const curtain = curtainRef.current;
    if (!journey || !curtain) return;

    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const getScreens = () => Array.from(
      journey.querySelectorAll<HTMLElement>('[data-home-screen]'),
    ).filter((screen) => screen.offsetParent !== null);

    const screenTop = (screen: HTMLElement) => screen.getBoundingClientRect().top + window.scrollY;

    const currentScreenIndex = (screens: HTMLElement[]) => {
      const marker = window.scrollY + 8;
      let index = 0;
      screens.forEach((screen, candidateIndex) => {
        if (screenTop(screen) <= marker) index = candidateIndex;
      });
      return index;
    };

    const unlockAfterGesture = () => {
      if (unlockTimerRef.current !== null) clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = setTimeout(() => {
        inputLockedRef.current = false;
      }, 220);
    };

    const resetCurtainAnimation = (direction: -1 | 1) => {
      curtain.dataset.direction = direction > 0 ? 'down' : 'up';
      curtain.dataset.transitioning = 'false';
      // Force a style flush so the same keyframes restart on consecutive moves.
      void curtain.offsetWidth;
      curtain.dataset.transitioning = 'true';
    };

    const animateViewport = (targetY: number, direction: -1 | 1) => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      const startY = window.scrollY;
      const distance = targetY - startY;
      const duration = reducedMotionQuery.matches ? 1 : 920;
      const startedAt = performance.now();

      inputLockedRef.current = true;
      if (!reducedMotionQuery.matches) resetCurtainAnimation(direction);

      const tick = (now: number) => {
        const progress = clamp((now - startedAt) / duration, 0, 1);
        window.scrollTo(0, startY + distance * easeInOutQuint(progress));

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(tick);
          return;
        }

        window.scrollTo(0, targetY);
        animationFrameRef.current = null;
        curtain.dataset.transitioning = 'false';
        unlockAfterGesture();
      };

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    const handleWheel = (event: WheelEvent) => {
      if (!desktopQuery.matches || event.defaultPrevented || Math.abs(event.deltaY) < 10) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (inputLockedRef.current) {
        event.preventDefault();
        unlockAfterGesture();
        return;
      }

      const screens = getScreens();
      if (screens.length < 2) return;

      const direction: -1 | 1 = event.deltaY > 0 ? 1 : -1;
      const activeIndex = currentScreenIndex(screens);
      const activeScreen = screens[activeIndex];
      const pinnedScreen = activeScreen.matches('[data-home-pinned]')
        ? activeScreen
        : activeScreen.querySelector<HTMLElement>('[data-home-pinned]');

      if (pinnedScreen?.dataset.pinReady === 'true') {
        const progress = Number(pinnedScreen.dataset.homeProgress ?? '0');
        const hasInternalScene = direction > 0 ? progress < 0.999 : progress > 0.001;
        if (hasInternalScene) return;
      }

      const targetIndex = activeIndex + direction;
      if (targetIndex < 0 || targetIndex >= screens.length) return;

      event.preventDefault();
      animateViewport(screenTop(screens[targetIndex]), direction);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      if (unlockTimerRef.current !== null) clearTimeout(unlockTimerRef.current);
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <div ref={journeyRef} className={styles.journey} data-home-journey>
      {children}
      <div
        ref={curtainRef}
        className={styles.transitionCurtain}
        data-transitioning="false"
        data-direction="down"
        aria-hidden="true"
      >
        <span className={styles.curtainMain} />
        <span className={styles.curtainAccent} />
      </div>
    </div>
  );
}
