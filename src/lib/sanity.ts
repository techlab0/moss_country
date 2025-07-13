import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import type { Workshop, SimpleWorkshop, Product, BlogPost, FAQ, SanityImage } from '@/types/sanity'

export const client = createClient({
<<<<<<< HEAD
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
=======
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'z36tkqex',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
>>>>>>> clean-main
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
<<<<<<< HEAD
      duration,
=======
>>>>>>> clean-main
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
  return await client.fetch(`
    *[_type == "product" && inStock == true] | order(sortOrder asc) {
      _id,
      name,
      slug,
      description,
      price,
      category,
      images,
      features,
      size,
      materials,
      careInstructions,
      featured
    }
  `)
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return await client.fetch(`
    *[_type == "product" && slug.current == $slug][0] {
      _id,
      name,
      slug,
      description,
      price,
      category,
      images,
      features,
      size,
      materials,
      careInstructions,
      featured
    }
  `, { slug })
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