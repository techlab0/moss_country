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
  const touchStartX = useRef<number | null>(null);

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
        <div className="fixed inset-0 z-[1000] overflow-y-auto overscroll-contain bg-black/90" role="dialog" aria-modal="true" aria-label={`${courseName}の写真ギャラリー`}>
          <div className="flex min-h-full items-center justify-center px-3 pb-4 pt-16 md:p-8">
            <button type="button" onClick={() => setOpen(false)} className="fixed right-3 top-3 z-20 rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-900 shadow-lg hover:bg-stone-100 md:right-5 md:top-5" aria-label="ギャラリーを閉じる">閉じる ×</button>
            <div className="w-full max-w-5xl">
              <div
                className="relative flex h-[58dvh] min-h-64 items-center justify-center overflow-hidden rounded-xl bg-black md:h-[70dvh]"
                onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
                onTouchEnd={(event) => {
                  const startX = touchStartX.current;
                  const endX = event.changedTouches[0]?.clientX;
                  touchStartX.current = null;
                  if (startX == null || endX == null || visibleImages.length < 2) return;
                  if (startX - endX > 40) showNext();
                  if (endX - startX > 40) showPrevious();
                }}
              >
                <img src={currentImage.url} alt={currentImage.alt || `${courseName}の写真${currentIndex + 1}`} className="h-full w-full object-contain" />
                {visibleImages.length > 1 && (
                  <>
                    <button type="button" onClick={showPrevious} className="absolute left-2 rounded-full bg-black/55 p-3 text-2xl text-white hover:bg-black/75" aria-label="前の写真">‹</button>
                    <button type="button" onClick={showNext} className="absolute right-2 rounded-full bg-black/55 p-3 text-2xl text-white hover:bg-black/75" aria-label="次の写真">›</button>
                  </>
                )}
              </div>
              <div className="mt-3 flex justify-center gap-2 overflow-x-auto pb-1">
                {visibleImages.map((image, index) => (
                  <button key={image._key || index} type="button" onClick={() => setCurrentIndex(index)} className={`h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 ${index === currentIndex ? 'border-emerald-400' : 'border-transparent opacity-65 hover:opacity-100'}`} aria-label={`${index + 1}枚目の写真を表示`}>
                    <img src={image.url} alt="" className="h-full w-full object-cover" style={{ objectPosition: imageObjectPosition(image) }} />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-sm text-white">{courseName}　{currentIndex + 1}/{visibleImages.length}</p>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
