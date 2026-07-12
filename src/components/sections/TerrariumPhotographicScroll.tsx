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
};

const INITIAL_STYLE: TerrariumPhotoStyle = {
  '--terrarium-progress': 0,
  '--terrarium-scale': 1.035,
  '--terrarium-x': '0%',
  '--terrarium-y': '0%',
  '--terrarium-rotate': '0deg',
  '--terrarium-light': 0,
  '--terrarium-shadow': 0,
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
      const eased = renderedProgress * renderedProgress * (3 - 2 * renderedProgress);
      const scale = 1.035 + eased * 0.205;
      const x = -0.9 * Math.sin(eased * Math.PI) - eased * 0.55;
      const y = eased * 1.1;
      const rotation = Math.sin(eased * Math.PI) * -0.28;
      const light = Math.sin(eased * Math.PI);

      visual.style.setProperty('--terrarium-progress', eased.toFixed(5));
      visual.style.setProperty('--terrarium-scale', scale.toFixed(5));
      visual.style.setProperty('--terrarium-x', `${x.toFixed(4)}%`);
      visual.style.setProperty('--terrarium-y', `${y.toFixed(4)}%`);
      visual.style.setProperty('--terrarium-rotate', `${rotation.toFixed(4)}deg`);
      visual.style.setProperty('--terrarium-light', (light * 0.18).toFixed(5));
      visual.style.setProperty('--terrarium-shadow', (eased * 0.2).toFixed(5));
      visual.dataset.photoScale = scale.toFixed(4);
      visual.dataset.photoProgress = eased.toFixed(4);
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
      data-photo-scale="1.0350"
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
      <span className={styles.photoShadow} aria-hidden="true" />
    </div>
  );
}
