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
    let renderedProgress = progressRef.current;

    const render = () => {
      renderedProgress += (progressRef.current - renderedProgress) * 0.14;
      const progress = clamp01(renderedProgress);
      const framePosition = progress * (ROTATION_FRAMES.length - 1);
      const fromIndex = Math.min(Math.floor(framePosition), ROTATION_FRAMES.length - 1);
      const toIndex = Math.min(fromIndex + 1, ROTATION_FRAMES.length - 1);
      const localProgress = framePosition - fromIndex;
      const blend = fromIndex === toIndex
        ? 0
        : smoothstep(clamp01((localProgress - 0.28) / 0.44));
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
      visual.style.setProperty('--terrarium-progress', progress.toFixed(5));
      visual.style.setProperty('--terrarium-light', (lightArc * 0.14).toFixed(5));
      visual.style.setProperty('--terrarium-shadow', (progress * 0.14).toFixed(5));
      visual.style.setProperty('--terrarium-sheen-x', `${(-42 + progress * 118).toFixed(4)}%`);
      visual.style.setProperty('--terrarium-sheen-opacity', (lightArc * 0.13).toFixed(5));
      visual.dataset.photoProgress = progress.toFixed(4);
      visual.dataset.activeView = ROTATION_FRAMES[activeIndex].id;
      visual.dataset.sharpness = Math.max(blend, 1 - blend).toFixed(4);
      frameId = window.requestAnimationFrame(render);
    };

    render();
    return () => window.cancelAnimationFrame(frameId);
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
            quality={95}
            loading="eager"
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
