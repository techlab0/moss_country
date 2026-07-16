import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        disallow: '/',
      },
    ],
    // sitemap: 'https://mosscountry.com/sitemap.xml', // インデックス無効中はコメントアウト
  }
}