'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import styles from './TerrariumExperience.module.css';

const STORYBOARD_FRAMES = Array.from({ length: 24 }, (_, index) => ({
  number: String(index + 1).padStart(2, '0'),
  src: `/images/terrarium-sequence/frame-${String(index + 1).padStart(2, '0')}.webp`,
}));

const CHAPTERS = [
  {
    startFrame: 0,
    number: '01',
    eyebrow: 'Presence',
    title: '暗闇に、器が現れる。',
    body: 'まだ何もない静かな空間に、ガラスの輪郭だけが光を受ける。',
  },
  {
    startFrame: 4,
    number: '02',
    eyebrow: 'Foundation',
    title: '大地の記憶を、重ねる。',
    body: '土、石、火山岩。小さな景色の骨格が、ひとつずつ組み上がる。',
  },
  {
    startFrame: 8,
    number: '03',
    eyebrow: 'Cultivation',
    title: '緑が、地形を包んでいく。',
    body: '苔と繊細な植物が岩を覆い、ガラスの内側に生命が満ちる。',
  },
  {
    startFrame: 12,
    number: '04',
    eyebrow: 'Completion',
    title: 'ひとつの風景が、完成する。',
    body: '光と湿度が満ち、手のひらほどの世界が静かに呼吸を始める。',
  },
  {
    startFrame: 16,
    number: '05',
    eyebrow: 'Perspective',
    title: '角度を変え、景色を辿る。',
    body: '器の周囲をゆっくり巡りながら、岩肌と苔がつくる奥行きを見つめる。',
  },
  {
    startFrame: 20,
    number: '06',
    eyebrow: 'Immersion',
    title: 'そして、森の内側へ。',
    body: '完成した作品へ近づき、苔の一粒を雄大な森として見つめる。',
  },
] as const;

export function TerrariumExperience() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const artworkRef = useRef<HTMLDivElement>(null);
  const frameRefs = useRef<Array<HTMLImageElement | null>>([]);
  const chapterRefs = useRef<Array<HTMLDivElement | null>>([]);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLSpanElement>(null);
  const progressCopyRef = useRef<HTMLSpanElement>(null);
  const frameCopyRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const artwork = artworkRef.current;
    const progressTrack = progressTrackRef.current;
    const progressBar = progressBarRef.current;
    const progressCopy = progressCopyRef.current;
    const frameCopy = frameCopyRef.current;
    const frames = frameRefs.current.filter((frame): frame is HTMLImageElement => frame !== null);
    const chapters = chapterRefs.current.filter((chapter): chapter is HTMLDivElement => chapter !== null);

    if (
      !section ||
      !stage ||
      !artwork ||
      !progressTrack ||
      !progressBar ||
      !progressCopy ||
      !frameCopy ||
      frames.length !== STORYBOARD_FRAMES.length ||
      chapters.length !== CHAPTERS.length
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotionQuery.matches) {
      gsap.set(frames, { opacity: 0, scale: 1 });
      gsap.set(frames[frames.length - 1], { opacity: 1 });
      gsap.set(chapters, { opacity: 0 });
      gsap.set(chapters[chapters.length - 1], { opacity: 1 });
      progressBar.style.transform = 'scaleY(1)';
      progressTrack.setAttribute('aria-valuenow', '100');
      progressTrack.setAttribute('aria-valuetext', 'フレーム 24 / 24');
      progressCopy.textContent = '100%';
      frameCopy.textContent = '24 / 24';
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

        gsap.set(frames, { opacity: 0, scale: 1.018 });
        gsap.set(frames[0], { opacity: 1, scale: 1 });
        gsap.set(chapters, { opacity: 0, y: 18 });
        gsap.set(chapters[0], { opacity: 1, y: 0 });
        gsap.set(artwork, { transformOrigin: '50% 50%' });

        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: isDesktop ? '+=900%' : '+=640%',
            pin: stage,
            pinSpacing: true,
            anticipatePin: 1,
            scrub: isDesktop ? 0.7 : 0.3,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const percentage = Math.round(self.progress * 100);
              const frameIndex = Math.min(
                STORYBOARD_FRAMES.length - 1,
                Math.floor(self.progress * STORYBOARD_FRAMES.length),
              );
              const frameNumber = String(frameIndex + 1).padStart(2, '0');
              progressBar.style.transform = `scaleY(${self.progress})`;
              progressTrack.setAttribute('aria-valuenow', String(percentage));
              progressTrack.setAttribute(
                'aria-valuetext',
                `フレーム ${frameIndex + 1} / ${STORYBOARD_FRAMES.length}`,
              );
              progressCopy.textContent = `${percentage}%`;
              frameCopy.textContent = `${frameNumber} / 24`;
            },
          },
        });

        for (let index = 1; index < frames.length; index += 1) {
          const position = index - 1;
          timeline
            .to(
              frames[index - 1],
              { opacity: 0, scale: 0.996, duration: 0.72, ease: 'power1.inOut' },
              position,
            )
            .fromTo(
              frames[index],
              { opacity: 0, scale: 1.018 },
              { opacity: 1, scale: 1, duration: 0.72, ease: 'power1.inOut' },
              position,
            );
        }

        for (let index = 1; index < chapters.length; index += 1) {
          const position = CHAPTERS[index].startFrame - 1;
          timeline
            .to(chapters[index - 1], { opacity: 0, y: -14, duration: 0.24 }, position)
            .to(chapters[index], { opacity: 1, y: 0, duration: 0.32 }, position + 0.12);
        }

        return () => {
          timeline.scrollTrigger?.kill();
          timeline.kill();
          if (lenisTicker) gsap.ticker.remove(lenisTicker);
          if (lenis && handleLenisScroll) lenis.off('scroll', handleLenisScroll);
          lenis?.destroy();
        };
      },
    );

    return () => media.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={styles.experience}
      data-testid="terrarium-experience"
      data-storyboard-source="generated-24-frame-sequence"
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
          ref={artworkRef}
          className={styles.artwork}
          data-testid="terrarium-artwork"
          aria-describedby="terrarium-experience-description"
        >
          <div className={styles.frameStack}>
            {STORYBOARD_FRAMES.map((frame, index) => (
              <Image
                key={frame.number}
                ref={(element) => { frameRefs.current[index] = element; }}
                data-testid="terrarium-frame"
                src={frame.src}
                alt={index === 0 ? '暗闇からガラスの器が現れ、苔の森へ育っていくテラリウム作品' : ''}
                fill
                sizes="100vw"
                quality={95}
                priority={index === 0}
                className={styles.frame}
              />
            ))}
          </div>
          <div className={styles.frameVignette} aria-hidden="true" />
          <span ref={frameCopyRef} className={styles.frameCopy} aria-hidden="true">01 / 24</span>
        </figure>

        <div className={styles.chapterRail} aria-hidden="true">
          {CHAPTERS.map((chapter, index) => (
            <div
              key={chapter.number}
              ref={(element) => { chapterRefs.current[index] = element; }}
              className={styles.copyChapter}
            >
              <span className={styles.chapterNumber}>{chapter.number}</span>
              <p className={styles.chapterEyebrow}>{chapter.eyebrow}</p>
              <p className={styles.chapterTitle}>{chapter.title}</p>
              <p className={styles.chapterBody}>{chapter.body}</p>
            </div>
          ))}
        </div>

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
          暗闇にガラスの器が現れ、土と石を重ね、苔と植物が育ち、最後に苔の森へ近づく24段階の物語です。
        </p>
        <p className={styles.reducedMotionNote} data-motion="reduced">
          動きを減らす設定では、完成した苔の森を静止画で表示しています。
        </p>
      </div>
    </section>
  );
}
