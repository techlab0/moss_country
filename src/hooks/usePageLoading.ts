'use client';

import { useEffect } from 'react';
import { usePageLoading } from '@/components/providers/PageLoadingProvider';

interface UsePageLoadingOptions {
  customMinTime?: number;
  customMaxTime?: number;
  customMessage?: string;
  waitForImages?: boolean;
  waitForFonts?: boolean;
}

export const useCustomPageLoading = (options: UsePageLoadingOptions = {}) => {
  const { forceShow, forceHide, setProgress } = usePageLoading();
  
  const {
    customMinTime = 1000,
    customMaxTime = 8000,
    customMessage,
    waitForImages = true,
    waitForFonts = false
  } = options;

  useEffect(() => {
    let mounted = true;
    
    const startCustomLoading = async () => {
      forceShow();
      
      const promises: Promise<void>[] = [];
      
      // 画像の読み込み待機
      if (waitForImages) {
        promises.push(waitForAllImages());
      }
      
      // フォントの読み込み待機
      if (waitForFonts) {
        promises.push(waitForFonts());
      }
      
      // 最小時間の待機
      promises.push(new Promise(resolve => setTimeout(resolve, customMinTime)));
      
      // 最大時間でタイムアウト
      const maxTimePromise = new Promise<void>(resolve => {
        setTimeout(() => resolve(), customMaxTime);
      });
      
      try {
        await Promise.race([
          Promise.all(promises),
          maxTimePromise
        ]);
      } catch (error) {
        console.warn('Page loading error:', error);
      }
      
      if (mounted) {
        setProgress(100);
        setTimeout(() => {
          if (mounted) {
            forceHide();
          }
        }, 300);
      }
    };
    
    startCustomLoading();
    
    return () => {
      mounted = false;
    };
  }, [forceShow, forceHide, setProgress, customMinTime, customMaxTime, waitForImages, waitForFonts]);
};

const waitForAllImages = (): Promise<void> => {
  return new Promise((resolve) => {
    const images = document.querySelectorAll('img');
    if (images.length === 0) {
      resolve();
      return;
    }
    
    let loadedCount = 0;
    const totalImages = images.length;
    
    const checkComplete = () => {
      loadedCount++;
      if (loadedCount >= totalImages) {
        resolve();
      }
    };
    
    images.forEach((img) => {
      if (img.complete) {
        checkComplete();
      } else {
        img.onload = checkComplete;
        img.onerror = checkComplete; // エラーでも進行
      }
    });
  });
};

const waitForFonts = (): Promise<void> => {
  return new Promise((resolve) => {
    if ('fonts' in document) {
      document.fonts.ready.then(() => resolve());
    } else {
      // フォント API をサポートしていない場合は即座に解決
      resolve();
    }
  });
};