// サイト設定（ヘッダー/フッター/ハンバーガー/ページ別メンテナンス）のデフォルト値。
// Sanityの siteSettings ドキュメントに保存値があればそちらが優先され、
// なければここの値（従来のハードコード構成）で表示される。
// Header / Footer / 管理画面の3箇所で共通利用する。

export interface NavLink {
  label: string;
  href: string;
  isVisible: boolean;
}

export type SnsPlatform = 'instagram' | 'x' | 'youtube' | 'threads' | 'facebook' | 'tiktok';

export interface SnsLink {
  platform: SnsPlatform;
  url: string;
  isVisible: boolean;
}

export interface SiteSettingsData {
  headerLinks: NavLink[];
  footerSitemapLinks: NavLink[];
  footerLegalLinks: NavLink[];
  snsLinks: SnsLink[];
  footerTagline: string;
  businessHours: string;
  businessDays: string;
  copyrightText: string;
  maintenancePages: string[];
  allowIndexing: boolean;
}

export const snsPlatformLabels: Record<SnsPlatform, string> = {
  instagram: 'Instagram',
  x: 'X (Twitter)',
  youtube: 'YouTube',
  threads: 'Threads',
  facebook: 'Facebook',
  tiktok: 'TikTok',
};

// ページ別メンテナンス（準備中表示）の対象にできる公開ページ。
// トップページは対象外（サイト全体を止めたい場合は全体メンテナンスモードを使う）
export const maintenanceTargetPages: Array<{ path: string; label: string }> = [
  { path: '/shop', label: '商品' },
  { path: '/moss-guide', label: '苔図鑑' },
  { path: '/workshop', label: 'ワークショップ' },
  { path: '/workshop/mobile', label: '出張ワークショップ' },
  { path: '/story', label: 'ストーリー' },
  { path: '/store', label: '店舗情報' },
  { path: '/blog', label: 'ブログ' },
  { path: '/contact', label: 'お問い合わせ' },
  { path: '/faq', label: 'FAQ' },
];

export const defaultSiteSettings: SiteSettingsData = {
  headerLinks: [
    { label: 'ホーム', href: '/', isVisible: true },
    { label: '商品', href: '/shop', isVisible: true },
    { label: '苔図鑑', href: '/moss-guide', isVisible: true },
    { label: 'ワークショップ', href: '/workshop', isVisible: true },
    { label: 'ブログ', href: '/blog', isVisible: true },
  ],
  footerSitemapLinks: [
    { label: '商品', href: '/shop', isVisible: true },
    { label: '苔図鑑', href: '/moss-guide', isVisible: true },
    { label: 'ワークショップ', href: '/workshop', isVisible: true },
    { label: '出張ワークショップ', href: '/workshop/mobile', isVisible: true },
    { label: 'ストーリー', href: '/story', isVisible: true },
    { label: '店舗情報', href: '/store', isVisible: true },
    { label: 'ブログ', href: '/blog', isVisible: true },
    { label: 'お問い合わせ', href: '/contact', isVisible: true },
  ],
  footerLegalLinks: [
    { label: '利用規約', href: '/terms', isVisible: true },
    { label: 'プライバシーポリシー', href: '/privacy', isVisible: true },
    { label: '特定商取引法', href: '/legal', isVisible: true },
  ],
  snsLinks: [
    { platform: 'instagram', url: 'https://www.instagram.com/moss.country/', isVisible: true },
    { platform: 'x', url: 'https://x.com/MossCountry', isVisible: true },
    { platform: 'youtube', url: 'https://www.youtube.com/@MossCountry1111', isVisible: true },
    { platform: 'threads', url: 'https://threads.com/@moss.country', isVisible: true },
    { platform: 'facebook', url: 'https://m.facebook.com/61570932690760/', isVisible: true },
    { platform: 'tiktok', url: 'https://www.tiktok.com/@moss.country', isVisible: true },
  ],
  footerTagline: '小さなガラスの中に広がる、無限の自然の世界。北海道発、職人が手がける本格テラリウムをお届けします。',
  businessHours: '11:00 - 20:00',
  businessDays: '不定休（カレンダーをご確認ください）',
  copyrightText: '© 2024 MOSS COUNTRY. All rights reserved.',
  maintenancePages: [],
  allowIndexing: false,
};

/**
 * Sanityから取得した部分的な設定とデフォルトをマージする。
 * 配列は「保存されていれば保存値をそのまま使う」（要素単位のマージはしない）。
 */
export function mergeSiteSettings(saved: Partial<SiteSettingsData> | null | undefined): SiteSettingsData {
  if (!saved) return defaultSiteSettings;
  return {
    headerLinks: saved.headerLinks?.length ? saved.headerLinks : defaultSiteSettings.headerLinks,
    footerSitemapLinks: saved.footerSitemapLinks?.length ? saved.footerSitemapLinks : defaultSiteSettings.footerSitemapLinks,
    footerLegalLinks: saved.footerLegalLinks?.length ? saved.footerLegalLinks : defaultSiteSettings.footerLegalLinks,
    snsLinks: saved.snsLinks?.length ? saved.snsLinks : defaultSiteSettings.snsLinks,
    footerTagline: saved.footerTagline ?? defaultSiteSettings.footerTagline,
    businessHours: saved.businessHours ?? defaultSiteSettings.businessHours,
    businessDays: saved.businessDays ?? defaultSiteSettings.businessDays,
    copyrightText: saved.copyrightText ?? defaultSiteSettings.copyrightText,
    maintenancePages: saved.maintenancePages ?? [],
    allowIndexing: saved.allowIndexing === true,
  };
}
