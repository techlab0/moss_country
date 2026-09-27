'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { getCurrentHomeSeason, type HomeSeason } from '@/lib/homeSeason';
import styles from './SeasonalAtmosphere.module.css';

const PARTICLE_COUNT = 18;
const SEASON_LABELS: Record<HomeSeason, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
};

type ParticleStyle = CSSProperties & Record<`--${string}`, string>;

function particleStyle(index: number): ParticleStyle {
  const drift = ((index % 7) - 3) * 18;
  const sway = index % 2 === 0 ? 22 + (index % 4) * 5 : -22 - (index % 4) * 5;
  return {
    '--particle-x': `${(index * 37 + 9) % 100}%`,
    '--particle-y': `${(index * 29 + 7) % 88}%`,
    '--particle-delay': `${-((index * 1.73) % 12).toFixed(2)}s`,
    '--particle-duration': `${(9 + (index % 6) * 1.35).toFixed(2)}s`,
    '--particle-drift': `${drift}px`,
    '--particle-sway': `${sway}px`,
    '--particle-sway-back': `${Math.round(sway * -0.62)}px`,
    '--particle-rotation': `${index % 2 === 0 ? 420 + index * 11 : -390 - index * 13}deg`,
    '--particle-scale': `${(0.7 + (index % 5) * 0.11).toFixed(2)}`,
  };
}

export function SeasonalAtmosphere() {
  const [season, setSeason] = useState<HomeSeason | null>(null);

  useEffect(() => {
    setSeason(getCurrentHomeSeason());
  }, []);

  if (!season) return null;

  return (
    <div
      aria-hidden="true"
      data-home-season={season}
      className={`${styles.atmosphere} ${styles[season]}`}
      title={`${SEASON_LABELS[season]}の背景演出`}
    >
      {Array.from({ length: PARTICLE_COUNT }, (_, index) => (
        <span key={index} className={styles.particle} style={particleStyle(index)} />
      ))}
    </div>
  );
}
