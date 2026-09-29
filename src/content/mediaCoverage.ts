export type MediaCoverageCategory = 'テレビ' | 'Web掲載';

export interface MediaCoverageItem {
  id: string;
  date: string;
  displayDate: string;
  category: MediaCoverageCategory;
  outlet: string;
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  sourceUrl: string;
  sourceLabel: string;
  featured?: boolean;
}

/**
 * 公開情報で媒体名・掲載日を確認できた実績のみを掲載する。
 * 新しい実績を追加するときは、媒体の公式ページまたは信頼できる掲載元URLも残す。
 */
export const mediaCoverage: readonly MediaCoverageItem[] = [
  {
    id: 'sapporo-yard-2026-04-08',
    date: '2026-04-08',
    displayDate: '2026.04.08',
    category: 'Web掲載',
    outlet: 'SAPPOROYARD',
    title: '「いいモノいいコトマルシェ」会場レポートで紹介',
    description:
      '大丸札幌店で開催された「いいモノいいコトマルシェ」の会場レポート内で、Moss Countryの苔テラリウムをご紹介いただきました。',
    sourceUrl: 'https://sapporoyard.com/archives/14747659.html',
    sourceLabel: 'SAPPOROYARDの記事を見る',
    featured: true,
  },
  {
    id: 'htb-norinori-sanpo-2025-11-15',
    date: '2025-11-15',
    displayDate: '2025.11.15',
    category: 'テレビ',
    outlet: 'HTB北海道テレビ',
    title: '「錦鯉が行く！のりのり散歩」宮の沢エリア#3',
    description:
      '錦鯉のお二人と田口彩夏アナウンサーが店舗を訪れ、苔テラリウム作りを体験してくださいました。',
    image: '/images/media/htb-norinori-sanpo-2025.jpg',
    imageAlt: 'Moss Country店内で行われた「錦鯉が行く！のりのり散歩」の撮影風景',
    sourceUrl: 'https://www.htb.co.jp/norinorisanpo/sapporo/nishi/20251101/index.html',
    sourceLabel: 'HTBの番組ページを見る',
    featured: true,
  },
  {
    id: 'stv-fukunaga-2025-08-26',
    date: '2025-08-26',
    displayDate: '2025.08.26',
    category: 'テレビ',
    outlet: 'STV札幌テレビ',
    title: '「どさんこワイド179」福永探偵社',
    description:
      '「オシャレでカワイイ！今どきのネオ盆栽」の特集で、苔テラリウムとMoss Countryをご紹介いただきました。',
    image: '/images/media/stv-fukunaga-2025.jpg',
    imageAlt: 'Moss Country店内での「どさんこワイド179」福永探偵社の取材記念写真',
    sourceUrl: 'https://www.stv.jp/tv/dosanko_eve/tokushu/k7edca0000004jxz.html',
    sourceLabel: 'STVの特集ページを見る',
    featured: true,
  },
];

export const featuredMediaCoverage = mediaCoverage.filter((item) => item.featured);
