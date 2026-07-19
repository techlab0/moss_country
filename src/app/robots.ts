import { MetadataRoute } from 'next'
import { writeClient } from '@/lib/sanity'

// 管理画面のトグル(siteSettings.allowIndexing)に応じてrobots.txtを切り替える。
// CDNキャッシュを使わずwriteClientで常に最新値を取得し、設定変更を即時反映する。
export const dynamic = 'force-dynamic'

export default async function robots(): Promise<MetadataRoute.Robots> {
  let allowIndexing = false

  try {
    const settings: { allowIndexing?: boolean } | null = await writeClient.fetch(
      `*[_type == "siteSettings" && _id == "siteSettings"][0]{ allowIndexing }`
    )
    allowIndexing = settings?.allowIndexing === true
  } catch (error) {
    console.warn('robots: サイト設定の取得に失敗しました。安全側(disallow)にフォールバックします:', error)
    allowIndexing = false
  }

  if (allowIndexing) {
    return {
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/cart', '/checkout', '/payment', '/receipt', '/maintenance', '/page-unavailable'],
      },
      sitemap: 'https://mosscountry.com/sitemap.xml',
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        disallow: '/',
      },
    ],
  }
}
