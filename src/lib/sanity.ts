import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import type { SimpleWorkshop, Product, BlogPost, FAQ, SanityImage, MossSpecies, HeroImageSettings, BackgroundImageSettings } from '@/types/sanity'
import { generateSEOFriendlySlug } from '@/lib/slugUtils'

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'z36tkqex',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  useCdn: true, // Enable CDN for better performance
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN, // 書き込み権限用のトークンを追加
})

// 書き込み用のクライアント（サーバーサイドでのみ使用）
export const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'z36tkqex',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN, // 書き込み権限が必要
  ignoreBrowserTokenWarning: true,
})

const builder = imageUrlBuilder(client)

export function urlFor(source: SanityImage) {
  return builder.image(source)
}

// Simple Workshop queries
export async function getSimpleWorkshops(): Promise<SimpleWorkshop[]> {
  try {
    return await client.fetch(`
      *[_type == "simpleWorkshop" && !(_id in path("drafts.**"))] | order(title asc) {
        _id,
        title,
        description,
        price
      }
    `)
  } catch (error) {
    console.warn('Failed to fetch workshops from Sanity:', error)
    return []
  }
}

// Blog queries with pagination support
export async function getBlogPosts(limit = 10, offset = 0): Promise<BlogPost[]> {
  try {
    return await client.fetch(`
      *[_type == "blogPost" && isPublished == true] | order(publishedAt desc) [$start...$end] {
        _id,
        title,
        slug,
        excerpt,
        featuredImage,
        category,
        tags,
        publishedAt,
        author
      }
    `, { start: offset, end: offset + limit - 1 })
  } catch (error) {
    console.warn('Failed to fetch blog posts from Sanity:', error)
    return []
  }
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    return await client.fetch(`
      *[_type == "blogPost" && slug.current == $slug][0] {
        _id,
        title,
        slug,
        excerpt,
        content,
        featuredImage,
        category,
        tags,
        publishedAt,
        author
      }
    `, { slug })
  } catch (error) {
    console.warn('Failed to fetch blog post from Sanity:', error)
    return null
  }
}

// Product queries with pagination support
export async function getProducts(limit = 20, offset = 0): Promise<Product[]> {
  try {
    const products = await client.fetch(
      `*[_type == "product"] | order(sortOrder asc) [$start...$end] {
        _id,
        name,
        slug,
        price,
        category,
        "image": images[0] {
          asset-> {
            _ref,
            url
          },
          alt
        },
        featured,
        inStock,
        dimensions
      }`,
      { start: offset, end: offset + limit - 1 },
      {
        cache: 'force-cache',
        next: { revalidate: 300 } // 5分間キャッシュ
      }
    );
    
    // 本番環境ではSanityデータのみを返す
    if (!products || products.length === 0) {
      console.log('No Sanity products found');
      return [];
    }
    
    console.log(`Found ${products.length} products from Sanity:`, products.map((p: { name: string }) => p.name));
    return products;
  } catch (error) {
    console.warn('Failed to fetch products from Sanity:', error);
    return [];
  }
}

// asset を展開して url と metadata を取得（画像最適化に必要）
const productBySlugProjection = `{
  _id,
  name,
  slug,
  description,
  price,
  category,
  images[] {
    _type,
    _key,
    asset-> {
      _id,
      url,
      metadata {
        dimensions {
          width,
          height
        }
      }
    },
    alt,
    hotspot,
    crop
  },
  materials,
  careInstructions,
  featured,
  inStock,
  "dimensions": size
}`;

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    // writeClient (useCdn: false) で取得し、登録直後の商品も詳細ページで表示できるようにする
    // slug がオブジェクト { current } と文字列の両方に対応（昔のデータは文字列のことがある）
    let product = await writeClient.fetch(
      `*[_type == "product" && (slug.current == $slug || slug == $slug)][0] ${productBySlugProjection}`,
      { slug },
      { next: { revalidate: 60 } }
    );

    // スラッグで見つからない場合、商品名で検索（日本語スラッグや slug 未設定の古いデータ用）
    if (!product && slug) {
      product = await writeClient.fetch(
        `*[_type == "product" && name == $slug][0] ${productBySlugProjection}`,
        { slug },
        { next: { revalidate: 60 } }
      );
    }

    return product;
  } catch (error) {
    console.warn('Failed to fetch product from Sanity:', error);
    return null;
  }
}

// Inventory queries
export async function getProductsWithInventory(): Promise<Product[]> {
  try {
    const products = await client.fetch(
      `*[_type == "product"] | order(sortOrder asc, _createdAt desc) {
        _id,
        name,
        slug,
        description,
        price,
        category,
        images,
        features,
        "dimensions": size,
        materials,
        careInstructions,
        inStock,
        featured,
        sortOrder,
        weight,
        stockQuantity,
        reserved,
        lowStockThreshold
      }`
    );
    
    if (!products || products.length === 0) {
      console.log('No Sanity products found for inventory');
      return [];
    }
    
    return products;
  } catch (error) {
    console.error('Failed to fetch products with inventory:', error);
    return [];
  }
}

export async function updateProductInventory(productId: string, stockQuantity: number, reserved: number = 0): Promise<void> {
  try {
    await writeClient
      .patch(productId)
      .set({
        stockQuantity,
        reserved,
        inStock: stockQuantity > 0,
      })
      .commit();
  } catch (error) {
    console.error('Failed to update product inventory:', error);
    throw error;
  }
}

// Admin Blog queries (for management dashboard)
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  try {
    return await client.fetch(`
      *[_type == "blogPost"] | order(publishedAt desc) {
        _id,
        title,
        slug,
        excerpt,
        featuredImage,
        category,
        tags,
        publishedAt,
        isPublished,
        author,
        _createdAt,
        _updatedAt
      }
    `)
  } catch (error) {
    console.warn('Failed to fetch all blog posts from Sanity:', error)
    return []
  }
}

export async function createBlogPost(data: Partial<BlogPost>): Promise<BlogPost> {
  const doc = {
    _type: 'blogPost',
    ...data,
    publishedAt: data.publishedAt || new Date().toISOString(),
    isPublished: data.isPublished || false,
    author: data.author || 'MOSS COUNTRY'
  };
  
  return await writeClient.create(doc);
}

export async function updateBlogPost(id: string, data: Partial<BlogPost>): Promise<BlogPost> {
  try {
    console.log('Sanity updateBlogPost:', id, data);
    
    // スラッグの更新処理
    let updateData = { ...data };
    if (data.slug) {
      // スラッグが提供されている場合はそのまま使用
      if (typeof data.slug === 'string') {
        updateData.slug = {
          _type: 'slug',
          current: data.slug
        };
      }
      // オブジェクト形式の場合はそのまま
    } else if (data.title) {
      // スラッグが未提供でタイトルがある場合は自動生成
      updateData.slug = {
        _type: 'slug',
        current: generateSEOFriendlySlug(data.title)
      };
    }
    
    const result = await writeClient
      .patch(id)
      .set(updateData)
      .commit();
      
    console.log('Update result:', result);
    return result;
  } catch (error) {
    console.error('Sanity updateBlogPost error:', error);
    throw error;
  }
}

export async function deleteBlogPost(id: string): Promise<void> {
  await writeClient.delete(id);
}

export async function publishBlogPost(id: string): Promise<BlogPost> {
  return await writeClient
    .patch(id)
    .set({ 
      isPublished: true,
      publishedAt: new Date().toISOString()
    })
    .commit();
}

export async function unpublishBlogPost(id: string): Promise<BlogPost> {
  return await writeClient
    .patch(id)
    .set({ isPublished: false })
    .commit();
}

// Blog category statistics
export async function getBlogCategoryStats(): Promise<{category: string, count: number}[]> {
  try {
    const result = await client.fetch(`
      *[_type == "blogPost"] {
        category
      }
    `);
    
    // カテゴリ別に集計
    const categoryCount: {[key: string]: number} = {};
    result.forEach((post: {category: string}) => {
      if (post.category) {
        categoryCount[post.category] = (categoryCount[post.category] || 0) + 1;
      }
    });
    
    // 結果をフォーマット
    return Object.entries(categoryCount).map(([category, count]) => ({
      category,
      count
    }));
  } catch (error) {
    console.error('Failed to fetch blog category stats:', error);
    return [];
  }
}

// スラッグの重複チェック
export async function checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
  const query = excludeId 
    ? `*[_type == "blogPost" && slug.current == $slug && _id != $excludeId]`
    : `*[_type == "blogPost" && slug.current == $slug]`;
  
  const results = await client.fetch(query, { slug, excludeId });
  return results.length > 0;
}

// 重複しないスラッグを生成
export async function generateUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (await checkSlugExists(slug, excludeId)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

// FAQ queries
export async function getFAQs(): Promise<FAQ[]> {
  try {
    return await client.fetch(`
      *[_type == "faq" && isPublished == true] | order(sortOrder asc) {
        _id,
        question,
        answer,
        category
      }
    `)
  } catch (error) {
    console.warn('Failed to fetch FAQs from Sanity:', error)
    return []
  }
}

// Moss Species queries with pagination and caching
export async function getMossSpecies(limit = 20, offset = 0): Promise<MossSpecies[]> {
  try {
    return await client.fetch(`
      *[_type == "mossSpecies" && isVisible == true] | order(sortOrder asc, publishedAt desc) [$start...$end] {
        _id,
        name,
        commonNames,
        slug,
        description,
        images,
        characteristics,
        basicInfo,
        supplementaryInfo,
        practicalAdvice,
        // 古いフィールドも互換性のために取得
        terrariumSuitability,
        hokkaidoInfo,
        practicalInfo,
        category,
        tags,
        featured,
        publishedAt
      }
    `, { start: offset, end: offset + limit - 1 }, {
      cache: 'force-cache',
      next: { revalidate: 1800 } // 30分間キャッシュ
    })
  } catch (error) {
    console.warn('Failed to fetch moss species from Sanity:', error)
    return []
  }
}

export async function getMossSpeciesBySlug(slug: string): Promise<MossSpecies | null> {
  try {
    return await client.fetch(`
      *[_type == "mossSpecies" && slug.current == $slug && isVisible == true][0] {
        _id,
        name,
        commonNames,
        slug,
        description,
        images,
        characteristics,
        basicInfo,
        supplementaryInfo,
        practicalAdvice,
        // 古いフィールドも互換性のために取得
        terrariumSuitability,
        hokkaidoInfo,
        practicalInfo,
        category,
        tags,
        featured,
        publishedAt
      }
    `, { slug })
  } catch (error) {
    console.warn('Failed to fetch moss species from Sanity:', error)
    return null
  }
}

export async function getFeaturedMossSpecies(): Promise<MossSpecies[]> {
  try {
    return await client.fetch(`
      *[_type == "mossSpecies" && isVisible == true && featured == true] | order(sortOrder asc, publishedAt desc) {
        _id,
        name,
        slug,
        images,
        characteristics,
        category,
        featured
      }
    `)
  } catch (error) {
    console.warn('Failed to fetch featured moss species from Sanity:', error)
    return []
  }
}

// Maintenance Settings queries
export async function getMaintenanceSettings(): Promise<{
  isEnabled: boolean;
  password: string;
  message?: string;
} | null> {
  try {
    const settings = await client.fetch(`
      *[_type == "maintenanceSettings"][0] {
        isEnabled,
        password,
        message
      }
    `);
    
    return settings || null;
  } catch (error) {
    console.warn('Failed to fetch maintenance settings from Sanity:', error);
    return null;
  }
}

export async function updateMaintenanceSettings(data: {
  isEnabled: boolean;
  password: string;
  message?: string;
}): Promise<void> {
  try {
    // 既存の設定を検索
    const existing = await client.fetch(`*[_type == "maintenanceSettings"][0]._id`);
    
    if (existing) {
      // 既存の設定を更新
      await writeClient
        .patch(existing)
        .set({
          ...data,
          updatedAt: new Date().toISOString()
        })
        .commit();
    } else {
      // 新しい設定を作成
      await writeClient.create({
        _type: 'maintenanceSettings',
        ...data,
        updatedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Failed to update maintenance settings:', error);
    throw error;
  }
}

// Hero Image Settings queries
export async function getHeroImageSettings(): Promise<HeroImageSettings | null> {
  try {
    const settings = await client.fetch(`
      *[_type == "heroImageSettings"][0] {
        _id,
        _type,
        main {
          image,
          alt
        },
        products {
          image,
          alt
        },
        workshop {
          image,
          alt
        },
        story {
          image,
          alt
        },
        store {
          image,
          alt
        },
        mossGuide {
          image,
          alt
        },
        blog {
          image,
          alt
        },
        contact {
          image,
          alt
        },
        updatedAt
      }
    `, {}, {
      next: { revalidate: 60 } // 1分間キャッシュ（設定変更を素早く反映）
    });

    return settings || null;
  } catch (error) {
    console.warn('Failed to fetch hero image settings from Sanity:', error);
    return null;
  }
}

// Background Image Settings queries
export async function getBackgroundImageSettings(): Promise<BackgroundImageSettings | null> {
  try {
    const settings = await client.fetch(`
      *[_type == "backgroundImageSettings"][0] {
        _id,
        _type,
        main {
          image,
          imageMobile,
          alt
        },
        products {
          image,
          imageMobile,
          alt
        },
        workshop {
          image,
          imageMobile,
          alt
        },
        story {
          image,
          imageMobile,
          alt
        },
        store {
          image,
          imageMobile,
          alt
        },
        mossGuide {
          image,
          imageMobile,
          alt
        },
        blog {
          image,
          imageMobile,
          alt
        },
        contact {
          image,
          imageMobile,
          alt
        },
        updatedAt
      }
    `, {}, {
      next: { revalidate: 60 } // 1分間キャッシュ（設定変更を素早く反映）
    });

    return settings || null;
  } catch (error) {
    console.warn('Failed to fetch background image settings from Sanity:', error);
    return null;
  }
}