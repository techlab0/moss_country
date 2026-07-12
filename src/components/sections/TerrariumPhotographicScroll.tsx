'use client';

import Image from 'next/image';
import { useEffect, useRef, type CSSProperties, type MutableRefObject } from 'react';
import styles from './TerrariumExperience.module.css';

const HERO_IMAGE = '/images/terrarium-generated/terrarium-hero-key-030-v1.png';

type TerrariumPhotographicScrollProps = {
  progressRef: MutableRefObject<number>;
};

type TerrariumPhotoStyle = CSSProperties & {
  '--terrarium-progress': number;
  '--terrarium-scale': number;
  '--terrarium-x': string;
  '--terrarium-y': string;
  '--terrarium-rotate': string;
  '--terrarium-light': number;
  '--terrarium-shadow': number;
  '--terrarium-sheen-x': string;
  '--terrarium-sheen-opacity': number;
};

type CameraPose = {
  progress: number;
  scale: number;
  x: number;
  y: number;
  rotation: number;
  light: number;
  shadow: number;
  sheenX: number;
  sheenOpacity: number;
};

const CAMERA_STOPS = [
  { progress: 0, scale: 1.025, x: 0, y: 0, rotation: 0, light: 0, shadow: 0, sheenX: -42, sheenOpacity: 0 },
  { progress: 0.2, scale: 1.075, x: -1.4, y: 0.2, rotation: -0.5, light: 0.12, shadow: 0.04, sheenX: -10, sheenOpacity: 0.12 },
  { progress: 0.48, scale: 1.17, x: -3, y: 0.9, rotation: -0.15, light: 0.18, shadow: 0.1, sheenX: 18, sheenOpacity: 0.18 },
  { progress: 0.72, scale: 1.26, x: -1.2, y: 1.8, rotation: 0.45, light: 0.1, shadow: 0.14, sheenX: 48, sheenOpacity: 0.08 },
  { progress: 1, scale: 1.335, x: 1.6, y: 2.8, rotation: 0.18, light: 0.02, shadow: 0.18, sheenX: 76, sheenOpacity: 0 },
] satisfies readonly CameraPose[];

const mix = (from: number, to: number, progress: number) => from + (to - from) * progress;
const smoothstep = (progress: number) => progress * progress * (3 - 2 * progress);

const interpolateCameraPose = (progress: number): CameraPose => {
  const clamped = Math.min(1, Math.max(0, progress));
  if (clamped <= CAMERA_STOPS[0].progress) return CAMERA_STOPS[0];
  if (clamped >= CAMERA_STOPS[CAMERA_STOPS.length - 1].progress) {
    return CAMERA_STOPS[CAMERA_STOPS.length - 1];
  }

  const rightIndex = CAMERA_STOPS.findIndex((stop) => stop.progress >= clamped);
  const left = CAMERA_STOPS[rightIndex - 1];
  const right = CAMERA_STOPS[rightIndex];
  const segmentProgress = smoothstep(
    (clamped - left.progress) / (right.progress - left.progress),
  );

  return {
    progress: clamped,
    scale: mix(left.scale, right.scale, segmentProgress),
    x: mix(left.x, right.x, segmentProgress),
    y: mix(left.y, right.y, segmentProgress),
    rotation: mix(left.rotation, right.rotation, segmentProgress),
    light: mix(left.light, right.light, segmentProgress),
    shadow: mix(left.shadow, right.shadow, segmentProgress),
    sheenX: mix(left.sheenX, right.sheenX, segmentProgress),
    sheenOpacity: mix(left.sheenOpacity, right.sheenOpacity, segmentProgress),
  };
};

const INITIAL_STYLE: TerrariumPhotoStyle = {
  '--terrarium-progress': 0,
  '--terrarium-scale': 1.025,
  '--terrarium-x': '0%',
  '--terrarium-y': '0%',
  '--terrarium-rotate': '0deg',
  '--terrarium-light': 0,
  '--terrarium-shadow': 0,
  '--terrarium-sheen-x': '-42%',
  '--terrarium-sheen-opacity': 0,
};

export function TerrariumPhotographicScroll({ progressRef }: TerrariumPhotographicScrollProps) {
  const visualRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const visual = visualRef.current;
    if (!visual) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) {
      visual.dataset.reducedMotion = 'true';
      return;
    }

    let frameId = 0;
    let renderedProgress = progressRef.current;

    const render = () => {
      renderedProgress += (progressRef.current - renderedProgress) * 0.115;
      const pose = interpolateCameraPose(renderedProgress);

      visual.style.setProperty('--terrarium-progress', pose.progress.toFixed(5));
      visual.style.setProperty('--terrarium-scale', pose.scale.toFixed(5));
      visual.style.setProperty('--terrarium-x', `${pose.x.toFixed(4)}%`);
      visual.style.setProperty('--terrarium-y', `${pose.y.toFixed(4)}%`);
      visual.style.setProperty('--terrarium-rotate', `${pose.rotation.toFixed(4)}deg`);
      visual.style.setProperty('--terrarium-light', pose.light.toFixed(5));
      visual.style.setProperty('--terrarium-shadow', pose.shadow.toFixed(5));
      visual.style.setProperty('--terrarium-sheen-x', `${pose.sheenX.toFixed(4)}%`);
      visual.style.setProperty('--terrarium-sheen-opacity', pose.sheenOpacity.toFixed(5));
      visual.dataset.photoScale = pose.scale.toFixed(4);
      visual.dataset.photoProgress = pose.progress.toFixed(4);
      visual.dataset.photoX = pose.x.toFixed(4);
      visual.dataset.photoRotation = pose.rotation.toFixed(4);
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
      data-renderer="photographic-scroll"
      data-photo-progress="0.0000"
      data-photo-scale="1.0250"
      data-photo-x="0.0000"
      data-photo-rotation="0.0000"
    >
      <Image
        src={HERO_IMAGE}
        alt="水滴のついた球状ガラスの中に、背の高いシダと湿った苔が広がるテラリウム"
        fill
        sizes="100vw"
        quality={95}
        className={styles.photoImage}
      />
      <span className={styles.photoLight} aria-hidden="true" />
      <span className={styles.photoSheen} aria-hidden="true" />
      <span className={styles.photoShadow} aria-hidden="true" />
    </div>
  );
}
