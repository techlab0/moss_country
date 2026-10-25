'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ProductImageWithFallback } from './ProductImageWithFallback';

export interface GalleryImage {
  full: string;
  thumb: string;
}

interface ProductImageGalleryProps {
  images: GalleryImage[];
  alt: string;
  fallbackSrc: string;
}

type Point = { x: number; y: number };
type DragState = Point & { originX: number; originY: number };

// スワイプと拡大操作を混同しないため、画像等倍時の横移動だけを画像切り替えに使う。
const SWIPE_THRESHOLD = 50;
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.5;

function distanceBetweenTouches(touches: React.TouchList): number {
  const first = touches[0];
  const second = touches[1];
  if (!first || !second) return 0;
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

export function ProductImageGallery({ images, alt, fallbackSrc }: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(MIN_SCALE);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const mainTouchStart = useRef<Point | null>(null);
  const suppressOpen = useRef(false);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const modalFrameRef = useRef<HTMLDivElement | null>(null);
  const modalSwipeStart = useRef<Point | null>(null);
  const touchPanStart = useRef<DragState | null>(null);
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);
  const modalTouchMoved = useRef(false);
  const suppressModalClick = useRef(false);
  const mouseDragStart = useRef<DragState | null>(null);
  const mouseMoved = useRef(false);
  const scaleRef = useRef(MIN_SCALE);

  const total = images.length;
  const hasMultiple = total > 1;
  const activeImage = images[activeIndex] ?? images[0];

  const constrainPan = useCallback((nextPan: Point, nextScale = scaleRef.current): Point => {
    const frame = modalFrameRef.current;
    if (!frame || nextScale <= MIN_SCALE) return { x: 0, y: 0 };
    const maxX = frame.clientWidth * (nextScale - 1) / 2;
    const maxY = frame.clientHeight * (nextScale - 1) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, nextPan.x)),
      y: Math.max(-maxY, Math.min(maxY, nextPan.y)),
    };
  }, []);

  const resetView = useCallback(() => {
    scaleRef.current = MIN_SCALE;
    setScale(MIN_SCALE);
    setPan({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  const updateScale = useCallback((nextScale: number) => {
    const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
    scaleRef.current = clamped;
    setScale(clamped);
    setPan((current) => constrainPan(current, clamped));
  }, [constrainPan]);

  const showPrevious = useCallback(() => {
    setActiveIndex((current) => (current - 1 + total) % total);
    resetView();
  }, [resetView, total]);

  const showNext = useCallback(() => {
    setActiveIndex((current) => (current + 1) % total);
    resetView();
  }, [resetView, total]);

  const openGallery = useCallback(() => {
    if (suppressOpen.current) return;
    resetView();
    setOpen(true);
  }, [resetView]);

  const closeGallery = useCallback(() => {
    setOpen(false);
    resetView();
  }, [resetView]);

  useEffect(() => {
    const activeThumb = thumbRefs.current[activeIndex];
    activeThumb?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeIndex]);

  useEffect(() => {
    if (!open) return;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeGallery();
      if (event.key === 'ArrowLeft' && hasMultiple) showPrevious();
      if (event.key === 'ArrowRight' && hasMultiple) showNext();
      if (event.key === '+' || event.key === '=') updateScale(scaleRef.current + ZOOM_STEP);
      if (event.key === '-') updateScale(scaleRef.current - ZOOM_STEP);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      openButtonRef.current?.focus();
    };
  }, [closeGallery, hasMultiple, open, showNext, showPrevious, updateScale]);

  if (!activeImage) return null;

  const handleMainTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) {
      mainTouchStart.current = null;
      return;
    }
    const touch = event.touches[0];
    mainTouchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const handleMainTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = mainTouchStart.current;
    const end = event.changedTouches.length === 1 ? event.changedTouches[0] : null;
    mainTouchStart.current = null;
    if (!start || !end || !hasMultiple) return;
    const distanceX = end.clientX - start.x;
    const distanceY = end.clientY - start.y;
    if (Math.abs(distanceX) < SWIPE_THRESHOLD || Math.abs(distanceX) <= Math.abs(distanceY) * 1.25) return;

    suppressOpen.current = true;
    if (distanceX < 0) showNext();
    if (distanceX > 0) showPrevious();
    window.setTimeout(() => { suppressOpen.current = false; }, 250);
  };

  const handleModalTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    modalTouchMoved.current = false;
    if (event.touches.length === 2) {
      suppressModalClick.current = true;
      pinchStart.current = {
        distance: distanceBetweenTouches(event.touches),
        scale: scaleRef.current,
      };
      touchPanStart.current = null;
      modalSwipeStart.current = null;
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;
    pinchStart.current = null;
    if (scaleRef.current > MIN_SCALE) {
      touchPanStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        originX: pan.x,
        originY: pan.y,
      };
      modalSwipeStart.current = null;
    } else {
      modalSwipeStart.current = { x: touch.clientX, y: touch.clientY };
      touchPanStart.current = null;
    }
  };

  const handleModalTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2 && pinchStart.current) {
      event.preventDefault();
      modalTouchMoved.current = true;
      suppressModalClick.current = true;
      const nextDistance = distanceBetweenTouches(event.touches);
      if (pinchStart.current.distance > 0) {
        updateScale(pinchStart.current.scale * nextDistance / pinchStart.current.distance);
      }
      return;
    }

    const touch = event.touches[0];
    const start = touchPanStart.current;
    if (event.touches.length === 1 && touch && start && scaleRef.current > MIN_SCALE) {
      event.preventDefault();
      if (Math.abs(touch.clientX - start.x) > 3 || Math.abs(touch.clientY - start.y) > 3) {
        modalTouchMoved.current = true;
        suppressModalClick.current = true;
      }
      setPan(constrainPan({
        x: start.originX + touch.clientX - start.x,
        y: start.originY + touch.clientY - start.y,
      }));
    }
  };

  const handleModalTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (pinchStart.current) {
      pinchStart.current = null;
      touchPanStart.current = null;
      modalSwipeStart.current = null;
      window.setTimeout(() => { suppressModalClick.current = false; }, 250);
      return;
    }

    if (touchPanStart.current) {
      touchPanStart.current = null;
      if (modalTouchMoved.current) {
        window.setTimeout(() => { suppressModalClick.current = false; }, 250);
      }
      return;
    }

    const start = modalSwipeStart.current;
    const end = event.changedTouches.length === 1 ? event.changedTouches[0] : null;
    modalSwipeStart.current = null;
    if (!start || !end || !hasMultiple || scaleRef.current > MIN_SCALE) return;
    const distanceX = end.clientX - start.x;
    const distanceY = end.clientY - start.y;
    if (Math.abs(distanceX) < SWIPE_THRESHOLD || Math.abs(distanceX) <= Math.abs(distanceY) * 1.25) return;
    suppressModalClick.current = true;
    if (distanceX < 0) showNext();
    if (distanceX > 0) showPrevious();
    window.setTimeout(() => { suppressModalClick.current = false; }, 250);
  };

  const endMouseDrag = () => {
    mouseDragStart.current = null;
    setIsDragging(false);
  };

  return (
    <div className="space-y-3">
      <div
        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white/80"
        onTouchStart={handleMainTouchStart}
        onTouchEnd={handleMainTouchEnd}
      >
        <button
          ref={openButtonRef}
          type="button"
          onClick={openGallery}
          className="group absolute inset-0 flex h-full w-full cursor-zoom-in items-center justify-center"
          aria-label={`${alt}の画像を拡大表示`}
        >
          <ProductImageWithFallback
            src={activeImage.full}
            alt={`${alt} ${activeIndex + 1}`}
            width={1200}
            height={1200}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            fallbackSrc={fallbackSrc}
          />
          <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-3 py-1.5 text-xs text-white backdrop-blur-xs">
            画像を拡大
          </span>
        </button>

        {hasMultiple && (
          <>
            <button type="button" onClick={(event) => { event.stopPropagation(); showPrevious(); }} aria-label="前の画像へ" className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60">
              <span aria-hidden="true" className="text-xl leading-none">‹</span>
            </button>
            <button type="button" onClick={(event) => { event.stopPropagation(); showNext(); }} aria-label="次の画像へ" className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60">
              <span aria-hidden="true" className="text-xl leading-none">›</span>
            </button>
            <div className="absolute bottom-2 right-2 z-10 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{activeIndex + 1} / {total}</div>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              ref={(element) => { thumbRefs.current[index] = element; }}
              onClick={() => setActiveIndex(index)}
              aria-label={`${alt} ${index + 1}を表示`}
              aria-current={index === activeIndex}
              className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white/80 transition-opacity sm:h-24 sm:w-24 ${index === activeIndex ? 'ring-2 ring-moss-green opacity-100' : 'opacity-70 hover:opacity-100'}`}
            >
              <ProductImageWithFallback src={image.thumb} alt={`${alt} ${index + 1}のサムネイル`} width={96} height={96} className="h-full w-full object-contain" fallbackSrc={fallbackSrc} />
            </button>
          ))}
        </div>
      )}

      {open && createPortal(
        <div className="fixed inset-0 z-[1100] grid h-screen h-[100svh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-black p-3 md:p-5" role="dialog" aria-modal="true" aria-label={`${alt}の拡大画像ギャラリー`}>
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-white/15 pb-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white md:text-base">{alt}</p>
              <p className="text-xs text-white/65">クリックまたは＋−で拡大。拡大後はドラッグできます。</p>
            </div>
            <button ref={closeButtonRef} type="button" onClick={closeGallery} className="min-h-12 min-w-28 shrink-0 rounded-full bg-white px-6 py-3 text-base font-bold text-stone-900 shadow-xl hover:bg-stone-100" aria-label="拡大画像を閉じる">
              閉じる ×
            </button>
          </div>

          <div
            ref={modalFrameRef}
            className={`relative flex min-h-0 items-center justify-center overflow-hidden bg-black [touch-action:none] ${scale > MIN_SCALE ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'}`}
            onClick={() => {
              if (suppressModalClick.current) return;
              if (mouseMoved.current) {
                mouseMoved.current = false;
                return;
              }
              updateScale(scaleRef.current > MIN_SCALE ? MIN_SCALE : 2);
            }}
            onMouseDown={(event) => {
              if (scaleRef.current <= MIN_SCALE) return;
              event.preventDefault();
              mouseMoved.current = false;
              mouseDragStart.current = { x: event.clientX, y: event.clientY, originX: pan.x, originY: pan.y };
              setIsDragging(true);
            }}
            onMouseMove={(event) => {
              const start = mouseDragStart.current;
              if (!start) return;
              const distanceX = event.clientX - start.x;
              const distanceY = event.clientY - start.y;
              if (Math.abs(distanceX) > 3 || Math.abs(distanceY) > 3) mouseMoved.current = true;
              setPan(constrainPan({ x: start.originX + distanceX, y: start.originY + distanceY }));
            }}
            onMouseUp={endMouseDrag}
            onMouseLeave={endMouseDrag}
            onTouchStart={handleModalTouchStart}
            onTouchMove={handleModalTouchMove}
            onTouchEnd={handleModalTouchEnd}
            onTouchCancel={() => {
              pinchStart.current = null;
              touchPanStart.current = null;
              modalSwipeStart.current = null;
            }}
          >
            <div className={`pointer-events-none flex h-full w-full select-none items-center justify-center ${isDragging ? '' : 'transition-transform duration-150'}`} style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})` }}>
              <ProductImageWithFallback src={activeImage.full} alt={`${alt}の拡大画像 ${activeIndex + 1}`} width={1200} height={1200} className="h-full w-full select-none object-contain" fallbackSrc={fallbackSrc} />
            </div>

            {hasMultiple && scale === MIN_SCALE && (
              <>
                <button type="button" onClick={(event) => { event.stopPropagation(); showPrevious(); }} className="absolute left-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-3xl text-white hover:bg-stone-800 md:left-4" aria-label="前の画像">‹</button>
                <button type="button" onClick={(event) => { event.stopPropagation(); showNext(); }} className="absolute right-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-3xl text-white hover:bg-stone-800 md:right-4" aria-label="次の画像">›</button>
              </>
            )}
          </div>

          <div className="border-t border-white/15 pt-2 text-white">
            <div className="flex items-center justify-center gap-2">
              <button type="button" onClick={() => updateScale(scaleRef.current - ZOOM_STEP)} disabled={scale <= MIN_SCALE} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl hover:bg-white/25 disabled:opacity-35" aria-label="縮小">−</button>
              <button type="button" onClick={() => updateScale(MIN_SCALE)} className="min-w-20 rounded-full bg-white/10 px-3 py-2 text-sm hover:bg-white/20" aria-label="拡大率を100パーセントに戻す">{Math.round(scale * 100)}%</button>
              <button type="button" onClick={() => updateScale(scaleRef.current + ZOOM_STEP)} disabled={scale >= MAX_SCALE} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl hover:bg-white/25 disabled:opacity-35" aria-label="拡大">＋</button>
            </div>

            {hasMultiple && (
              <div className="mt-2 flex justify-center gap-2 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button key={index} type="button" onClick={() => { setActiveIndex(index); resetView(); }} className={`h-12 w-14 shrink-0 overflow-hidden rounded-md border-2 md:h-14 md:w-16 ${index === activeIndex ? 'border-emerald-400' : 'border-transparent opacity-65 hover:opacity-100'}`} aria-label={`${index + 1}枚目の画像を表示`}>
                    <ProductImageWithFallback src={image.thumb} alt="" width={64} height={56} className="h-full w-full object-contain" fallbackSrc={fallbackSrc} />
                  </button>
                ))}
              </div>
            )}
            <p className="mt-1 text-center text-xs text-white/70">{activeIndex + 1}/{total}<span className="ml-3 md:hidden">2本指で拡大・縮小できます</span></p>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
