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
  materials?: string[]
  careInstructions?: string
  sortOrder?: number
  shipping?: {
    carrier: 'yupack' | 'yumail' | 'takkyubin' | 'letterpack' | 'sagawa'
    weight: number // グラム単位
    fragile?: boolean // 割れ物
    special?: string // 特別な配送指示
  }
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
    growthSpeed: 'slow' | 'normal' | 'fast'
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