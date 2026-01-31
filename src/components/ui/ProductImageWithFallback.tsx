'use client';

import React from 'react';

const DEFAULT_FALLBACK = '/images/mosscountry_logo.svg';

interface ProductImageWithFallbackProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackSrc?: string;
}

/**
 * 画像読み込み失敗時にフォールバックを表示する img（Client Component）。
 * Server Component からは onError を渡せないため、このコンポーネントでラップする。
 */
export function ProductImageWithFallback({
  src,
  alt,
  width,
  height,
  className,
  fallbackSrc = DEFAULT_FALLBACK,
}: ProductImageWithFallbackProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={(e) => {
        e.currentTarget.src = fallbackSrc;
      }}
    />
  );
}
