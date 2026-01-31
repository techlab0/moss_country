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
    if (!image?.asset) {
      // asset が存在しない場合はデフォルト画像を返す
      return {
        src: '/images/mosscountry_logo.svg',
        alt: image?.alt || '',
        width,
        height,
        quality,
        placeholder: 'empty'
      }
    }

    const asset = image.asset as any

    // 展開形式（url が存在する）の場合
    if (asset.url) {
      // Sanity CDNのURLパラメータを使って最適化
      const baseUrl = asset.url
      const params = new URLSearchParams()
      params.set('w', width.toString())
      if (height) params.set('h', height.toString())
      params.set('q', quality.toString())
      params.set('fm', format)
      params.set('fit', 'max')

      const optimizedUrl = `${baseUrl}?${params.toString()}`

      // ブラープレースホルダー用のURL
      const blurParams = new URLSearchParams()
      blurParams.set('w', '20')
      blurParams.set('h', height ? Math.round((height / width) * 20).toString() : '20')
      blurParams.set('q', '20')
      blurParams.set('blur', '50')
      blurParams.set('fm', 'jpg')

      const blurDataURL = `${baseUrl}?${blurParams.toString()}`

      return {
        src: optimizedUrl,
        alt: image.alt || '',
        width,
        height,
        quality,
        placeholder: 'blur',
        blurDataURL
      }
    }

    // 参照形式（_ref が存在する）の場合
    if (asset._ref) {
      const imageSource = {
        _type: 'image' as const,
        asset: {
          _type: 'reference' as const,
          _ref: asset._ref
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
    }

    // どちらの形式でもない場合はデフォルト画像
    return {
      src: '/images/mosscountry_logo.svg',
      alt: image.alt || '',
      width,
      height,
      quality,
      placeholder: 'empty'
    }
  } catch (error) {
    console.warn('Failed to optimize Sanity image:', error)
    // エラー時はデフォルト画像を返す
    return {
      src: '/images/mosscountry_logo.svg',
      alt: image?.alt || '',
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
    if (!image?.asset) {
      return ''
    }

    const asset = image.asset as any

    // 展開形式（url が存在する）の場合
    if (asset.url) {
      const baseUrl = asset.url
      return widths
        .map(width => {
          const params = new URLSearchParams()
          params.set('w', width.toString())
          params.set('q', '85')
          params.set('fm', format)
          params.set('fit', 'max')
          const url = `${baseUrl}?${params.toString()}`
          return `${url} ${width}w`
        })
        .join(', ')
    }

    // 参照形式（_ref が存在する）の場合
    if (asset._ref) {
      const imageSource = {
        _type: 'image' as const,
        asset: {
          _type: 'reference' as const,
          _ref: asset._ref
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
    }

    return ''
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