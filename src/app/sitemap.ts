import { MetadataRoute } from 'next'
import { client, writeClient } from '@/lib/sanity'
import { isSitemapUrlVisible, mergeSiteSettings } from '@/lib/siteSettingsDefaults'

async function getStaticRoutes(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://mosscountry.com'

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
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
      url: `${baseUrl}/workshop/mobile`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
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
  const baseUrl = 'https://mosscountry.com'
  const dynamicRoutes: MetadataRoute.Sitemap = []

  // Get blog posts with individual error handling
  try {
    // ドキュメント型は blogPost。以前は存在しない "post" を指定していたため、
    // ブログ記事が1件もサイトマップに載っていなかった。
    // 未公開の下書きを載せないよう、公開ページと同じ isPublished の条件も合わせる。
    const blogPosts = await client.fetch(`
      *[_type == "blogPost" && isPublished == true && defined(slug.current)] {
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
  } catch (error) {
    console.warn('Error fetching blog posts for sitemap:', error)
  }

  // Get products with individual error handling
  try {
    const products = await client.fetch(`
      *[_type == "product" && defined(slug.current) && isVisible != false] {
        slug,
        _updatedAt
      }
    `)

    const { getProductSlug } = await import('@/lib/adapters')
    for (const product of products) {
      const slug = getProductSlug(product)
      if (!slug) continue
      dynamicRoutes.push({
        url: `${baseUrl}/shop/${slug}`,
        lastModified: new Date(product._updatedAt),
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
  } catch (error) {
    console.warn('Error fetching products for sitemap:', error)
  }

  // Get moss guide entries with individual error handling
  try {
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
    console.warn('Error fetching moss guide for sitemap:', error)
  }

  return dynamicRoutes
}

// 準備中に指定されたページを除外するための設定取得。
// 取得に失敗しても除外なしで通常のサイトマップを返す（サイトマップ自体を欠損させない）。
async function getMaintenancePages(): Promise<string[]> {
  try {
    const saved = await writeClient.fetch(
      `*[_type == "siteSettings" && _id == "siteSettings"][0]{ maintenancePages, craftMossRentalVisibilityConfigured }`,
      {},
      { next: { revalidate: 60, tags: ['maintenance'] } }
    )
    return mergeSiteSettings(saved).maintenancePages
  } catch (error) {
    console.warn('sitemap: 準備中ページの設定取得に失敗しました。除外なしで出力します:', error)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [staticRoutes, dynamicRoutes, maintenancePages] = await Promise.all([
    getStaticRoutes(),
    getDynamicRoutes(),
    getMaintenancePages(),
  ])

  // 準備中のページと、その配下の詳細ページ（例: /shop を準備中にしたときの /shop/商品）を除く
  return [...staticRoutes, ...dynamicRoutes].filter((route) =>
    isSitemapUrlVisible(route.url, maintenancePages)
  )
}