export type MediaCoverageCategory = 'テレビ' | 'ラジオ' | '新聞' | 'Web掲載';

export interface MediaCoverageLink {
  url: string;
  label: string;
}

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
  additionalLinks?: readonly MediaCoverageLink[];
  featured?: boolean;
}

/**
 * 媒体の公開情報、またはサイト所有者から確認できた実績を掲載する。
 * 新しい実績を追加するときは、記事ページまたは媒体・番組の公式URLも残す。
 */
export const mediaCoverage: readonly MediaCoverageItem[] = [
  {
    id: 'tsukinuke-hokkaido-2026-08-31',
    date: '2026-08-31',
    displayDate: '2026.08.31',
    category: 'Web掲載',
    outlet: 'ツキヌケ北海道',
    title: '「札幌発寒から全国へ Moss Countryの苔の世界」',
    description:
      '北海道初の苔テラリウム専門店としての日常、開業の経緯、ワークショップや北海道から全国へ苔の輪を広げる取り組みを取材していただきました。',
    sourceUrl: 'https://tsukinuke.jp/1/p/45838',
    sourceLabel: 'ツキヌケ北海道の記事を見る',
  },
  {
    id: 'stv-radio-nomad-2026-06-05',
    date: '2026-06-05',
    displayDate: '2026.06.05 13:00〜',
    category: 'ラジオ',
    outlet: 'STVラジオ',
    title: '「ラジオノマド」に出演',
    description:
      '13時からSTVラジオの番組「ラジオノマド」に出演し、Moss Countryと苔テラリウムについてご紹介いただきました。',
    sourceUrl: 'https://www.stv.jp/radio/nomad/index.html',
    sourceLabel: 'STVラジオの番組ページを見る',
  },
  {
    id: 'sapporo-mono-village-2026-05-02',
    date: '2026-05-02',
    displayDate: '2026.05.02',
    category: 'テレビ',
    outlet: 'サッポロ モノ ヴィレッジ 2026春',
    title: '会場からの生中継で出展の様子を放送',
    description:
      '大和ハウス プレミストドームで開催された「サッポロ モノ ヴィレッジ 2026春」の生中継で、Moss Countryの出展映像が放送されました。',
    sourceUrl: 'https://sdome-event.jp/smv/event.php',
    sourceLabel: '公式イベントページを見る',
  },
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
    id: 'hokkaido-shimbun-2026-02-27',
    date: '2026-02-27',
    displayDate: '2026.02.27',
    category: '新聞',
    outlet: '北海道新聞',
    title: '「寒さに強いコケ 小さな緑」に掲載',
    description:
      '北海道新聞の紙面で、寒さに強いコケと小さな緑の世界をテーマにMoss Countryをご紹介いただきました。',
    sourceUrl: 'https://www.hokkaido-np.co.jp/',
    sourceLabel: '北海道新聞デジタルを見る',
  },
  {
    id: 'fm-north-wave-2025-12-06',
    date: '2025-12-06',
    displayDate: '2025.12.06',
    category: 'ラジオ',
    outlet: 'FM NORTH WAVE',
    title: '生中継に出演',
    description:
      'FM NORTH WAVEの生中継に出演し、Moss Countryと苔テラリウムの魅力をご紹介しました。',
    sourceUrl: 'https://www.fmnorth.co.jp/',
    sourceLabel: 'FM NORTH WAVE公式サイトを見る',
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
    id: 'nhk-hotnews-hokkaido-2025-09-22',
    date: '2025-09-22',
    displayDate: '2025.09.22',
    category: 'テレビ',
    outlet: 'NHK札幌放送局',
    title: '「ほっとニュース北海道」生中継に出演',
    description:
      'NHK「ほっとニュース北海道」の生中継に出演し、Moss Countryの苔テラリウムをご紹介いただきました。',
    sourceUrl: 'https://www.nhk.or.jp/hokkaido/',
    sourceLabel: 'NHK北海道の公式サイトを見る',
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
    additionalLinks: [
      {
        url: 'https://www.youtube.com/watch?v=QesKWZmfghk',
        label: 'YouTubeで放送動画を見る',
      },
    ],
    featured: true,
  },
  {
    id: 'stv-sapporo-engei-2025-05-06',
    date: '2025-05-06',
    displayDate: '2025.05.06',
    category: 'テレビ',
    outlet: 'STV札幌テレビ',
    title: '第68回さっぽろ園芸市を村雨アナウンサーが取材',
    description:
      '中島公園で開催された第68回さっぽろ園芸市で、村雨アナウンサーがMoss Countryを取材。苔のカプセルトイと、自分で小さな景色をつくるテラリウムの楽しさをご紹介いただきました。取材は5月6日、STV NEWSの記事は5月8日に公開されました。',
    image: '/images/media/tv-coverage-archive.jpg',
    imageAlt: '第68回さっぽろ園芸市で行われたMoss Countryのテレビ取材画面',
    sourceUrl: 'https://news.ntv.co.jp/n/stv/category/society/stec4bfb02875f40f7ae9d7d03b047c0d6',
    sourceLabel: 'STV NEWSの記事を見る',
  },
];

export const featuredMediaCoverage = mediaCoverage.filter((item) => item.featured);
