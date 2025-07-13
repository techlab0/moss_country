import React from 'react';
import Image from 'next/image';
import { DEFAULT_IMAGE } from '@/lib/imageUtils';

interface ImagePlaceholderProps {
  src?: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallbackGradient?: string;
  priority?: boolean;
}

export const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
<<<<<<< HEAD
  fallbackGradient = 'from-moss-green to-warm-brown',
=======
>>>>>>> clean-main
  priority = false,
}) => {
  // 画像パスが指定されている場合は Image コンポーネントを使用
  // 指定されていない場合はデフォルト画像を使用
  const imageSrc = src || DEFAULT_IMAGE;
  
  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      style={{ objectFit: 'cover' }}
    />
  );
};