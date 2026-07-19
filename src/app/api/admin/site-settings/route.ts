import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { mergeSiteSettings, SiteSettingsData, NavLink, SnsLink } from '@/lib/siteSettingsDefaults';

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
        footerTagline, businessHours, businessDays, copyrightText, maintenancePages, allowIndexing
      }`
    );

    // デフォルトをマージして返す（管理画面には常に編集可能な全項目を表示する）
    return NextResponse.json({ settings: mergeSiteSettings(saved) });
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
      allowIndexing: body.allowIndexing === true,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ settings: mergeSiteSettings(saved as Partial<SiteSettingsData>) });
  } catch (error) {
    console.error('サイト設定保存エラー:', error);
    return NextResponse.json({ error: 'サイト設定の保存に失敗しました' }, { status: 500 });
  }
}
