'use client';

import Image from 'next/image';
import { useEffect, useRef, type CSSProperties, type MutableRefObject } from 'react';
import styles from './TerrariumExperience.module.css';

type RotationView = 'left' | 'front' | 'right' | 'right-close';

type RotationFrame = {
  id: RotationView;
  src: string;
  scale: number;
  x: number;
  y: number;
};

const ROTATION_FRAMES: readonly RotationFrame[] = [
  {
    id: 'left',
    src: '/images/terrarium-generated/terrarium-hero-angle-left-024-v1.png',
    scale: 1.025,
    x: 0,
    y: 0,
  },
  {
    id: 'front',
    src: '/images/terrarium-generated/terrarium-hero-key-030-v1.png',
    scale: 1.025,
    x: 0,
    y: 0,
  },
  {
    id: 'right',
    src: '/images/terrarium-generated/terrarium-hero-angle-right-028-v1.png',
    scale: 1.025,
    x: 0,
    y: 0,
  },
  {
    id: 'right-close',
    src: '/images/terrarium-generated/terrarium-hero-angle-right-close-v1.png',
    scale: 1,
    x: 0,
    y: 0.4,
  },
];

type TerrariumPhotographicScrollProps = {
  progressRef: MutableRefObject<number>;
};

type TerrariumPhotoStyle = CSSProperties & {
  '--terrarium-progress': number;
  '--terrarium-light': number;
  '--terrarium-shadow': number;
  '--terrarium-sheen-x': string;
  '--terrarium-sheen-opacity': number;
};

const INITIAL_STYLE: TerrariumPhotoStyle = {
  '--terrarium-progress': 0,
  '--terrarium-light': 0,
  '--terrarium-shadow': 0,
  '--terrarium-sheen-x': '-42%',
  '--terrarium-sheen-opacity': 0,
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smoothstep = (value: number) => value * value * (3 - 2 * value);

export function TerrariumPhotographicScroll({ progressRef }: TerrariumPhotographicScrollProps) {
  const visualRef = useRef<HTMLDivElement>(null);
  const frameRefs = useRef<Array<HTMLDivElement | null>>([]);

  // マウント後、2〜4枚目をブラウザキャッシュへ先読みしておく（Next/Imageのlazy読み込みで
  // スクロール到達時に初回デコードが遅れるのを避けるため）。1枚目はpriorityで即時読み込み。
  useEffect(() => {
    const prefetchTargets = ROTATION_FRAMES.slice(1);
    const prefetched = prefetchTargets.map((frame) => {
      const image = new window.Image();
      image.src = frame.src;
      return image;
    });
    return () => {
      prefetched.length = 0;
    };
  }, []);

  useEffect(() => {
    const visual = visualRef.current;
    const frames = frameRefs.current;
    if (!visual || frames.length !== ROTATION_FRAMES.length) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) {
      frames.forEach((frame, index) => {
        if (frame) frame.style.opacity = index === 1 ? '1' : '0';
      });
      visual.dataset.activeView = 'front';
      visual.dataset.reducedMotion = 'true';
      return;
    }

    let frameId = 0;
    let running = false;
    let renderedProgress = progressRef.current;

    // 切替中（blendが0.15〜0.85）だけ山形にブラーをかけ、「カメラが振れた」印象を出す。
    // blend=0.5でピーク(最大1.2px)、境界(0.15/0.85)で0になる三角波。
    const getTransitionBlur = (blend: number) => {
      if (blend <= 0.15 || blend >= 0.85) return 0;
      const distanceFromPeak = Math.abs(blend - 0.5) / 0.35;
      return 1.2 * (1 - distanceFromPeak);
    };

    const render = () => {
      renderedProgress += (progressRef.current - renderedProgress) * 0.14;
      const progress = clamp01(renderedProgress);
      const framePosition = progress * (ROTATION_FRAMES.length - 1);
      const fromIndex = Math.min(Math.floor(framePosition), ROTATION_FRAMES.length - 1);
      const toIndex = Math.min(fromIndex + 1, ROTATION_FRAMES.length - 1);
      const localProgress = framePosition - fromIndex;
      const blend = fromIndex === toIndex
        ? 0
        : smoothstep(clamp01((localProgress - 0.38) / 0.24));
      const activeIndex = blend < 0.5 ? fromIndex : toIndex;

      frames.forEach((frame, index) => {
        if (!frame) return;
        const rotationFrame = ROTATION_FRAMES[index];
        const opacity = index === fromIndex ? 1 - blend : index === toIndex ? blend : 0;
        const travel = index === fromIndex ? localProgress : localProgress - 1;
        const scale = rotationFrame.scale * (1 + travel * 0.018);
        const x = rotationFrame.x + travel * -0.7;
        const y = rotationFrame.y + Math.abs(travel) * 0.25;
        frame.style.opacity = opacity.toFixed(5);
        frame.style.transform = `translate3d(${x.toFixed(4)}%, ${y.toFixed(4)}%, 0) scale(${scale.toFixed(5)})`;
        frame.style.zIndex = opacity > 0 ? '1' : '0';
      });

      const lightArc = Math.sin(progress * Math.PI);
      const transitionBlur = getTransitionBlur(blend);
      visual.style.setProperty('--terrarium-progress', progress.toFixed(5));
      visual.style.setProperty('--terrarium-light', (lightArc * 0.14).toFixed(5));
      visual.style.setProperty('--terrarium-shadow', (progress * 0.14).toFixed(5));
      visual.style.setProperty('--terrarium-sheen-x', `${(-42 + progress * 118).toFixed(4)}%`);
      visual.style.setProperty('--terrarium-sheen-opacity', (lightArc * 0.13).toFixed(5));
      visual.style.filter = transitionBlur > 0.001 ? `blur(${transitionBlur.toFixed(3)}px)` : '';
      visual.dataset.photoProgress = progress.toFixed(4);
      visual.dataset.activeView = ROTATION_FRAMES[activeIndex].id;
      visual.dataset.sharpness = Math.max(blend, 1 - blend).toFixed(4);
      if (running) frameId = window.requestAnimationFrame(render);
    };

    const startLoop = () => {
      if (running) return;
      running = true;
      render();
    };

    const stopLoop = () => {
      running = false;
      window.cancelAnimationFrame(frameId);
    };

    // ビューポート外（余白200px）ではrAFを止め、無駄なレンダリングを避ける。
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startLoop();
        } else {
          stopLoop();
        }
      },
      { rootMargin: '200px 0px' },
    );
    visibilityObserver.observe(visual);

    return () => {
      visibilityObserver.disconnect();
      stopLoop();
    };
  }, [progressRef]);

  return (
    <div
      ref={visualRef}
      className={styles.photoStack}
      style={INITIAL_STYLE}
      data-testid="terrarium-photo"
      data-renderer="photographic-multiview"
      data-photo-progress="0.0000"
      data-active-view="left"
      data-sharpness="1.0000"
    >
      {ROTATION_FRAMES.map((frame, index) => (
        <div
          key={frame.id}
          ref={(element) => { frameRefs.current[index] = element; }}
          className={styles.rotationFrame}
          data-testid="terrarium-rotation-frame"
          data-rotation-view={frame.id}
          style={{ opacity: index === 0 ? 1 : 0, zIndex: index === 0 ? 1 : 0 }}
        >
          <Image
            src={frame.src}
            alt={index === 0 ? '左から右へ回り込みながら鑑賞できる、苔とシダに満ちたガラスのテラリウム' : ''}
            fill
            sizes="100vw"
            quality={82}
            priority={index === 0}
            className={styles.photoImage}
          />
        </div>
      ))}
      <span className={styles.photoLight} aria-hidden="true" />
      <span className={styles.photoSheen} aria-hidden="true" />
      <span className={styles.photoShadow} aria-hidden="true" />
    </div>
  );
}
