'use client';

import { useEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import type { ScrollTrigger } from 'gsap/ScrollTrigger';

interface DiscreteSceneScrollOptions {
  sectionRef: RefObject<HTMLElement | null>;
  triggerRef: MutableRefObject<ScrollTrigger | null>;
  points: readonly number[];
  duration?: number;
}

const nearestPointIndex = (value: number, points: readonly number[]) => points.reduce(
  (closestIndex, point, index) => (
    Math.abs(point - value) < Math.abs(points[closestIndex] - value)
      ? index
      : closestIndex
  ),
  0,
);

const easeInOutCubic = (value: number) => (
  value < 0.5
    ? 4 * value * value * value
    : 1 - ((-2 * value + 2) ** 3) / 2
);

/**
 * A wheel/keyboard gesture advances exactly one pinned scene. Trackpad inertia
 * is held behind a gesture latch, while boundary input is returned to normal
 * page scrolling so users never become trapped inside a pinned section.
 */
export function useDiscreteSceneScroll({
  sectionRef,
  triggerRef,
  points,
  duration = 720,
}: DiscreteSceneScrollOptions) {
  const animationFrameRef = useRef<number | null>(null);
  const gestureLockedRef = useRef(false);
  const gestureEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animatingRef = useRef(false);

  useEffect(() => {
    const clearGestureTimer = () => {
      if (gestureEndTimerRef.current !== null) {
        clearTimeout(gestureEndTimerRef.current);
        gestureEndTimerRef.current = null;
      }
    };

    const releaseAfterGestureEnds = () => {
      clearGestureTimer();
      gestureEndTimerRef.current = setTimeout(() => {
        if (!animatingRef.current) gestureLockedRef.current = false;
      }, 180);
    };

    const animateTo = (targetY: number) => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      const startY = window.scrollY;
      const distance = targetY - startY;
      const startedAt = performance.now();
      animatingRef.current = true;

      const tick = (now: number) => {
        const elapsed = Math.min(1, (now - startedAt) / duration);
        window.scrollTo(0, startY + distance * easeInOutCubic(elapsed));
        if (elapsed < 1) {
          animationFrameRef.current = requestAnimationFrame(tick);
          return;
        }
        animationFrameRef.current = null;
        animatingRef.current = false;
        releaseAfterGestureEnds();
      };

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    const advance = (direction: -1 | 1, event: Event) => {
      const trigger = triggerRef.current;
      const section = sectionRef.current;
      if (!trigger || !section) return;
      const withinPinnedRange = window.scrollY >= trigger.start - 2 && window.scrollY <= trigger.end + 2;
      if (!withinPinnedRange) return;

      const currentIndex = nearestPointIndex(trigger.progress, points);
      const targetIndex = currentIndex + direction;
      const atBoundary = targetIndex < 0 || targetIndex >= points.length;

      // At either edge, let the browser continue into the adjacent section.
      if (atBoundary && !gestureLockedRef.current) return;

      event.preventDefault();
      releaseAfterGestureEnds();
      if (gestureLockedRef.current || atBoundary) return;

      gestureLockedRef.current = true;
      const targetY = trigger.start + points[targetIndex] * (trigger.end - trigger.start);
      animateTo(targetY);
    };

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 4) return;
      advance(event.deltaY > 0 ? 1 : -1, event);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (['ArrowDown', 'PageDown', ' '].includes(event.key)) advance(1, event);
      if (['ArrowUp', 'PageUp'].includes(event.key)) advance(-1, event);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      clearGestureTimer();
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [duration, points, sectionRef, triggerRef]);
}
