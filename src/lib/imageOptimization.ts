import { urlFor } from '@/lib/sanity'
import type { SanityImage } from '@/types/sanity'

// 画像最適化のヘルパー関数
export interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'avif' | 'jpg' | 'png'
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
}

// Sanity画像のURL生成と最適化
export function optimizeSanityImage(
  image: SanityImage,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'avif' | 'jpg' | 'png'
  } = {}
): OptimizedImageProps {
  const {
    width = 800,
    height,
    quality = 85,
    format = 'webp'
  } = options

  let builder = urlFor(image)
    .width(width)
    .quality(quality)
    .format(format)

  if (height) {
    builder = builder.height(height)
  }

  // 低品質版をブラープレースホルダーとして生成
  const blurDataURL = urlFor(image)
    .width(20)
    .height(height ? Math.round((height / width) * 20) : 20)
    .blur(50)
    .quality(20)
    .format('jpg')
    .url()

  return {
    src: builder.url(),
    alt: image.alt || '',
    width,
    height,
    quality,
    placeholder: 'blur',
    blurDataURL
  }
}

// レスポンシブ画像のsrcsetを生成
export function generateSrcSet(
  image: SanityImage,
  widths: number[] = [320, 480, 640, 768, 1024, 1280, 1600],
  format: 'webp' | 'avif' | 'jpg' | 'png' = 'webp'
): string {
  return widths
    .map(width => {
      const url = urlFor(image)
        .width(width)
        .quality(85)
        .format(format)
        .url()
      return `${url} ${width}w`
    })
    .join(', ')
}

// 画像の寸法を取得（アスペクト比計算用）
export function getImageDimensions(image: SanityImage): { width: number; height: number } {
  // Sanity画像のmetadataから寸法を取得
  const dimensions = image.asset?.metadata?.dimensions
  if (dimensions) {
    return {
      width: dimensions.width,
      height: dimensions.height
    }
  }
  
  // デフォルト値
  return { width: 800, height: 600 }
}

// Next.js Image コンポーネント用の最適化された props
export function getNextImageProps(
  image: SanityImage,
  options: {
    width?: number
    height?: number
    quality?: number
    sizes?: string
    priority?: boolean
  } = {}
): {
  src: string
  alt: string
  width: number
  height: number
  placeholder: 'blur'
  blurDataURL: string
  quality?: number
  sizes?: string
  priority?: boolean
} {
  const dimensions = getImageDimensions(image)
  const {
    width = Math.min(dimensions.width, 800),
    height = Math.min(dimensions.height, 600),
    quality = 85,
    sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    priority = false
  } = options

  const optimized = optimizeSanityImage(image, { width, height, quality })

  return {
    src: optimized.src,
    alt: optimized.alt,
    width,
    height,
    placeholder: 'blur',
    blurDataURL: optimized.blurDataURL!,
    quality,
    sizes,
    priority
  }
}