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

  try {
    // asset が参照形式か展開形式かを判定
    const hasRef = image.asset && typeof image.asset === 'object' && '_ref' in image.asset

    if (!hasRef) {
      // asset が存在しない、または参照がない場合はデフォルト画像を返す
      return {
        src: '/images/mosscountry_logo.svg',
        alt: image.alt || '',
        width,
        height,
        quality,
        placeholder: 'empty'
      }
    }

    // 参照形式の画像オブジェクトを作成
    const imageSource = {
      _type: 'image' as const,
      asset: {
        _type: 'reference' as const,
        _ref: (image.asset as { _ref: string })._ref
      }
    }

    let builder = urlFor(imageSource)
      .width(width)
      .quality(quality)
      .format(format)

    if (height) {
      builder = builder.height(height)
    }

    // 低品質版をブラープレースホルダーとして生成
    const blurDataURL = urlFor(imageSource)
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
  } catch (error) {
    console.warn('Failed to optimize Sanity image:', error)
    // エラー時はデフォルト画像を返す
    return {
      src: '/images/mosscountry_logo.svg',
      alt: image.alt || '',
      width,
      height,
      quality,
      placeholder: 'empty'
    }
  }
}

// レスポンシブ画像のsrcsetを生成
export function generateSrcSet(
  image: SanityImage,
  widths: number[] = [320, 480, 640, 768, 1024, 1280, 1600],
  format: 'webp' | 'avif' | 'jpg' | 'png' = 'webp'
): string {
  try {
    // asset が参照形式か確認
    const hasRef = image.asset && typeof image.asset === 'object' && '_ref' in image.asset

    if (!hasRef) {
      return ''
    }

    // 参照形式の画像オブジェクトを作成
    const imageSource = {
      _type: 'image' as const,
      asset: {
        _type: 'reference' as const,
        _ref: (image.asset as { _ref: string })._ref
      }
    }

    return widths
      .map(width => {
        const url = urlFor(imageSource)
          .width(width)
          .quality(85)
          .format(format)
          .url()
        return `${url} ${width}w`
      })
      .join(', ')
  } catch (error) {
    console.warn('Failed to generate srcset:', error)
    return ''
  }
}

// 画像の寸法を取得（アスペクト比計算用）
export function getImageDimensions(image: SanityImage): { width: number; height: number } {
  try {
    // Sanity画像のmetadataから寸法を取得（展開された asset の場合）
    const dimensions = image.asset?.metadata?.dimensions
    if (dimensions && dimensions.width && dimensions.height) {
      return {
        width: dimensions.width,
        height: dimensions.height
      }
    }
  } catch (error) {
    console.warn('Failed to get image dimensions:', error)
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