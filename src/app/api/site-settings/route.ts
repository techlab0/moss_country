import { NextResponse } from 'next/server';
import { client } from '@/lib/sanity';
import { mergeSiteSettings, SiteSettingsData } from '@/lib/siteSettingsDefaults';

// 公開ページ用: ヘッダー/フッター/ハンバーガーの設定を返す（認証不要）。
// Sanityに保存がなければデフォルト（従来のハードコード構成）を返す。

// 公開ページの表示ごとに呼ばれるため、キャッシュせずにいると
// ページビューの数だけ関数が起動し、Vercelの実行時間を消費する。
// 個人情報を含まない共通データなのでCDNに載せ、60秒は関数を起動せず配信する。
const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
};

export async function GET() {
  try {
    const saved: Partial<SiteSettingsData> | null = await client.fetch(
      `*[_type == "siteSettings" && _id == "siteSettings"][0]{
        headerLinks[]{ label, href, isVisible },
        footerSitemapLinks[]{ label, href, isVisible },
        footerLegalLinks[]{ label, href, isVisible },
        snsLinks[]{ platform, url, isVisible },
        footerTagline, businessHours, businessDays, copyrightText, maintenancePages,
        craftMossRentalVisibilityConfigured, rentalTerrariumSitemapConfigured
      }`
    );

    return NextResponse.json({ settings: mergeSiteSettings(saved) }, { headers: PUBLIC_CACHE_HEADERS });
  } catch (error) {
    console.error('サイト設定取得エラー:', error);
    // 失敗してもデフォルト構成で表示を継続する。
    // 失敗結果を長くキャッシュすると復旧後もデフォルト構成のままになるため、キャッシュしない。
    return NextResponse.json({ settings: mergeSiteSettings(null) }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
