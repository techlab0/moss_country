'use client';

import { useEffect } from 'react';
import { initPerformanceMonitoring } from '@/lib/performance';

export function PerformanceInit() {
  useEffect(() => {
    initPerformanceMonitoring();
  }, []);

  return null; // このコンポーネントは何もレンダリングしない
}