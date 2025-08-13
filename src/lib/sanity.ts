import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import type { Workshop, SimpleWorkshop, Product, BlogPost, FAQ, SanityImage } from '@/types/sanity'

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'z36tkqex',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  useCdn: false, // Use CDN for production
  apiVersion: '2024-01-01',
})

const builder = imageUrlBuilder(client)

export function urlFor(source: SanityImage) {
  return builder.image(source)
}

// Workshop queries
export async function getWorkshops(): Promise<Workshop[]> {
  return await client.fetch(`
    *[_type == "workshop" && !(_id in path("drafts.**"))] | order(title asc) {
      _id,
      title,
      slug,
      category,
      description,
      duration,
      price,
      capacity,
      image,
      features,
      difficulty,
      schedules
    }
  `)
}

// Simple Workshop queries (for testing)
export async function getSimpleWorkshops(): Promise<SimpleWorkshop[]> {
  return await client.fetch(`
    *[_type == "simpleWorkshop" && !(_id in path("drafts.**"))] | order(title asc) {
      _id,
      title,
      description,
      price
    }
  `)
}

export async function getWorkshopBySlug(slug: string): Promise<Workshop | null> {
  return await client.fetch(`
    *[_type == "workshop" && slug.current == $slug][0] {
      _id,
      title,
      slug,
      category,
      description,
      duration,
      price,
      capacity,
      image,
      features,
      difficulty,
      schedules
    }
  `, { slug })
}

// Blog queries
export async function getBlogPosts(): Promise<BlogPost[]> {
  return await client.fetch(`
    *[_type == "blogPost" && isPublished == true] | order(publishedAt desc) {
      _id,
      title,
      slug,
      excerpt,
      featuredImage,
      category,
      publishedAt,
      author
    }
  `)
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
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
}

// Product queries
export async function getProducts(): Promise<Product[]> {
  try {
    const products = await client.fetch(
      `*[_type == "product"] | order(sortOrder asc) {
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
      {},
      {
        cache: 'force-cache',
        next: { revalidate: 300 } // 5分間キャッシュ
      }
    );
    
    // Sanityにデータがない場合はモックデータを返す
    if (!products || products.length === 0) {
      console.log('No Sanity products found, using mock data');
      const { mockProducts } = await import('./mockProducts');
      return mockProducts;
    }
    
    console.log(`Found ${products.length} products from Sanity:`, products.map((p: any) => p.name));
    
    // Sanityデータにモックデータを追加
    const { mockProducts } = await import('./mockProducts');
    return [...products, ...mockProducts];
  } catch (error) {
    console.warn('Failed to fetch products from Sanity, using mock data:', error);
    const { mockProducts } = await import('./mockProducts');
    return mockProducts;
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const product = await client.fetch(
      `*[_type == "product" && slug.current == $slug][0] {
        _id,
        name,
        slug,
        description,
        price,
        category,
        images[] {
          asset-> {
            _ref,
            url
          },
          alt,
          hotspot,
          crop
        },
        materials,
        careInstructions,
        featured,
        inStock,
        dimensions
      }`,
      { slug },
      {
        cache: 'force-cache',
        next: { revalidate: 3600 } // 1時間キャッシュ
      }
    );
    
    // Sanityにデータがない場合はモックデータから検索
    if (!product) {
      const { mockProducts } = await import('./mockProducts');
      return mockProducts.find(p => p.slug.current === slug) || null;
    }
    
    return product;
  } catch (error) {
    console.warn('Failed to fetch product from Sanity, checking mock data:', error);
    const { mockProducts } = await import('./mockProducts');
    return mockProducts.find(p => p.slug.current === slug) || null;
  }
}

// FAQ queries
export async function getFAQs(): Promise<FAQ[]> {
  return await client.fetch(`
    *[_type == "faq" && isPublished == true] | order(sortOrder asc) {
      _id,
      question,
      answer,
      category
    }
  `)
}