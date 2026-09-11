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

// 1画面ぶんの移動にかける時間。HomeScrollJourney.module.css のカーテン演出と必ず揃える。
const SCREEN_TRAVEL_MS = 420;
// トラックパッドの慣性を同じ1操作として扱うため、最後のホイール入力から待つ時間。
const GESTURE_QUIET_MS = 180;

export function HomeScrollJourney({ children }: HomeScrollJourneyProps) {
  const journeyRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const inputLockedRef = useRef(false);
  const gestureActiveRef = useRef(false);
  const gestureEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // 1回のホイール／トラックパッド操作で複数画面進まないよう、慣性入力が静まるまで
    // 同じジェスチャーとして扱う。画面移動のロックとは分け、操作が止まれば必ず解除する。
    const finishGestureAfterQuiet = () => {
      if (gestureEndTimerRef.current !== null) clearTimeout(gestureEndTimerRef.current);
      gestureEndTimerRef.current = setTimeout(() => {
        gestureActiveRef.current = false;
        gestureEndTimerRef.current = null;
      }, GESTURE_QUIET_MS);
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
      const duration = reducedMotionQuery.matches ? 1 : SCREEN_TRAVEL_MS;
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
        inputLockedRef.current = false;
      };

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    // 現在位置から direction ぶん画面を送る。送れたら true。
    function moveByScreen(direction: -1 | 1): boolean {
      const screens = getScreens();
      if (screens.length < 2) return false;

      const activeIndex = currentScreenIndex(screens);
      const activeScreen = screens[activeIndex];
      const pinnedScreen = activeScreen.matches('[data-home-pinned]')
        ? activeScreen
        : activeScreen.querySelector<HTMLElement>('[data-home-pinned]');

      if (pinnedScreen?.dataset.pinReady === 'true') {
        const progress = Number(pinnedScreen.dataset.homeProgress ?? '0');
        const hasInternalScene = direction > 0 ? progress < 0.999 : progress > 0.001;
        if (hasInternalScene) return false;
      }

      const targetIndex = activeIndex + direction;
      if (targetIndex < 0 || targetIndex >= screens.length) return false;

      animateViewport(screenTop(screens[targetIndex]), direction);
      return true;
    }

    const handleWheel = (event: WheelEvent) => {
      if (!desktopQuery.matches || event.defaultPrevented || Math.abs(event.deltaY) < 10) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (inputLockedRef.current || gestureActiveRef.current) {
        event.preventDefault();
        finishGestureAfterQuiet();
        return;
      }

      const direction: -1 | 1 = event.deltaY > 0 ? 1 : -1;

      // 端に到達していて送れない場合は preventDefault せず、通常のスクロールに任せる。
      const screens = getScreens();
      if (screens.length < 2) return;
      const activeIndex = currentScreenIndex(screens);
      const targetIndex = activeIndex + direction;
      if (targetIndex < 0 || targetIndex >= screens.length) return;

      if (moveByScreen(direction)) {
        gestureActiveRef.current = true;
        finishGestureAfterQuiet();
        event.preventDefault();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      gestureActiveRef.current = false;
      if (gestureEndTimerRef.current !== null) clearTimeout(gestureEndTimerRef.current);
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
