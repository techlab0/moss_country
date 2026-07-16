export interface SimpleWorkshop {
  _id: string
  title: string
  description: string
  price?: number
  duration?: string
}

export interface Product {
  _id: string
  _type: 'product'
  name: string
  // あいうえお順の並び替え用ふりがな（ひらがな）。未入力の場合は name をフォールバックに使用する。
  nameReading?: string
  slug: {
    current: string
    _type: 'slug'
  }
  price: number
  description?: string
  category: string
  images?: {
    _type: 'image'
    asset: {
      _ref: string
      _type: 'reference'
    }
    alt?: string
    hotspot?: {
      x: number
      y: number
      height: number
      width: number
    }
    crop?: {
      top: number
      bottom: number
      left: number
      right: number
    }
  }[]
  featured: boolean
  inStock: boolean
  dimensions?: {
    width?: number
    height?: number
    depth?: number
  }
  // 商品重量（グラム単位）。Sanityスキーマの weight フィールド。送料計算に使用。
  weight?: number
  // 割れ物フラグ。送料の割れ物加算に使用。
  fragile?: boolean
  materials?: string[]
  careInstructions?: string
  sortOrder?: number
  // 在庫数。未設定（undefined）の場合は在庫あり扱い（既存アダプタのデフォルト挙動）。
  stockQuantity?: number
  // 予約済み（受注済み未出荷）数量。availableStock = stockQuantity - reserved の計算に使用。
  reserved?: number
  // 在庫少と判定する閾値。管理画面の在庫ステータス判定に使用。
  lowStockThreshold?: number
}

export interface BlogPost {
  _id: string
  _type: 'blogPost'
  title: string
  slug: {
    current: string
    _type: 'slug'
  }
  author: string
  publishedAt: string
  excerpt?: string
  content: Array<{
    _type: string
    [key: string]: unknown
  }> // Portable Text
  featuredImage?: {
    _type: 'image'
    asset: {
      _ref: string
      _type: 'reference'
    }
    hotspot?: {
      x: number
      y: number
      height: number
      width: number
    }
    crop?: {
      top: number
      bottom: number
      left: number
      right: number
    }
  }
  category?: string
  tags?: string[]
  published: boolean
}

export interface FAQ {
  _id: string
  _type: 'faq'
  question: string
  answer: string
  category?: string
  order?: number
}

export interface SanityImageAsset {
  _ref: string
  _type: 'reference'
}

export interface SanityImage {
  _type: 'image'
  asset: SanityImageAsset
  hotspot?: {
    x: number
    y: number
    height: number
    width: number
  }
  crop?: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

export interface SanitySlug {
  _type: 'slug'
  current: string
}

export interface MossSpecies {
  _id: string
  _type: 'mossSpecies'
  name: string
  commonNames?: string[]
  slug: SanitySlug
  description: Array<{
    _type: string
    [key: string]: unknown
  }> // Portable Text
  images: (SanityImage & {
    caption?: string
  })[]
  characteristics: {
    beginnerFriendly: 1 | 2 | 3 | 4 | 5
    waterRequirement: 'low' | 'medium' | 'high'
    lightRequirement: 'weak' | 'medium' | 'strong'
    temperatureAdaptability: 'cold' | 'temperate' | 'warm'
    growthSpeed?: 'slow' | 'normal' | 'fast'
    growthDescription?: string
  }
  basicInfo?: {
    habitat?: string
    appearance?: string
    characteristics?: string
  }
  supplementaryInfo?: {
    distribution?: string
    collectionSeason?: ('spring' | 'summer' | 'autumn' | 'winter')[]
    winterCare?: string
    additionalNotes?: string
  }
  practicalAdvice?: {
    workshopUsage: boolean
    difficultyPoints?: string[]
    successTips?: string[]
    careInstructions?: string
  }
  category: 'moss' | 'liverwort' | 'hornwort'
  tags?: string[]
  featured: boolean
  publishedAt: string
  isVisible: boolean
  sortOrder?: number
}

export interface HeroImageSettings {
  _id: string
  _type: 'heroImageSettings'
  main?: {
    image?: SanityImage
    alt?: string
  }
  products?: {
    image?: SanityImage
    alt?: string
  }
  workshop?: {
    image?: SanityImage
    alt?: string
  }
  story?: {
    image?: SanityImage
    alt?: string
  }
  store?: {
    image?: SanityImage
    alt?: string
  }
  mossGuide?: {
    image?: SanityImage
    alt?: string
  }
  blog?: {
    image?: SanityImage
    alt?: string
  }
  contact?: {
    image?: SanityImage
    alt?: string
  }
  updatedAt?: string
}

// 背景画像の共通型
interface BackgroundImagePage {
  image?: SanityImage
  imageMobile?: SanityImage
  alt?: string
}

export interface BackgroundImageSettings {
  _id: string
  _type: 'backgroundImageSettings'
  main?: BackgroundImagePage
  products?: BackgroundImagePage
  workshop?: BackgroundImagePage
  story?: BackgroundImagePage
  store?: BackgroundImagePage
  mossGuide?: BackgroundImagePage
  blog?: BackgroundImagePage
  contact?: BackgroundImagePage
  updatedAt?: string
}