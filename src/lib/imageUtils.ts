// 画像関連のユーティリティ関数
import { getHeroImageSettings, getBackgroundImageSettings } from './sanity';
import { urlFor } from './sanity';
import type { SanityImage } from '@/types/sanity';

export interface ImageInfo {
  src: string;
  alt: string;
  width: number;
  height: number;
}

// 商品画像の定義
export const productImages: Record<string, ImageInfo> = {
  'terrarium-starter': {
    src: '/images/products/terrarium-starter.jpg',
    alt: 'ミニテラリウム スターター - 初心者向けの小さなカプセルテラリウム',
    width: 800,
    height: 600,
  },
  'terrarium-standard': {
    src: '/images/products/terrarium-standard.jpg',
    alt: 'スタンダードテラリウム - バランスの良い中サイズテラリウム',
    width: 800,
    height: 600,
  },
  'terrarium-premium': {
    src: '/images/products/terrarium-premium.jpg',
    alt: 'プレミアムガーデン - 厳選素材の高級テラリウム',
    width: 800,
    height: 600,
  },
  'terrarium-luxury': {
    src: '/images/products/terrarium-luxury.jpg',
    alt: 'ラグジュアリーコレクション - アート作品レベルのテラリウム',
    width: 800,
    height: 600,
  },
  'terrarium-custom': {
    src: '/images/products/terrarium-custom.jpg',
    alt: 'オーダーメイドテラリウム - 完全カスタマイズ対応',
    width: 800,
    height: 600,
  },
  'terrarium-gift': {
    src: '/images/products/terrarium-gift.jpg',
    alt: 'ギフトセット - 贈り物用テラリウム',
    width: 800,
    height: 600,
  },
};

// ワークショップ画像の定義
export const workshopImages: Record<string, ImageInfo> = {
  'basic-course': {
    src: '/images/workshop/basic-course.jpg',
    alt: '基礎コース - 初心者向けテラリウム制作の様子',
    width: 800,
    height: 600,
  },
  'advanced-course': {
    src: '/images/workshop/advanced-course.jpg',
    alt: '応用コース - 中級者向けテラリウム制作の様子',
    width: 800,
    height: 600,
  },
  'family-course': {
    src: '/images/workshop/family-course.jpg',
    alt: '親子コース - 家族でテラリウム制作を楽しむ様子',
    width: 800,
    height: 600,
  },
  'premium-course': {
    src: '/images/workshop/premium-course.jpg',
    alt: 'プレミアム体験 - 職人と一緒に本格制作',
    width: 800,
    height: 600,
  },
};

// チーム画像の定義
export const teamImages: Record<string, ImageInfo> = {
  'tanaka-taro': {
    src: '/images/team/tanaka-taro.jpg',
    alt: 'MOSS COUNTRY代表 田中太郎',
    width: 400,
    height: 400,
  },
  'sato-mika': {
    src: '/images/team/sato-mika.jpg',
    alt: 'MOSS COUNTRY副代表・デザイナー 佐藤美香',
    width: 400,
    height: 400,
  },
  'suzuki-kenji': {
    src: '/images/team/suzuki-kenji.jpg',
    alt: 'MOSS COUNTRYワークショップ講師 鈴木健司',
    width: 400,
    height: 400,
  },
};

// 店舗画像の定義
export const storeImages: Record<string, ImageInfo> = {
  'exterior': {
    src: '/images/store/exterior.jpg',
    alt: 'MOSS COUNTRY札幌店の外観',
    width: 800,
    height: 600,
  },
  'showroom': {
    src: '/images/store/showroom.jpg',
    alt: 'MOSS COUNTRYショールーム - 豊富な商品展示',
    width: 800,
    height: 600,
  },
  'workshop-room': {
    src: '/images/store/workshop-room.jpg',
    alt: 'MOSS COUNTRYワークショップルーム',
    width: 800,
    height: 600,
  },
  'cafe-space': {
    src: '/images/store/cafe-space.jpg',
    alt: 'MOSS COUNTRYカフェスペース',
    width: 800,
    height: 600,
  },
};

// ヒーロー画像のデフォルト定義（フォールバック用）
export const defaultHeroImages: Record<string, ImageInfo> = {
  'main': {
    src: '/images/hero/main-hero.jpg',
    alt: '美しい苔テラリウムのクローズアップ - MOSS COUNTRYメインビジュアル',
    width: 1920,
    height: 1080,
  },
  'products': {
    src: '/images/hero/products-hero.jpg',
    alt: '様々な種類のテラリウム商品ラインナップ',
    width: 1920,
    height: 600,
  },
  'workshop': {
    src: '/images/hero/workshop-hero.jpg',
    alt: 'テラリウム制作ワークショップの様子',
    width: 1920,
    height: 600,
  },
  'story': {
    src: '/images/hero/story-hero.jpg',
    alt: 'MOSS COUNTRY職人の手作業によるテラリウム制作',
    width: 1920,
    height: 600,
  },
  'store': {
    src: '/images/hero/store-hero.jpg',
    alt: 'MOSS COUNTRY札幌店の温かい店内雰囲気',
    width: 1920,
    height: 600,
  },
  'mossGuide': {
    src: '/images/misc/moss01.jpeg',
    alt: '様々な苔の種類を紹介する苔図鑑',
    width: 1920,
    height: 600,
  },
  'blog': {
    src: '/images/misc/moss01.jpeg',
    alt: 'MOSS COUNTRYブログ',
    width: 1920,
    height: 600,
  },
  'contact': {
    src: '/images/misc/moss01.jpeg',
    alt: 'お問い合わせ',
    width: 1920,
    height: 600,
  },
};

// 後方互換性のため、heroImagesもエクスポート（defaultHeroImagesのエイリアス）
export const heroImages = defaultHeroImages;

// 背景画像のデフォルト定義（フォールバック用）
export const defaultBackgroundImages: Record<string, ImageInfo> = {
  'main': {
    src: '/images/background/background01.jpeg',
    alt: 'MOSS COUNTRY 背景',
    width: 1920,
    height: 1080,
  },
  'main-mobile': {
    src: '/images/background/background01.jpeg',
    alt: 'MOSS COUNTRY 背景（モバイル）',
    width: 750,
    height: 1334,
  },
  'products': {
    src: '/images/background/background01.jpeg',
    alt: '商品ページ背景',
    width: 1920,
    height: 1080,
  },
  'products-mobile': {
    src: '/images/background/background01.jpeg',
    alt: '商品ページ背景（モバイル）',
    width: 750,
    height: 1334,
  },
  'workshop': {
    src: '/images/misc/moss01.jpeg',
    alt: 'ワークショップページ背景',
    width: 1920,
    height: 1080,
  },
  'workshop-mobile': {
    src: '/images/misc/moss02_sp.png',
    alt: 'ワークショップページ背景（モバイル）',
    width: 750,
    height: 1334,
  },
  'story': {
    src: '/images/misc/moss01.jpeg',
    alt: 'ストーリーページ背景',
    width: 1920,
    height: 1080,
  },
  'story-mobile': {
    src: '/images/misc/moss01.jpeg',
    alt: 'ストーリーページ背景（モバイル）',
    width: 750,
    height: 1334,
  },
  'store': {
    src: '/images/background/background01.jpeg',
    alt: '店舗ページ背景',
    width: 1920,
    height: 1080,
  },
  'store-mobile': {
    src: '/images/background/background01.jpeg',
    alt: '店舗ページ背景（モバイル）',
    width: 750,
    height: 1334,
  },
  'mossGuide': {
    src: '/images/misc/moss01.jpeg',
    alt: '苔図鑑ページ背景',
    width: 1920,
    height: 1080,
  },
  'mossGuide-mobile': {
    src: '/images/misc/moss01.jpeg',
    alt: '苔図鑑ページ背景（モバイル）',
    width: 750,
    height: 1334,
  },
  'blog': {
    src: '/images/misc/moss01.jpeg',
    alt: 'ブログページ背景',
    width: 1920,
    height: 1080,
  },
  'blog-mobile': {
    src: '/images/misc/moss01.jpeg',
    alt: 'ブログページ背景（モバイル）',
    width: 750,
    height: 1334,
  },
  'contact': {
    src: '/images/misc/moss01.jpeg',
    alt: 'お問い合わせページ背景',
    width: 1920,
    height: 1080,
  },
  'contact-mobile': {
    src: '/images/misc/moss01.jpeg',
    alt: 'お問い合わせページ背景（モバイル）',
    width: 750,
    height: 1334,
  },
};

/**
 * Sanityからヒーロー画像を取得する関数
 * @param page - ページ名
 * @returns ヒーロー画像情報（Sanityに設定がない場合はデフォルト画像を返す）
 */
export async function getHeroImage(page: 'main' | 'products' | 'workshop' | 'story' | 'store' | 'mossGuide' | 'blog' | 'contact'): Promise<ImageInfo> {
  // デフォルト画像を確実に返すため、最初に取得
  const defaultImage = defaultHeroImages[page] || defaultHeroImages['main'];
  
  try {
    const settings = await getHeroImageSettings();
    
    if (!settings) {
      // Sanityに設定がない場合はデフォルト画像を返す
      return defaultImage;
    }

    const pageSettings = settings[page];
    
    if (!pageSettings?.image?.asset?._ref) {
      // 該当ページの画像が設定されていない場合はデフォルト画像を返す
      return defaultImage;
    }

    try {
      // Sanityから画像URLを生成
      const imageUrl = urlFor(pageSettings.image as SanityImage)
        .width(page === 'main' ? 1920 : 1920)
        .height(page === 'main' ? 1080 : 600)
        .url();

      // URLが有効かチェック
      if (!imageUrl || imageUrl === 'undefined' || imageUrl === 'null') {
        return defaultImage;
      }

      return {
        src: imageUrl,
        alt: pageSettings.alt || defaultImage.alt,
        width: page === 'main' ? 1920 : 1920,
        height: page === 'main' ? 1080 : 600,
      };
    } catch (urlError) {
      console.warn(`Failed to generate image URL for ${page}:`, urlError);
      return defaultImage;
    }
  } catch (error) {
    console.warn(`Failed to get hero image for ${page}:`, error);
    // エラー時はデフォルト画像を返す
    return defaultImage;
  }
}

/**
 * すべてのヒーロー画像を一度に取得する関数（キャッシュ効率化のため）
 * @returns すべてのページのヒーロー画像情報
 */
export async function getAllHeroImages(): Promise<Record<string, ImageInfo>> {
  try {
    const settings = await getHeroImageSettings();

    if (!settings) {
      return defaultHeroImages;
    }

    const result: Record<string, ImageInfo> = {};
    const pages: Array<'main' | 'products' | 'workshop' | 'story' | 'store'> = ['main', 'products', 'workshop', 'story', 'store'];

    for (const page of pages) {
      const pageSettings = settings[page];

      if (pageSettings?.image?.asset?._ref) {
        const imageUrl = urlFor(pageSettings.image as SanityImage)
          .width(page === 'main' ? 1920 : 1920)
          .height(page === 'main' ? 1080 : 600)
          .url();

        result[page] = {
          src: imageUrl,
          alt: pageSettings.alt || defaultHeroImages[page].alt,
          width: page === 'main' ? 1920 : 1920,
          height: page === 'main' ? 1080 : 600,
        };
      } else {
        result[page] = defaultHeroImages[page];
      }
    }

    return result;
  } catch (error) {
    console.warn('Failed to get all hero images:', error);
    return defaultHeroImages;
  }
}

/**
 * Sanityから背景画像を取得する関数
 * @param page - ページ名 ('main' | 'products' | 'workshop' | 'story' | 'store' | 'mossGuide' | 'blog' | 'contact')
 * @param isMobile - モバイル用画像を取得するか（全ページ対応）
 * @returns 背景画像情報（Sanityに設定がない場合はデフォルト画像を返す）
 */
export async function getBackgroundImage(
  page: 'main' | 'products' | 'workshop' | 'story' | 'store' | 'mossGuide' | 'blog' | 'contact',
  isMobile: boolean = false
): Promise<ImageInfo> {
  const mobileKey = `${page}-mobile` as keyof typeof defaultBackgroundImages;
  // デフォルト画像を確実に返すため、最初に取得
  const defaultImage = isMobile 
    ? (defaultBackgroundImages[mobileKey] || defaultBackgroundImages['main-mobile'])
    : (defaultBackgroundImages[page] || defaultBackgroundImages['main']);

  try {
    const settings = await getBackgroundImageSettings();

    if (!settings) {
      // Sanityに設定がない場合はデフォルト画像を返す
      return defaultImage;
    }

    const pageSettings = settings[page];

    // モバイル画像の取得（全ページ対応）
    if (isMobile && pageSettings?.imageMobile?.asset?._ref) {
      try {
        const imageUrl = urlFor(pageSettings.imageMobile as SanityImage)
          .width(750)
          .height(1334)
          .url();

        // URLが有効かチェック
        if (!imageUrl || imageUrl === 'undefined' || imageUrl === 'null') {
          return defaultImage;
        }

        return {
          src: imageUrl,
          alt: pageSettings.alt || defaultImage.alt,
          width: 750,
          height: 1334,
        };
      } catch (urlError) {
        console.warn(`Failed to generate mobile image URL for ${page}:`, urlError);
        return defaultImage;
      }
    }

    // モバイル画像が設定されていない場合
    if (isMobile && !pageSettings?.imageMobile?.asset?._ref) {
      // PC用画像が設定されている場合はそれを使用、なければデフォルト
      if (pageSettings?.image?.asset?._ref) {
        try {
          const imageUrl = urlFor(pageSettings.image as SanityImage)
            .width(750)
            .height(1334)
            .url();

          if (!imageUrl || imageUrl === 'undefined' || imageUrl === 'null') {
            return defaultImage;
          }

          return {
            src: imageUrl,
            alt: pageSettings.alt || defaultImage.alt,
            width: 750,
            height: 1334,
          };
        } catch (urlError) {
          console.warn(`Failed to generate PC image URL for mobile ${page}:`, urlError);
          return defaultImage;
        }
      }
      return defaultImage;
    }

    if (!pageSettings?.image?.asset?._ref) {
      // 該当ページの画像が設定されていない場合はデフォルト画像を返す
      return defaultImage;
    }

    // Sanityから画像URLを生成（PC用）
    try {
      const imageUrl = urlFor(pageSettings.image as SanityImage)
        .width(1920)
        .height(1080)
        .url();

      // URLが有効かチェック
      if (!imageUrl || imageUrl === 'undefined' || imageUrl === 'null') {
        return defaultImage;
      }

      return {
        src: imageUrl,
        alt: pageSettings.alt || defaultImage.alt,
        width: 1920,
        height: 1080,
      };
    } catch (urlError) {
      console.warn(`Failed to generate PC image URL for ${page}:`, urlError);
      return defaultImage;
    }
  } catch (error) {
    console.warn(`Failed to get background image for ${page}:`, error);
    // エラー時はデフォルト画像を返す
    return defaultImage;
  }
}

/**
 * すべての背景画像を一度に取得する関数（キャッシュ効率化のため）
 * @returns すべてのページの背景画像情報
 */
export async function getAllBackgroundImages(): Promise<Record<string, ImageInfo>> {
  try {
    const settings = await getBackgroundImageSettings();

    if (!settings) {
      return defaultBackgroundImages;
    }

    const result: Record<string, ImageInfo> = {};
    const pages: Array<'main' | 'products' | 'workshop' | 'story' | 'store' | 'mossGuide' | 'blog' | 'contact'> =
      ['main', 'products', 'workshop', 'story', 'store', 'mossGuide', 'blog', 'contact'];

    for (const page of pages) {
      const pageSettings = settings[page];
      const mobileKey = `${page}-mobile`;

      // PC用画像
      if (pageSettings?.image?.asset?._ref) {
        const imageUrl = urlFor(pageSettings.image as SanityImage)
          .width(1920)
          .height(1080)
          .url();

        result[page] = {
          src: imageUrl,
          alt: pageSettings.alt || defaultBackgroundImages[page].alt,
          width: 1920,
          height: 1080,
        };
      } else {
        result[page] = defaultBackgroundImages[page];
      }

      // モバイル用画像（全ページ対応）
      if (pageSettings?.imageMobile?.asset?._ref) {
        const mobileImageUrl = urlFor(pageSettings.imageMobile as SanityImage)
          .width(750)
          .height(1334)
          .url();

        result[mobileKey] = {
          src: mobileImageUrl,
          alt: pageSettings.alt || defaultBackgroundImages[mobileKey].alt,
          width: 750,
          height: 1334,
        };
      } else {
        result[mobileKey] = defaultBackgroundImages[mobileKey];
      }
    }

    return result;
  } catch (error) {
    console.warn('Failed to get all background images:', error);
    return defaultBackgroundImages;
  }
}

// デフォルト画像のパス
export const DEFAULT_IMAGE = '/images/misc/default.jpeg';

// 画像が存在するかチェックする関数（開発時用）
export const checkImageExists = async (src: string): Promise<boolean> => {
  try {
    const response = await fetch(src, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

// 画像パスまたはデフォルト画像を返す関数
export const getImageSrc = (imagePath: string): string => {
  // 画像が存在しない場合はデフォルト画像を返す
  return imagePath || DEFAULT_IMAGE;
};

// プレースホルダー用のグラデーション配色
export const gradientPatterns: Record<string, string> = {
  'moss-warm': 'from-moss-green to-warm-brown',
  'light-moss': 'from-light-green to-moss-green',
  'beige-light': 'from-beige to-light-green',
  'warm-beige': 'from-warm-brown to-beige',
  'moss-light': 'from-moss-green to-light-green',
  'light-warm': 'from-light-green to-warm-brown',
};

// 商品カテゴリーに応じたグラデーション
export const getProductGradient = (productId: string): string => {
  const gradientMap: Record<string, string> = {
    'terrarium-starter': gradientPatterns['light-moss'],
    'terrarium-standard': gradientPatterns['moss-warm'],
    'terrarium-premium': gradientPatterns['warm-beige'],
    'terrarium-luxury': gradientPatterns['beige-light'],
    'terrarium-custom': gradientPatterns['moss-light'],
    'terrarium-gift': gradientPatterns['light-warm'],
  };
  return gradientMap[productId] || gradientPatterns['moss-warm'];
};