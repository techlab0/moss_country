'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { WorkshopCourseImage } from '@/types/sanity';
import { imageObjectPosition } from '@/lib/imagePosition';

export function WorkshopCourseGallery({
  images,
  courseName,
  compact = false,
}: {
  images?: WorkshopCourseImage[];
  courseName: string;
  compact?: boolean;
}) {
  const visibleImages = useMemo(() => (images || []).filter((image) => Boolean(image.url)).slice(0, 5), [images]);
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const showPrevious = useCallback(() => setCurrentIndex((index) => (index - 1 + visibleImages.length) % visibleImages.length), [visibleImages.length]);
  const showNext = useCallback(() => setCurrentIndex((index) => (index + 1) % visibleImages.length), [visibleImages.length]);

  useEffect(() => {
    if (!open) return;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const previousOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'ArrowLeft' && visibleImages.length > 1) showPrevious();
      if (event.key === 'ArrowRight' && visibleImages.length > 1) showNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, showNext, showPrevious, visibleImages.length]);

  if (visibleImages.length === 0) return null;
  const mainImage = visibleImages[0];
  const currentImage = visibleImages[currentIndex] || mainImage;

  return (
    <>
      <button
        type="button"
        onClick={() => { setCurrentIndex(0); setOpen(true); }}
        className={`group relative mb-4 block w-full overflow-hidden rounded-xl bg-stone-200 ${compact ? 'aspect-[16/10]' : 'aspect-[4/3]'}`}
        aria-label={`${courseName}の写真を拡大表示`}
      >
        <img src={mainImage.url} alt={mainImage.alt || `${courseName}の完成イメージ`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" style={{ objectPosition: imageObjectPosition(mainImage) }} />
        <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
          写真を見る{visibleImages.length > 1 ? ` 1/${visibleImages.length}` : ''}
        </span>
      </button>

      {open && createPortal(
        <div className="fixed inset-x-0 top-0 z-[1000] grid h-screen h-[100svh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-black p-3 md:p-5" role="dialog" aria-modal="true" aria-label={`${courseName}の写真ギャラリー`}>
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-white/15 pb-3">
            <p className="min-w-0 truncate text-sm font-medium text-white md:text-base">{courseName}</p>
            <button type="button" onClick={() => setOpen(false)} className="min-h-12 min-w-28 shrink-0 rounded-full bg-white px-6 py-3 text-base font-bold text-stone-900 shadow-xl hover:bg-stone-100" aria-label="ギャラリーを閉じる">閉じる ×</button>
          </div>
          <div
            className="relative flex min-h-0 items-center justify-center overflow-hidden bg-black [touch-action:pan-y_pinch-zoom]"
            onTouchStart={(event) => {
              if (event.touches.length !== 1) {
                touchStart.current = null;
                return;
              }
              const touch = event.touches[0];
              touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
            }}
            onTouchMove={(event) => {
              if (event.touches.length !== 1) touchStart.current = null;
            }}
            onTouchEnd={(event) => {
              const start = touchStart.current;
              const end = event.changedTouches.length === 1 ? event.changedTouches[0] : null;
              touchStart.current = null;
              if (!start || !end || visibleImages.length < 2) return;
              const distanceX = end.clientX - start.x;
              const distanceY = end.clientY - start.y;
              if (Math.abs(distanceX) < 50 || Math.abs(distanceX) <= Math.abs(distanceY) * 1.25) return;
              if (distanceX < 0) showNext();
              if (distanceX > 0) showPrevious();
            }}
            onTouchCancel={() => { touchStart.current = null; }}
          >
            <img src={currentImage.url} alt={currentImage.alt || `${courseName}の写真${currentIndex + 1}`} className="h-full w-full select-none object-contain" draggable={false} />
            {visibleImages.length > 1 && (
              <>
                <button type="button" onClick={showPrevious} className="absolute left-2 flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-3xl text-white hover:bg-stone-800 md:left-4" aria-label="前の写真">‹</button>
                <button type="button" onClick={showNext} className="absolute right-2 flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-3xl text-white hover:bg-stone-800 md:right-4" aria-label="次の写真">›</button>
              </>
            )}
          </div>
          <div className="border-t border-white/15 pt-2">
            <div className="flex justify-center gap-2 overflow-x-auto pb-1">
              {visibleImages.map((image, index) => (
                <button key={image._key || index} type="button" onClick={() => setCurrentIndex(index)} className={`h-14 w-16 shrink-0 overflow-hidden rounded-md border-2 md:h-16 md:w-20 ${index === currentIndex ? 'border-emerald-400' : 'border-transparent opacity-65 hover:opacity-100'}`} aria-label={`${index + 1}枚目の写真を表示`}>
                  <img src={image.url} alt="" className="h-full w-full object-cover" style={{ objectPosition: imageObjectPosition(image) }} />
                </button>
              ))}
            </div>
            <p className="mt-1 text-center text-sm text-white">{currentIndex + 1}/{visibleImages.length}</p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
