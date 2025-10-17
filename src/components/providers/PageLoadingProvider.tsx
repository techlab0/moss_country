'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { getPageLoadingConfig, LOADING_CONFIG } from '@/config/loading';

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
  const pageConfig = getPageLoadingConfig(pathname);
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
  }, [pathname]);

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
    
    const checkImagesLoaded = () => {
      const images = document.querySelectorAll('img');
      const imagePromises = Array.from(images).map((img) => {
        return new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve(); // エラーでも続行
          }
        });
      });

      Promise.all(imagePromises).then(() => {
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
      document.removeEventListener('DOMContentLoaded', checkImagesLoaded);
    };
  }, [pathname]);

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

  // プログレス更新ロジック
  useEffect(() => {
    if (!isLoading || !pageConfig) return;

    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 20;
      });
    }, 100);

    return () => clearInterval(progressTimer);
  }, [isLoading, pathname]);

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