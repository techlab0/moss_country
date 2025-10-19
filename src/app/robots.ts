import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/account/',
          '/orders/',
          '/checkout/',
          '/cart/',
          '/payment/',
          '/_next/',
          '/test/',
        ],
      },
    ],
    sitemap: 'https://moss-country.com/sitemap.xml',
  }
}