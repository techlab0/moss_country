'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { MossGalleryPhoto } from '@/content/mossGallery';

const PAGE_SIZE = 12;

interface MossGalleryProps {
  photos: MossGalleryPhoto[];
}

export function MossGallery({ photos }: MossGalleryProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const closeLightbox = () => setSelectedIndex(null);
  const showPrevious = () => {
    setSelectedIndex((current) => current === null ? null : (current - 1 + photos.length) % photos.length);
  };
  const showNext = () => {
    setSelectedIndex((current) => current === null ? null : (current + 1) % photos.length);
  };

  useEffect(() => {
    if (selectedIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedIndex(null);
      }
      if (event.key === 'ArrowLeft') {
        setSelectedIndex((current) => current === null ? null : (current - 1 + photos.length) % photos.length);
      }
      if (event.key === 'ArrowRight') {
        setSelectedIndex((current) => current === null ? null : (current + 1) % photos.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [photos.length, selectedIndex]);

  const visiblePhotos = photos.slice(0, visibleCount);
  const selectedPhoto = selectedIndex === null ? null : photos[selectedIndex];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {visiblePhotos.map((photo, index) => (
          <button
            key={photo.src}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-emerald-950/40 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
            aria-label={`写真${index + 1}を拡大表示`}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              loading={index === 0 ? 'eager' : 'lazy'}
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
              className="object-cover transition duration-700 ease-out group-hover:scale-[1.035]"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
            <span className="absolute bottom-4 left-4 text-xs tracking-[0.18em] text-white/80">
              SCENE {String(index + 1).padStart(2, '0')}
            </span>
            <span className="absolute bottom-4 right-4 translate-y-2 text-sm text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
              拡大する
            </span>
          </button>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-4">
        <p className="text-sm text-white/50">{photos.length}点中 {visiblePhotos.length}点を表示</p>
        {visibleCount < photos.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, photos.length))}
            className="rounded-full border border-emerald-300/35 px-8 py-3 text-sm text-emerald-100 transition-colors hover:border-emerald-200 hover:bg-emerald-950/60 hover:text-white"
          >
            もっと見る
          </button>
        )}
      </div>

      {selectedPhoto && selectedIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`苔風景写真 ${selectedIndex + 1}`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 px-4 py-16 backdrop-blur-sm sm:px-16"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/40 text-2xl text-white transition hover:border-white sm:right-8 sm:top-6"
            aria-label="拡大表示を閉じる"
          >
            ×
          </button>

          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); showPrevious(); }}
            className="absolute left-3 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/45 text-2xl text-white transition hover:border-white sm:left-7"
            aria-label="前の写真"
          >
            ‹
          </button>

          <div className="relative h-full w-full max-w-7xl" onClick={(event) => event.stopPropagation()}>
            <Image
              src={selectedPhoto.src}
              alt={selectedPhoto.alt}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); showNext(); }}
            className="absolute right-3 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/45 text-2xl text-white transition hover:border-white sm:right-7"
            aria-label="次の写真"
          >
            ›
          </button>

          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm tracking-[0.2em] text-white/65">
            {selectedIndex + 1} / {photos.length}
          </p>
        </div>
      )}
    </>
  );
}
