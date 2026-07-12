'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { TerrariumPhotographicScroll } from './TerrariumPhotographicScroll';
import styles from './TerrariumExperience.module.css';

export function TerrariumExperience() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const visualProgressRef = useRef(0);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLSpanElement>(null);
  const progressCopyRef = useRef<HTMLSpanElement>(null);

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

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotionQuery.matches) {
      visualProgressRef.current = 1;
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
      (mediaContext) => {
        const { isDesktop } = mediaContext.conditions as { isDesktop: boolean; isMobile: boolean };
        let lenis: Lenis | undefined;
        let lenisTicker: ((time: number) => void) | undefined;
        let handleLenisScroll: (() => void) | undefined;

        if (isDesktop) {
          lenis = new Lenis({
            lerp: 0.09,
            smoothWheel: true,
            syncTouch: false,
            wheelMultiplier: 0.82,
          });
          handleLenisScroll = () => ScrollTrigger.update();
          lenis.on('scroll', handleLenisScroll);
          lenisTicker = (time: number) => lenis?.raf(time * 1000);
          gsap.ticker.add(lenisTicker);
          gsap.ticker.lagSmoothing(0);
        }

        const scrollTrigger = ScrollTrigger.create({
            trigger: section,
            start: 'top top',
            end: isDesktop ? '+=470%' : '+=350%',
            pin: stage,
            pinSpacing: true,
            anticipatePin: 1,
            scrub: isDesktop ? 0.42 : 0.24,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const percentage = Math.round(self.progress * 100);
              visualProgressRef.current = self.progress;
              stage.style.setProperty('--terrarium-progress', self.progress.toFixed(4));
              const headingProgress = Math.min(1, Math.max(0, (self.progress - 0.18) / 0.18));
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

        return () => {
          scrollTrigger.kill();
          if (lenisTicker) gsap.ticker.remove(lenisTicker);
          if (lenis && handleLenisScroll) lenis.off('scroll', handleLenisScroll);
          lenis?.destroy();
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
        <p id="terrarium-experience-description" className={styles.srOnly}>
          背の高いシダと湿った苔に満ちたガラスの森を、スクロールでゆっくり近づきながら鑑賞できます。
        </p>
        <p className={styles.reducedMotionNote} data-motion="reduced">
          動きを減らす設定では、完成した苔の森を静止画で表示しています。
        </p>
      </div>
    </section>
  );
}
