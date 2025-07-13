export interface Workshop {
  _id: string
  _type: 'workshop'
  title: string
  slug: {
    current: string
    _type: 'slug'
  }
  category: string
  description: string
  price: number
  capacity: number
  image?: {
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
  features: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  schedule: {
    date: string
    availableSlots: number
  }[]
}

export interface SimpleWorkshop {
  _id: string
  _type: 'simpleWorkshop'
  title: string
  description: string
  price: number
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