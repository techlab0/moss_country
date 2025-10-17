import { MetadataRoute } from 'next'
import { client } from '@/lib/sanity'

async function getStaticRoutes(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://moss-country.com'
  
  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/moss-guide`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/workshop`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/store`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/story`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  return staticRoutes
}

async function getDynamicRoutes(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://moss-country.com'
  const dynamicRoutes: MetadataRoute.Sitemap = []

  try {
    // Get blog posts
    const blogPosts = await client.fetch(`
      *[_type == "post" && defined(slug.current)] {
        slug,
        publishedAt,
        _updatedAt
      }
    `)

    for (const post of blogPosts) {
      dynamicRoutes.push({
        url: `${baseUrl}/blog/${post.slug.current}`,
        lastModified: new Date(post._updatedAt || post.publishedAt),
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    }

    // Get products
    const products = await client.fetch(`
      *[_type == "product" && defined(slug.current)] {
        slug,
        _updatedAt
      }
    `)

    for (const product of products) {
      dynamicRoutes.push({
        url: `${baseUrl}/products/${product.slug.current}`,
        lastModified: new Date(product._updatedAt),
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }

    // Get moss guide entries
    const mossGuide = await client.fetch(`
      *[_type == "mossSpecies" && defined(slug.current) && isVisible == true] {
        slug,
        _updatedAt
      }
    `)

    for (const moss of mossGuide) {
      dynamicRoutes.push({
        url: `${baseUrl}/moss-guide/${moss.slug.current}`,
        lastModified: new Date(moss._updatedAt),
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    }
  } catch (error) {
    console.error('Error fetching dynamic routes for sitemap:', error)
  }

  return dynamicRoutes
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = await getStaticRoutes()
  const dynamicRoutes = await getDynamicRoutes()

  return [...staticRoutes, ...dynamicRoutes]
}