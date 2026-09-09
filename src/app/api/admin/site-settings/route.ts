import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { mergeSiteSettings, SiteSettingsData, NavLink, SnsLink } from '@/lib/siteSettingsDefaults';
import { mergeSeoSettings, normalizeGtmContainerId, SeoSettings } from '@/lib/seoSettings';
import { sanitizePageSeo, type PageSeoEntry } from '@/lib/pageSeo';

// 管理画面用: サイト設定（ヘッダー/フッター/ページ別メンテナンス）の取得・保存。

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const saved: Partial<SiteSettingsData> | null = await writeClient.fetch(
      `*[_type == "siteSettings" && _id == "siteSettings"][0]{
        headerLinks[]{ label, href, isVisible },
        footerSitemapLinks[]{ label, href, isVisible },
        footerLegalLinks[]{ label, href, isVisible },
        snsLinks[]{ platform, url, isVisible },
        footerTagline, businessHours, businessDays, copyrightText, maintenancePages, allowIndexing,
        craftMossRentalVisibilityConfigured, rentalTerrariumSitemapConfigured,
        seo {
          siteTitle, titleTemplate, description, keywords, ogDescription, ogImageUrl,
          twitterHandle, googleSiteVerification, gtmContainerId
        },
        pageSeo[]{ path, description }
      }`
    );

    // デフォルトをマージして返す（管理画面には常に編集可能な全項目を表示する）
    return NextResponse.json({
      settings: {
        ...mergeSiteSettings(saved),
        seo: mergeSeoSettings(saved?.seo),
        pageSeo: sanitizePageSeo((saved as { pageSeo?: unknown } | null)?.pageSeo),
      },
    });
  } catch (error) {
    console.error('サイト設定取得エラー:', error);
    return NextResponse.json({ error: 'サイト設定の取得に失敗しました' }, { status: 500 });
  }
}

function sanitizeNavLinks(input: unknown, keyPrefix: string): Array<NavLink & { _type: string; _key: string }> {
  if (!Array.isArray(input)) return [];
  return input
    .filter((l): l is NavLink => !!l && typeof l.label === 'string' && typeof l.href === 'string' && l.label.trim() !== '' && l.href.trim() !== '')
    .map((l, i) => ({
      _type: 'navLink',
      _key: `${keyPrefix}-${i}`,
      label: l.label.trim(),
      href: l.href.trim(),
      isVisible: l.isVisible !== false,
    }));
}

// SEO設定は空文字も含めてそのまま保存し、読み出し時に mergeSeoSettings がデフォルトへ倒す。
// GTMのIDだけは保存時点で形式を検証し、不正な値を全ページのscriptタグに載せない。
function sanitizeSeo(input: unknown): SeoSettings {
  const raw = (input ?? {}) as Partial<SeoSettings>;
  const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

  return {
    siteTitle: text(raw.siteTitle),
    titleTemplate: text(raw.titleTemplate),
    description: text(raw.description),
    keywords: Array.isArray(raw.keywords)
      ? raw.keywords.filter((k): k is string => typeof k === 'string').map((k) => k.trim()).filter((k) => k !== '')
      : [],
    ogDescription: text(raw.ogDescription),
    ogImageUrl: text(raw.ogImageUrl),
    twitterHandle: text(raw.twitterHandle),
    googleSiteVerification: text(raw.googleSiteVerification),
    gtmContainerId: normalizeGtmContainerId(text(raw.gtmContainerId)),
  };
}

export async function PUT(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();

    const snsLinks = (Array.isArray(body.snsLinks) ? body.snsLinks : [])
      .filter((l: SnsLink) => !!l && typeof l.platform === 'string' && typeof l.url === 'string')
      .map((l: SnsLink, i: number) => ({
        _type: 'snsLink',
        _key: `sns-${i}`,
        platform: l.platform,
        url: l.url.trim(),
        isVisible: l.isVisible !== false,
      }));

    const maintenancePages = (Array.isArray(body.maintenancePages) ? body.maintenancePages : [])
      .filter((p: unknown): p is string => typeof p === 'string' && p.startsWith('/'));

    const saved = await writeClient.createOrReplace({
      _id: 'siteSettings',
      _type: 'siteSettings',
      headerLinks: sanitizeNavLinks(body.headerLinks, 'header'),
      footerSitemapLinks: sanitizeNavLinks(body.footerSitemapLinks, 'sitemap'),
      footerLegalLinks: sanitizeNavLinks(body.footerLegalLinks, 'legal'),
      snsLinks,
      footerTagline: typeof body.footerTagline === 'string' ? body.footerTagline : '',
      businessHours: typeof body.businessHours === 'string' ? body.businessHours : '',
      businessDays: typeof body.businessDays === 'string' ? body.businessDays : '',
      copyrightText: typeof body.copyrightText === 'string' ? body.copyrightText : '',
      maintenancePages,
      craftMossRentalVisibilityConfigured: true,
      rentalTerrariumSitemapConfigured: true,
      allowIndexing: body.allowIndexing === true,
      seo: sanitizeSeo(body.seo),
      // 空欄のページは保存しない。読み出し時に pageSeo.ts の既定値へ倒れる。
      pageSeo: sanitizePageSeo(body.pageSeo).map((entry: PageSeoEntry, i: number) => ({
        _type: 'pageSeoEntry',
        _key: `page-seo-${i}`,
        ...entry,
      })),
      updatedAt: new Date().toISOString(),
    });

    // 準備中ページ(maintenancePages)はミドルウェアの状態キャッシュにも載るため、
    // 保存時に 'maintenance' タグを破棄して準備中の切り替えを即時反映する
    revalidateTag('maintenance');
    // ルートレイアウトのメタデータ（robots/title/OGP/GTM）のキャッシュも破棄し、
    // インデックス許可の切り替えを保存直後のページ表示から反映させる
    revalidateTag('site-settings');

    const merged = mergeSiteSettings(saved as Partial<SiteSettingsData>);
    return NextResponse.json({
      settings: {
        ...merged,
        seo: mergeSeoSettings((saved as { seo?: Partial<SeoSettings> }).seo),
        pageSeo: sanitizePageSeo((saved as { pageSeo?: unknown }).pageSeo),
      },
    });
  } catch (error) {
    console.error('サイト設定保存エラー:', error);
    return NextResponse.json({ error: 'サイト設定の保存に失敗しました' }, { status: 500 });
  }
}
