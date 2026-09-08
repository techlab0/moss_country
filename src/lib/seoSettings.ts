// サイト共通のメタデータ（title/description/OGP/検索エンジン向け）と計測タグの設定。
// Sanityの siteSettings.seo に保存され、未保存の項目はここのデフォルトで補う。
// layout.tsx の generateMetadata と管理画面（/admin/settings のSEOタブ）が同じ値を参照する。

export interface SeoSettings {
  siteTitle: string;
  titleTemplate: string;
  description: string;
  keywords: string[];
  ogDescription: string;
  ogImageUrl: string;
  twitterHandle: string;
  googleSiteVerification: string;
  gtmContainerId: string;
}

// 従来 layout.tsx にハードコードされていた値。管理画面で未入力のあいだは表示が変わらないようにする。
export const defaultSeoSettings: SeoSettings = {
  siteTitle: 'MOSS COUNTRY - 北海道の苔テラリウム専門店',
  titleTemplate: '%s | MOSS COUNTRY',
  description:
    'MOSS COUNTRY（モスカントリー）は北海道初のカプセルテラリウム専門店。職人が手がける本格テラリウムと体験ワークショップを提供。小さなガラスの中に広がる、無限の自然の世界をお届けします。',
  keywords: [
    'テラリウム',
    '苔テラリウム',
    'カプセルテラリウム',
    '札幌',
    '北海道',
    'ワークショップ',
    '癒し',
    'インテリア',
    'MOSS COUNTRY',
    'moss country',
    'mosscountry',
    'モスカントリー',
    '苔図鑑',
  ],
  // SNSシェア時は検索向けの長い説明文ではなく、短いキャッチコピーを出す
  ogDescription: '小さなガラスの中に広がる、無限の自然の世界',
  ogImageUrl: '/images/og-image.jpg',
  twitterHandle: '@MossCountry',
  // 未入力のうちはメタタグ自体を出さない。ダミー文字列を出すとSearch Consoleの所有権確認が通らないため。
  googleSiteVerification: '',
  gtmContainerId: 'GTM-TVDCWVQ3',
};

/**
 * GTMコンテナIDとして使える形式かを判定して正規化する。
 *
 * 管理画面の入力ミス（空白混入・IDの貼り間違い）がそのまま全ページのscriptタグになると
 * サイト全体で計測が壊れるため、形式が合わないものは「未設定」に倒して読み込み自体を行わない。
 */
export function normalizeGtmContainerId(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim().toUpperCase();
  return /^GTM-[A-Z0-9]{4,}$/.test(trimmed) ? trimmed : '';
}

/**
 * Sanityに保存されたSEO設定とデフォルトをマージする。
 *
 * 空文字は「未入力」とみなしてデフォルトに戻す。管理画面でうっかり全消ししたときに
 * title/descriptionが空のページを配信してしまうのを防ぐため。
 * ただし googleSiteVerification だけは空を許す（設定しない選択があるため）。
 */
export function mergeSeoSettings(saved: Partial<SeoSettings> | null | undefined): SeoSettings {
  if (!saved) return defaultSeoSettings;

  const text = (value: string | undefined, fallback: string): string => {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    return trimmed === '' ? fallback : trimmed;
  };

  return {
    siteTitle: text(saved.siteTitle, defaultSeoSettings.siteTitle),
    titleTemplate: text(saved.titleTemplate, defaultSeoSettings.titleTemplate),
    description: text(saved.description, defaultSeoSettings.description),
    keywords: saved.keywords?.length
      ? saved.keywords.map((k) => k.trim()).filter((k) => k !== '')
      : defaultSeoSettings.keywords,
    ogDescription: text(saved.ogDescription, defaultSeoSettings.ogDescription),
    ogImageUrl: text(saved.ogImageUrl, defaultSeoSettings.ogImageUrl),
    twitterHandle: text(saved.twitterHandle, defaultSeoSettings.twitterHandle),
    googleSiteVerification: typeof saved.googleSiteVerification === 'string'
      ? saved.googleSiteVerification.trim()
      : defaultSeoSettings.googleSiteVerification,
    gtmContainerId: typeof saved.gtmContainerId === 'string'
      ? normalizeGtmContainerId(saved.gtmContainerId)
      : defaultSeoSettings.gtmContainerId,
  };
}

export interface RobotsDirectives {
  index: boolean;
  follow: boolean;
  noarchive: boolean;
  nosnippet: boolean;
  noimageindex: boolean;
  nocache: boolean;
  googleBot: {
    index: boolean;
    follow: boolean;
    'max-video-preview': number;
    'max-image-preview': 'large';
    'max-snippet': number;
  };
}

/**
 * 管理画面のインデックス許可トグルから、HTMLのrobotsメタタグの内容を組み立てる。
 *
 * robots.txt（src/app/robots.ts）とメタタグで判断が食い違うと、
 * 「クロールは許可しているのにページ側でnoindexを出す」状態になり検索結果に出ない。
 * 両方をこの同じ allowIndexing から導出することでズレを防ぐ。
 */
export function buildRobotsDirectives(allowIndexing: boolean): RobotsDirectives {
  return {
    index: allowIndexing,
    follow: allowIndexing,
    noarchive: !allowIndexing,
    nosnippet: !allowIndexing,
    noimageindex: false,
    nocache: !allowIndexing,
    googleBot: {
      index: allowIndexing,
      follow: allowIndexing,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  };
}
