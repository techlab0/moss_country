'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import styles from './TerrariumExperience.module.css';

const SOURCE_FRAME_COUNT = 24;
const INTERPOLATED_VIDEO_SRC = '/images/terrarium-sequence/interpolated-48fps.mp4';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const chapterRefs = useRef<Array<HTMLDivElement | null>>([]);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLSpanElement>(null);
  const progressCopyRef = useRef<HTMLSpanElement>(null);
  const frameCopyRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const video = videoRef.current;
    const progressTrack = progressTrackRef.current;
    const progressBar = progressBarRef.current;
    const progressCopy = progressCopyRef.current;
    const frameCopy = frameCopyRef.current;
    const chapters = chapterRefs.current.filter((chapter): chapter is HTMLDivElement => chapter !== null);

    if (
      !section ||
      !stage ||
      !video ||
      !progressTrack ||
      !progressBar ||
      !progressCopy ||
      !frameCopy ||
      chapters.length !== CHAPTERS.length
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    let media: ReturnType<typeof gsap.matchMedia> | undefined;
    let initialized = false;

    const initialize = () => {
      if (initialized || !Number.isFinite(video.duration) || video.duration <= 0) return;
      initialized = true;

      const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (reduceMotionQuery.matches) {
        video.pause();
        gsap.set(chapters, { opacity: 0 });
        gsap.set(chapters[chapters.length - 1], { opacity: 1 });
        progressBar.style.transform = 'scaleY(1)';
        progressTrack.setAttribute('aria-valuenow', '100');
        progressTrack.setAttribute('aria-valuetext', 'フレーム 24 / 24');
        progressCopy.textContent = '100%';
        frameCopy.textContent = '24 / 24';
        return;
      }

      media = gsap.matchMedia(section);
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

        video.pause();
        video.currentTime = 0;
        gsap.set(chapters, { opacity: 0, y: 18 });
        gsap.set(chapters[0], { opacity: 1, y: 0 });

        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: isDesktop ? '+=900%' : '+=640%',
            pin: stage,
            pinSpacing: true,
            anticipatePin: 1,
            scrub: isDesktop ? 0.35 : 0.18,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const percentage = Math.round(self.progress * 100);
              const frameIndex = Math.min(
                SOURCE_FRAME_COUNT - 1,
                Math.floor(self.progress * SOURCE_FRAME_COUNT),
              );
              const frameNumber = String(frameIndex + 1).padStart(2, '0');
              progressBar.style.transform = `scaleY(${self.progress})`;
              progressTrack.setAttribute('aria-valuenow', String(percentage));
              progressTrack.setAttribute(
                'aria-valuetext',
                `フレーム ${frameIndex + 1} / ${SOURCE_FRAME_COUNT}`,
              );
              progressCopy.textContent = `${percentage}%`;
              frameCopy.textContent = `${frameNumber} / 24`;
            },
          },
        });

        timeline.to(
          video,
          {
            currentTime: Math.max(0, video.duration - 0.04),
            duration: SOURCE_FRAME_COUNT - 1,
            ease: 'none',
          },
          0,
        );

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
    };

    if (video.readyState >= 1) initialize();
    else video.addEventListener('loadedmetadata', initialize, { once: true });

    return () => {
      video.removeEventListener('loadedmetadata', initialize);
      media?.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={styles.experience}
      data-testid="terrarium-experience"
      data-storyboard-source="optical-flow-48fps-from-24-generated-frames"
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
          <div className={styles.frameStack}>
            <video
              ref={videoRef}
              data-testid="terrarium-interpolated-video"
              data-interpolation="optical-flow-48fps"
              src={INTERPOLATED_VIDEO_SRC}
              poster="/images/terrarium-sequence/frame-01.webp"
              preload="auto"
              muted
              playsInline
              tabIndex={-1}
              aria-label="暗闇からガラスの器が現れ、苔の森へ育っていくテラリウム作品"
              className={styles.sequenceVideo}
            />
            <Image
              src="/images/terrarium-sequence/frame-24.webp"
              alt="完成したテラリウムの内側に広がる苔の森"
              fill
              sizes="100vw"
              quality={95}
              className={styles.reducedMotionFrame}
            />
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
