'use client';

import Image from 'next/image';
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import styles from './TerrariumExperience.module.css';

const SOURCE_IMAGE = '/images/products/IMG_0501.jpg';

const CHAPTERS = [
  { number: '01', eyebrow: 'Foundation', title: '景色の、はじまり。', body: '土と石を重ね、小さな大地の輪郭をつくる。' },
  { number: '02', eyebrow: 'Cultivation', title: '緑が、息をする。', body: '苔を一片ずつ置くたび、静かな生命が満ちていく。' },
  { number: '03', eyebrow: 'Microcosm', title: '手のひらに、森。', body: '光、湿度、時間。ガラスの内側にひとつの自然が生まれる。' },
  { number: '04', eyebrow: 'Immersion', title: 'もっと、森の奥へ。', body: '目線を近づけると、苔の一粒が雄大な景色へ変わる。' },
] as const;

type Particle = {
  x: number;
  y: number;
  radius: number;
  drift: number;
  alpha: number;
};

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, index) => {
    const seed = (index * 47 + 17) % 101;
    return {
      x: ((seed * 73) % 100) / 100,
      y: ((seed * 37 + index * 11) % 100) / 100,
      radius: 0.7 + (index % 5) * 0.36,
      drift: ((index % 7) - 3) * 0.9,
      alpha: 0.18 + (index % 4) * 0.12,
    };
  });
}

export function TerrariumExperience() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const artworkRef = useRef<HTMLDivElement>(null);
  const photoRevealRef = useRef<HTMLDivElement>(null);
  const mossLayerRef = useRef<HTMLDivElement>(null);
  const canopyLayerRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const glassRimRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const fogRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressCopyRef = useRef<HTMLSpanElement>(null);
  const chapterRefs = useRef<Array<HTMLDivElement | null>>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const artwork = artworkRef.current;
    const reveal = photoRevealRef.current;
    const moss = mossLayerRef.current;
    const canopy = canopyLayerRef.current;
    const glass = glassRef.current;
    const glassRim = glassRimRef.current;
    const light = lightRef.current;
    const fog = fogRef.current;
    const canvas = canvasRef.current;
    const progressBar = progressBarRef.current;
    const progressCopy = progressCopyRef.current;

    if (!section || !stage || !artwork || !reveal || !moss || !canopy || !glass || !glassRim || !light || !fog || !canvas || !progressBar || !progressCopy) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotionQuery.matches) {
      progressBar.style.transform = 'scaleY(1)';
      progressBar.parentElement?.setAttribute('aria-valuenow', '100');
      progressCopy.textContent = '100%';
      return;
    }

    const particles = createParticles(42);
    const context = canvas.getContext('2d');
    let canvasWidth = 0;
    let canvasHeight = 0;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvasWidth = rect.width;
      canvasHeight = rect.height;
      canvas.width = Math.max(1, Math.round(rect.width * pixelRatio));
      canvas.height = Math.max(1, Math.round(rect.height * pixelRatio));
      context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const drawParticles = (progress: number) => {
      if (!context || canvasWidth === 0 || canvasHeight === 0) return;
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      const visibility = Math.max(0, Math.min(1, (progress - 0.18) * 2.4));
      particles.forEach((particle, index) => {
        const x = particle.x * canvasWidth + Math.sin(progress * 8 + index) * particle.drift;
        const y = ((particle.y + progress * (0.08 + (index % 4) * 0.012)) % 1) * canvasHeight;
        const glow = context.createRadialGradient(x, y, 0, x, y, particle.radius * 4);
        glow.addColorStop(0, `rgba(210, 238, 167, ${particle.alpha * visibility})`);
        glow.addColorStop(1, 'rgba(210, 238, 167, 0)');
        context.fillStyle = glow;
        context.beginPath();
        context.arc(x, y, particle.radius * 4, 0, Math.PI * 2);
        context.fill();
      });
    };

    resizeCanvas();
    drawParticles(0);
    window.addEventListener('resize', resizeCanvas, { passive: true });

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
            wheelMultiplier: 0.85,
          });
          handleLenisScroll = () => ScrollTrigger.update();
          lenis.on('scroll', handleLenisScroll);
          lenisTicker = (time: number) => lenis?.raf(time * 1000);
          gsap.ticker.add(lenisTicker);
          gsap.ticker.lagSmoothing(0);
        }

        const chapters = chapterRefs.current.filter((chapter): chapter is HTMLDivElement => chapter !== null);
        gsap.set(reveal, { clipPath: 'inset(88% 0 0 0 round 48% 48% 10% 10%)' });
        gsap.set(moss, { opacity: 0, yPercent: 8, scale: 0.985 });
        gsap.set(canopy, { opacity: 0, yPercent: 16, scale: 0.96 });
        gsap.set([glass, glassRim], { opacity: 0 });
        gsap.set(light, { opacity: 0, xPercent: -12 });
        gsap.set(fog, { opacity: 0 });
        gsap.set(chapters, { opacity: 0, y: 24 });
        gsap.set(chapters[0], { opacity: 1, y: 0 });
        gsap.set(artwork, { transformPerspective: 1100, transformOrigin: '50% 62%' });

        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: isDesktop ? '+=420%' : '+=230%',
            pin: stage,
            pinSpacing: true,
            anticipatePin: 1,
            scrub: isDesktop ? 0.9 : 0.35,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const percentage = Math.round(self.progress * 100);
              progressBar.style.transform = `scaleY(${self.progress})`;
              progressBar.parentElement?.setAttribute('aria-valuenow', String(percentage));
              progressCopy.textContent = `${percentage}%`;
              if (isDesktop) drawParticles(self.progress);
            },
          },
        });

        timeline
          .to([glass, glassRim], { opacity: 0.68, duration: 0.7 }, 0)
          .to(reveal, { clipPath: 'inset(64% 0 0 0 round 48% 48% 10% 10%)', duration: 1.05 }, 0.55)
          .to(reveal, { clipPath: 'inset(42% 0 0 0 round 48% 48% 10% 10%)', duration: 0.95 }, 1.45)
          .to(moss, { opacity: 0.96, yPercent: 0, scale: 1, duration: 0.85 }, 1.65)
          .to(chapters[0], { opacity: 0, y: -20, duration: 0.25 }, 1.75)
          .to(chapters[1], { opacity: 1, y: 0, duration: 0.35 }, 1.95)
          .to(reveal, { clipPath: 'inset(15% 0 0 0 round 48% 48% 10% 10%)', duration: 1.05 }, 2.25)
          .to(canopy, { opacity: 1, yPercent: 0, scale: 1, duration: 0.9 }, 2.35)
          .to(light, { opacity: 0.52, xPercent: 4, duration: 0.8 }, 2.6)
          .to(reveal, { clipPath: 'inset(0% 0 0 0 round 48% 48% 10% 10%)', duration: 0.75 }, 3.05)
          .to(chapters[1], { opacity: 0, y: -20, duration: 0.25 }, 3.15)
          .to(chapters[2], { opacity: 1, y: 0, duration: 0.35 }, 3.35)
          .to(artwork, { scale: isDesktop ? 1.06 : 1.02, rotationY: -7, rotationZ: -0.35, duration: 0.95 }, 3.65)
          .to(artwork, { scale: isDesktop ? 1.14 : 1.06, rotationY: 9, rotationZ: 0.45, duration: 1.05 }, 4.55)
          .to(light, { opacity: 0.24, xPercent: 20, duration: 0.8 }, 4.65)
          .to(chapters[2], { opacity: 0, y: -20, duration: 0.25 }, 5.15)
          .to(chapters[3], { opacity: 1, y: 0, duration: 0.35 }, 5.35)
          .to(artwork, { scale: isDesktop ? 1.78 : 1.25, rotationY: 0, rotationZ: 0, duration: 1.05, ease: 'power1.inOut' }, 5.55)
          .to([glass, glassRim], { opacity: 0.2, duration: 0.7 }, 5.8)
          .to(artwork, { scale: isDesktop ? 3.35 : 1.55, yPercent: isDesktop ? 18 : 5, duration: 1.15, ease: 'power2.in' }, 6.45)
          .to(fog, { opacity: 0.74, duration: 0.75 }, 6.65)
          .to(chapters[3], { opacity: 0, y: -14, duration: 0.35 }, 7.05);

        return () => {
          timeline.scrollTrigger?.kill();
          timeline.kill();
          if (lenisTicker) gsap.ticker.remove(lenisTicker);
          if (isDesktop) gsap.ticker.lagSmoothing(500, 33);
          if (lenis && handleLenisScroll) lenis.off('scroll', handleLenisScroll);
          lenis?.destroy();
        };
      },
    );

    return () => {
      media.revert();
      window.removeEventListener('resize', resizeCanvas);
      context?.clearRect(0, 0, canvasWidth, canvasHeight);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={styles.experience}
      data-testid="terrarium-experience"
      aria-labelledby="terrarium-experience-title"
    >
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.ambientBackground} aria-hidden="true">
          <Image src={SOURCE_IMAGE} alt="" fill sizes="100vw" className={styles.ambientImage} />
        </div>
        <div className={styles.vignette} aria-hidden="true" />
        <div ref={lightRef} className={styles.lightBeam} aria-hidden="true" />
        <canvas ref={canvasRef} className={styles.particles} aria-hidden="true" />

        <header className={styles.heading}>
          <p className={styles.kicker}>Moss Country / Living Art</p>
          <h2 id="terrarium-experience-title" className={styles.title}>
            小さな自然が、<br />生まれるまで。
          </h2>
        </header>

        <div ref={artworkRef} className={styles.artwork}>
          <div ref={glassRef} className={styles.glassOutline} aria-hidden="true" />
          <div ref={glassRimRef} className={styles.glassRim} aria-hidden="true" />
          <div ref={photoRevealRef} className={styles.photoReveal}>
            <Image
              src={SOURCE_IMAGE}
              alt="暗い展示空間で光を浴びる、苔と石を植え込んだガラスのテラリウム"
              fill
              priority={false}
              sizes="(max-width: 767px) 78vw, 46vh"
              className={styles.sourceImage}
            />
          </div>
          <div ref={mossLayerRef} className={`${styles.detailLayer} ${styles.mossLayer}`} aria-hidden="true">
            <Image src={SOURCE_IMAGE} alt="" fill sizes="(max-width: 767px) 78vw, 46vh" className={styles.sourceImage} />
          </div>
          <div ref={canopyLayerRef} className={`${styles.detailLayer} ${styles.canopyLayer}`} aria-hidden="true">
            <Image src={SOURCE_IMAGE} alt="" fill sizes="(max-width: 767px) 78vw, 46vh" className={styles.sourceImage} />
          </div>
          <div className={styles.glassHighlight} aria-hidden="true" />
          <div className={styles.plinth} aria-hidden="true" />
        </div>

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
            className={styles.progressTrack}
            role="progressbar"
            aria-label="テラリウム制作ストーリーの進行度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
          >
            <span ref={progressBarRef} className={styles.progressFill} aria-hidden="true" />
          </div>
          <span ref={progressCopyRef} data-testid="terrarium-progress-copy" className={styles.progressCopy}>0%</span>
        </div>

        <p className={styles.scrollHint} aria-hidden="true"><span /> Scroll to cultivate</p>
        <div ref={fogRef} className={styles.fog} aria-hidden="true" />
        <p className={styles.srOnly}>
          土と石から景色を組み、苔を植え、ガラスの中に小さな森が完成していく過程を紹介します。
        </p>
        <p className={styles.reducedMotionNote} data-motion="reduced">
          動きを減らす設定では、完成したテラリウムを静止画で表示しています。
        </p>
      </div>
    </section>
  );
}
