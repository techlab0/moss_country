'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useDiscreteSceneScroll } from '@/hooks/useDiscreteSceneScroll';
import { TerrariumPhotographicScroll } from './TerrariumPhotographicScroll';
import styles from './TerrariumExperience.module.css';

const ROTATION_SNAP_POINTS = [0, 1 / 3, 2 / 3, 1];

export function TerrariumExperience() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const visualProgressRef = useRef(0);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLSpanElement>(null);
  const progressCopyRef = useRef<HTMLSpanElement>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);

  useDiscreteSceneScroll({
    sectionRef,
    triggerRef: scrollTriggerRef,
    points: ROTATION_SNAP_POINTS,
  });

  const handleSkip = () => {
    const section = sectionRef.current;
    const trigger = scrollTriggerRef.current;
    const targetY = trigger
      ? trigger.end
      : section
        ? section.getBoundingClientRect().bottom + window.scrollY
        : 0;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const progressTrack = progressTrackRef.current;
    const progressBar = progressBarRef.current;
    const progressCopy = progressCopyRef.current;

    if (
      !section ||
      !stage ||
      !progressTrack ||
      !progressBar ||
      !progressCopy
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    // iOSのアドレスバー伸縮によるrefreshでピンが飛ぶのを防ぐ
    ScrollTrigger.config({ ignoreMobileResize: true });

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotionQuery.matches) {
      visualProgressRef.current = 1;
      section.dataset.homeProgress = '1';
      progressBar.style.transform = 'scaleY(1)';
      progressTrack.setAttribute('aria-valuenow', '100');
      progressTrack.setAttribute('aria-valuetext', 'テラリウムの森を表示');
      progressCopy.textContent = '100%';
      return;
    }

    const media = gsap.matchMedia(section);
    media.add(
      {
        isDesktop: '(min-width: 768px)',
        isMobile: '(max-width: 767px)',
      },
      () => {
        const scrollTrigger = ScrollTrigger.create({
            trigger: section,
            start: 'top top',
            end: '+=300%',
            pin: stage,
            pinSpacing: true,
            anticipatePin: 1,
            snap: {
              snapTo: (value) => ROTATION_SNAP_POINTS.reduce(
                (closest, point) => Math.abs(point - value) < Math.abs(closest - value) ? point : closest,
              ),
              duration: { min: 0.18, max: 0.42 },
              delay: 0.06,
              ease: 'power2.out',
            },
            invalidateOnRefresh: true,
            onToggle: (self) => {
              stage.dataset.pinActive = String(self.isActive);
              section.dataset.pinActive = String(self.isActive);
            },
            onUpdate: (self) => {
              const percentage = Math.round(self.progress * 100);
              visualProgressRef.current = self.progress;
              section.dataset.homeProgress = self.progress.toFixed(4);
              stage.style.setProperty('--terrarium-progress', self.progress.toFixed(4));
              const headingProgress = Math.min(1, Math.max(0, (self.progress - 0.26) / 0.2));
              stage.style.setProperty('--terrarium-heading-opacity', (1 - headingProgress).toFixed(4));
              stage.style.setProperty('--terrarium-heading-x', `${(-2.4 * headingProgress).toFixed(4)}rem`);
              stage.style.setProperty('--terrarium-hint-opacity', Math.max(0, 1 - self.progress * 5).toFixed(4));
              progressBar.style.transform = `scaleY(${self.progress})`;
              progressTrack.setAttribute('aria-valuenow', String(percentage));
              progressTrack.setAttribute(
                'aria-valuetext',
                `テラリウム鑑賞 ${percentage}%`,
              );
              progressCopy.textContent = `${percentage}%`;
            },
        });

        scrollTriggerRef.current = scrollTrigger;
        section.dataset.pinReady = 'true';

        return () => {
          scrollTriggerRef.current = null;
          section.dataset.pinReady = 'false';
          stage.dataset.pinActive = 'false';
          section.dataset.pinActive = 'false';
          scrollTrigger.kill();
        };
      },
    );

    return () => {
      media.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={styles.experience}
      data-testid="terrarium-experience"
      data-storyboard-source="photographic-terrarium-scroll"
      data-home-screen="pinned"
      data-home-pinned="true"
      data-home-progress="0"
      data-pin-active="false"
      data-pin-ready="false"
      aria-labelledby="terrarium-experience-title"
    >
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.ambientGlow} aria-hidden="true" />
        <div className={styles.grain} aria-hidden="true" />

        <header className={styles.heading}>
          <p className={styles.kicker}>Moss Country / Living Art</p>
          <h2 id="terrarium-experience-title" className={styles.title}>
            小さな自然が、<br />生まれるまで。
          </h2>
        </header>

        <figure
          className={styles.artwork}
          data-testid="terrarium-artwork"
          aria-describedby="terrarium-experience-description"
        >
          <TerrariumPhotographicScroll progressRef={visualProgressRef} />
          <div className={styles.frameVignette} aria-hidden="true" />
        </figure>

        <div className={styles.progress}>
          <div
            ref={progressTrackRef}
            className={styles.progressTrack}
            role="progressbar"
            aria-label="テラリウム制作ストーリーの進行度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            aria-valuetext="フレーム 1 / 24"
          >
            <span ref={progressBarRef} className={styles.progressFill} aria-hidden="true" />
          </div>
          <span ref={progressCopyRef} data-testid="terrarium-progress-copy" className={styles.progressCopy}>0%</span>
        </div>

        <p className={styles.scrollHint} aria-hidden="true"><span /> Scroll to cultivate</p>

        <button
          type="button"
          className={styles.skipButton}
          aria-label="テラリウム鑑賞をとばして次のセクションへ進む"
          onClick={handleSkip}
        >
          とばす ↓
        </button>

        <p id="terrarium-experience-description" className={styles.srOnly}>
          背の高いシダと湿った苔に満ちたガラスの森を、スクロールで左から右へ回り込み、近づきながら鑑賞できます。
        </p>
        <p className={styles.reducedMotionNote} data-motion="reduced">
          動きを減らす設定では、完成した苔の森を静止画で表示しています。
        </p>
      </div>
    </section>
  );
}
