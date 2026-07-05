import { NextResponse } from 'next/server';
import { client } from '@/lib/sanity';
import { mergeSiteSettings, SiteSettingsData } from '@/lib/siteSettingsDefaults';

// 公開ページ用: ヘッダー/フッター/ハンバーガーの設定を返す（認証不要）。
// Sanityに保存がなければデフォルト（従来のハードコード構成）を返す。
export async function GET() {
  try {
    const saved: Partial<SiteSettingsData> | null = await client.fetch(
      `*[_type == "siteSettings" && _id == "siteSettings"][0]{
        headerLinks[]{ label, href, isVisible },
        footerSitemapLinks[]{ label, href, isVisible },
        footerLegalLinks[]{ label, href, isVisible },
        snsLinks[]{ platform, url, isVisible },
        footerTagline, businessHours, businessDays, copyrightText, maintenancePages
      }`
    );

    return NextResponse.json({ settings: mergeSiteSettings(saved) });
  } catch (error) {
    console.error('サイト設定取得エラー:', error);
    // 失敗してもデフォルト構成で表示を継続する
    return NextResponse.json({ settings: mergeSiteSettings(null) });
  }
}
