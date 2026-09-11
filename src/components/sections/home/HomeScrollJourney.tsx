'use client';

import type { ReactNode } from 'react';
import styles from './HomeScrollJourney.module.css';

interface HomeScrollJourneyProps {
  children: ReactNode;
}

export function HomeScrollJourney({ children }: HomeScrollJourneyProps) {
  return (
    <div className={styles.journey} data-home-journey>
      {children}
    </div>
  );
}
