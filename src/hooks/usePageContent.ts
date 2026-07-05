'use client';

import { useState, useEffect, useCallback } from 'react';
import { registryDefaults } from '@/lib/pageContentRegistry';

interface PageImages {
  [key: string]: { src: string; alt: string };
}

/**
 * 公開ページの文言・画像を返すフック。
 * レジストリのデフォルト（従来のハードコード文言）で即座に描画し、
 * Sanityに上書きが保存されていれば取得後に差し替える。
 * 取得失敗時もデフォルトで表示され続けるため、ページが壊れることはない。
 *
 * 使い方:
 *   const { t, img } = usePageContent('home');
 *   <h2 className="whitespace-pre-line">{t('aboutTitle')}</h2>
 *   <img src={img('workshopImage')} ... />
 */
export function usePageContent(pageId: string) {
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [images, setImages] = useState<PageImages>({});
  const defaults = registryDefaults(pageId);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/page-content?page=${pageId}`)
      .then(res => (res.ok ? res.json() : { texts: {}, images: {} }))
      .then(data => {
        if (cancelled) return;
        setTexts(data.texts || {});
        setImages(data.images || {});
      })
      .catch(() => {
        // 失敗時はデフォルト文言のまま表示する
      });
    return () => {
      cancelled = true;
    };
  }, [pageId]);

  const t = useCallback(
    (key: string): string => texts[key] ?? defaults[key] ?? '',
    // defaultsはレジストリ由来で不変のため依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [texts, pageId]
  );

  const img = useCallback(
    (key: string): string => images[key]?.src ?? defaults[key] ?? '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [images, pageId]
  );

  const imgAlt = useCallback(
    (key: string, fallback: string): string => images[key]?.alt || fallback,
    [images]
  );

  // 上書きが保存されている場合のみ値を返す（レスポンシブな改行など、
  // デフォルト時は元のJSXをそのまま使いたい箇所向け）
  const ov = useCallback(
    (key: string): string | undefined => texts[key],
    [texts]
  );

  return { t, img, imgAlt, ov };
}
