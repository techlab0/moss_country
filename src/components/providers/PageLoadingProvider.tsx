'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { getPageLoadingConfig, LOADING_CONFIG } from '@/config/loading';
import { shouldWaitForInitialImage } from '@/lib/pageLoadingImages';

interface PageLoadingContextType {
  isLoading: boolean;
  progress: number;
  setProgress: (progress: number) => void;
  forceShow: () => void;
  forceHide: () => void;
}

const PageLoadingContext = createContext<PageLoadingContextType | undefined>(undefined);

export const usePageLoading = () => {
  const context = useContext(PageLoadingContext);
  if (!context) {
    throw new Error('usePageLoading must be used within a PageLoadingProvider');
  }
  return context;
};

interface PageLoadingProviderProps {
  children: ReactNode;
  maxLoadingTime?: number; // 最大ローディング時間（ミリ秒）
  minLoadingTime?: number; // 最小ローディング時間（ミリ秒）
}

export const PageLoadingProvider: React.FC<PageLoadingProviderProps> = ({ 
  children, 
  maxLoadingTime = 5000, // デフォルト5秒
  minLoadingTime = 800    // デフォルト0.8秒（UX向上のため）
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const pathname = usePathname();
  
  // ページ設定を取得
  // 依存配列に入れても再実行が増えないよう、pathname が変わったときだけ作り直す
  const pageConfig = useMemo(() => getPageLoadingConfig(pathname), [pathname]);
  const actualMaxTime = pageConfig?.maxTime || maxLoadingTime;
  const actualMinTime = pageConfig?.minTime || minLoadingTime;

  // ページ変更時にローディング開始
  useEffect(() => {
    // 除外パスではローディングを表示しない
    if (!pageConfig) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setProgress(0);
    setImagesLoaded(false);
    setMinTimeElapsed(false);
  }, [pathname, pageConfig]);

  // 最小時間タイマー
  useEffect(() => {
    if (!pageConfig) return;
    
    const minTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, actualMinTime);

    return () => clearTimeout(minTimer);
  }, [pathname, actualMinTime, pageConfig]);

  // 最大時間タイマー
  useEffect(() => {
    if (!pageConfig) return;
    
    const maxTimer = setTimeout(() => {
      setIsLoading(false);
    }, actualMaxTime);

    return () => clearTimeout(maxTimer);
  }, [pathname, actualMaxTime, pageConfig]);

  // 画像読み込み検知
  useEffect(() => {
    if (!pageConfig) return;

    let cancelled = false;
    const cleanupImageListeners: Array<() => void> = [];

    const checkImagesLoaded = () => {
      // 画面外の lazy 画像まで待つと、その画像はスクロールするまで読み込まれず、
      // ページ自体は表示できるのにローディング画面だけが最大時間まで残ってしまう。
      // 最初の画面に必要な画像だけを待ち、下部画像はブラウザ本来の遅延読込へ任せる。
      const images = Array.from(document.querySelectorAll('img')).filter((img) => {
        const rect = img.getBoundingClientRect();
        return shouldWaitForInitialImage({
          loading: img.loading,
          fetchPriority: img.fetchPriority,
          top: rect.top,
          bottom: rect.bottom,
          viewportHeight: window.innerHeight,
          deferredBackground: img.dataset.deferredHomeBackground === 'true',
        });
      });

      const imagePromises = images.map((img) => {
        return new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            // 既存の onload を上書きせず、画像部品側の処理と共存する。
            const finish = () => resolve();
            img.addEventListener('load', finish, { once: true });
            img.addEventListener('error', finish, { once: true });
            cleanupImageListeners.push(() => {
              img.removeEventListener('load', finish);
              img.removeEventListener('error', finish);
            });
          }
        });
      });

      Promise.all(imagePromises).then(() => {
        if (cancelled) return;
        // 100%に到達したら即座にローディング終了条件を満たす
        setProgress(100);
        setImagesLoaded(true);
      });
    };

    // DOM読み込み完了後に画像チェック
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkImagesLoaded);
    } else {
      checkImagesLoaded();
    }

    return () => {
      cancelled = true;
      document.removeEventListener('DOMContentLoaded', checkImagesLoaded);
      cleanupImageListeners.forEach((cleanup) => cleanup());
    };
  }, [pathname, pageConfig]);

  // ローディング終了条件
  useEffect(() => {
    if (imagesLoaded && minTimeElapsed) {
      // 少し遅延してからフェードアウト
      const hideTimer = setTimeout(() => {
        setIsLoading(false);
      }, 200);

      return () => clearTimeout(hideTimer);
    }
  }, [imagesLoaded, minTimeElapsed]);

  // 100%に到達したら即座に終了
  useEffect(() => {
    if (progress >= 100 && minTimeElapsed) {
      const immediateHideTimer = setTimeout(() => {
        setIsLoading(false);
      }, 100); // 最小限の遅延

      return () => clearTimeout(immediateHideTimer);
    }
  }, [progress, minTimeElapsed]);

  // プログレス更新ロジック
  useEffect(() => {
    if (!isLoading || !pageConfig) return;

    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        // 100%を超えないように制限
        const newProgress = prev + Math.random() * 20;
        return Math.min(newProgress, 100);
      });
    }, 100);

    return () => clearInterval(progressTimer);
  }, [isLoading, pathname, pageConfig]);

  const forceShow = () => setIsLoading(true);
  const forceHide = () => setIsLoading(false);

  const loadingMessage = (() => {
    if (pageConfig?.message && progress < 30) return pageConfig.message;
    if (progress < 30) return LOADING_CONFIG.MESSAGES.LOADING;
    if (progress < 70) return LOADING_CONFIG.MESSAGES.IMAGES;
    if (progress < 90) return LOADING_CONFIG.MESSAGES.ALMOST_DONE;
    return LOADING_CONFIG.MESSAGES.FINALIZING;
  })();

  return (
    <PageLoadingContext.Provider value={{ 
      isLoading, 
      progress, 
      setProgress, 
      forceShow, 
      forceHide 
    }}>
      {children}
      {isLoading && (
        <LoadingScreen 
          message={loadingMessage} 
          progress={progress}
          showProgress={true}
        />
      )}
    </PageLoadingContext.Provider>
  );
};
