/**
 * パフォーマンス監視ユーティリティ
 */
export const performanceMonitor = {
  /**
   * パフォーマンス計測開始
   */
  markStart: (name: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(`${name}-start`);
    }
  },

  /**
   * パフォーマンス計測終了
   */
  markEnd: (name: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(`${name}-end`);
      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (error) {
        console.warn(`Failed to measure ${name}:`, error);
      }
    }
  },

  /**
   * 計測結果をログ出力
   */
  logMetrics: () => {
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    const measures = performance.getEntriesByType('measure');
    measures.forEach(measure => {
      console.log(`📊 ${measure.name}: ${measure.duration.toFixed(2)}ms`);
    });

    // Core Web Vitals の取得
    if ('getEntriesByName' in performance) {
      const lcp = performance.getEntriesByName('largest-contentful-paint');
      const fid = performance.getEntriesByName('first-input-delay');
      
      lcp.forEach(entry => {
        console.log(`🎯 LCP (Largest Contentful Paint): ${entry.startTime.toFixed(2)}ms`);
      });
      
      fid.forEach(entry => {
        console.log(`⚡ FID (First Input Delay): ${(entry as any).processingStart - entry.startTime}ms`);
      });
    }
  },

  /**
   * Web Vitals の監視
   */
  observeWebVitals: () => {
    if (typeof window === 'undefined') {
      return;
    }

    // LCP (Largest Contentful Paint) の監視
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            console.log(`🎯 LCP: ${entry.startTime.toFixed(2)}ms`);
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // FID (First Input Delay) の監視
        const fidObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            console.log(`⚡ FID: ${(entry as any).processingStart - entry.startTime}ms`);
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // CLS (Cumulative Layout Shift) の監視
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              console.log(`📐 CLS: ${(entry as any).value.toFixed(4)}`);
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Performance observation failed:', error);
      }
    }
  },

  /**
   * リソース読み込み時間の監視
   */
  logResourceTiming: () => {
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    const resources = performance.getEntriesByType('resource');
    const slowResources = resources
      .filter(resource => resource.duration > 1000) // 1秒以上
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5); // 上位5件

    if (slowResources.length > 0) {
      console.group('🐌 Slow Resources (>1s)');
      slowResources.forEach(resource => {
        console.log(`${resource.name}: ${resource.duration.toFixed(2)}ms`);
      });
      console.groupEnd();
    }
  },

  /**
   * メモリ使用量の監視（Chrome のみ）
   */
  logMemoryUsage: () => {
    if (typeof window === 'undefined') {
      return;
    }

    const memory = (performance as any).memory;
    if (memory) {
      const formatBytes = (bytes: number) => {
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
      };

      console.group('🧠 Memory Usage');
      console.log(`Used: ${formatBytes(memory.usedJSHeapSize)}`);
      console.log(`Total: ${formatBytes(memory.totalJSHeapSize)}`);
      console.log(`Limit: ${formatBytes(memory.jsHeapSizeLimit)}`);
      console.groupEnd();
    }
  }
};

/**
 * パフォーマンス計測用デコレーター
 */
export function measurePerformance(name: string) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;

    descriptor.value = (async function (this: any, ...args: any[]) {
      performanceMonitor.markStart(name);
      try {
        const result = await method.apply(this, args);
        return result;
      } finally {
        performanceMonitor.markEnd(name);
      }
    }) as any;

    return descriptor;
  };
}

/**
 * 開発環境でのパフォーマンス監視初期化
 */
export function initPerformanceMonitoring() {
  if (process.env.NODE_ENV === 'development') {
    performanceMonitor.observeWebVitals();
    
    // 5秒後にメトリクスをログ出力
    setTimeout(() => {
      performanceMonitor.logMetrics();
      performanceMonitor.logResourceTiming();
      performanceMonitor.logMemoryUsage();
    }, 5000);
  }
}