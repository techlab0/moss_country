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
  // 売上集計（商品別明細）でこの商品を合算する売上項目のID。未設定の場合は商品名でそのまま表示される。
  salesItemId?: string | null
  /** 管理画面の一覧表示用。1枚目の画像のURL（Sanity CDN） */
  thumbnailUrl?: string | null
  // 公開/非表示フラグ。未設定（undefined）は表示扱い（既存商品の後方互換デフォルト）。
  // false の場合はストアフロントの一覧・詳細・sitemapから完全に除外される。
  isVisible?: boolean
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
  category?: string
  tags?: string[]
  // Sanityスキーマ・GROQクエリ・書き込み処理はすべて isPublished を使っている。
  // ここだけ published になっており、管理画面の公開状態の判定が型と噛み合っていなかった。
  isPublished: boolean
}

export interface FAQ {
  _id: string
  _type: 'faq'
  question: string
  answer: string
  category?: string
  order?: number
}

/**
 * Sanityの画像アセット。
 * GROQで参照のまま取得すると { _ref, _type: 'reference' }、`asset->` で展開すると
 * { _id, url } が返る。呼び出し側はどちらも受け取りうるため両方を表現する。
 */
export interface SanityImageAsset {
  _ref?: string
  _type?: 'reference' | 'sanity.imageAsset'
  _id?: string
  url?: string
  /** asset-> で展開したときにだけ含まれる */
  metadata?: {
    dimensions?: {
      width: number
      height: number
      aspectRatio: number
    }
    /** ぼかしプレースホルダ用のBase64画像 */
    lqip?: string
  }
}

export interface SanityImage {
  _type: 'image'
  asset: SanityImageAsset
  /** 代替テキスト。Sanity側で画像ごとに設定できる */
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
}

export interface SanitySlug {
  _type: 'slug'
  current: string
}

/** 苔図鑑の画像。Sanity側でキャプションを設定できる */
export type MossSpeciesImage = SanityImage & {
  caption?: string
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
  images: MossSpeciesImage[]
  characteristics: {
    beginnerFriendly: 1 | 2 | 3 | 4 | 5
    waterRequirement: 'low' | 'medium' | 'high'
    lightRequirement: 'weak' | 'medium' | 'strong'
    temperatureAdaptability: 'cold' | 'temperate' | 'warm'
    growthSpeed?: 'slow' | 'normal' | 'fast'
    growthDescription?: string
  }
  /**
   * 管理画面はテキストエリアで文字列として保存し、公開ページも文字列としてのみ描画する。
   * Sanity Studio経由で作られた古いドキュメントはオブジェクトのことがあるため両方を許す。
   */
  basicInfo?: string | {
    habitat?: string
    appearance?: string
    characteristics?: string
  }
  /** basicInfo と同じ経緯で文字列とオブジェクトの両方がありうる */
  supplementaryInfo?: string | {
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
  /**
   * practicalAdvice に改名される前の旧フィールド。
   * 改名前に作られたドキュメントにだけ残っており、GROQでも互換のため取得している。
   * 新規に書き込むことはない。
   */
  practicalInfo?: {
    workshopUsage?: boolean
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