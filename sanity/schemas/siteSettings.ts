import { defineField, defineType } from 'sanity'

// サイト全体の設定（シングルトン、_id: 'siteSettings'）。
// ヘッダー/フッター/ハンバーガーのリンク構成・SNS・フッター文言・ページ別メンテナンスを管理画面から編集する。
// ドキュメントが存在しない場合、フロント側はコード内のデフォルト（現行のハードコード値）で表示する。

const navLink = {
  type: 'object',
  name: 'navLink',
  fields: [
    defineField({ name: 'label', title: '表示名', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'href', title: 'リンク先URL', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'isVisible', title: '表示する', type: 'boolean', initialValue: true }),
  ],
  preview: {
    select: { title: 'label', subtitle: 'href' },
  },
}

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'サイト設定',
  type: 'document',
  fields: [
    defineField({
      name: 'pageSeo',
      title: 'ページ別のmeta description',
      description: '空欄のページはコード側の既定値が使われます',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'pageSeoEntry',
          fields: [
            defineField({ name: 'path', title: 'パス', type: 'string' }),
            defineField({ name: 'description', title: '説明文', type: 'text', rows: 3 }),
          ],
          preview: { select: { title: 'path', subtitle: 'description' } },
        },
      ],
    }),
    defineField({
      name: 'headerLinks',
      title: 'ヘッダー・ハンバーガーのリンク',
      description: '並び順がそのまま表示順になります',
      type: 'array',
      of: [navLink],
    }),
    defineField({
      name: 'footerSitemapLinks',
      title: 'フッター サイトマップのリンク',
      type: 'array',
      of: [navLink],
    }),
    defineField({
      name: 'footerLegalLinks',
      title: 'フッター 規約関連のリンク',
      type: 'array',
      of: [navLink],
    }),
    defineField({
      name: 'snsLinks',
      title: 'SNSリンク',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'snsLink',
          fields: [
            defineField({
              name: 'platform',
              title: 'プラットフォーム',
              type: 'string',
              options: {
                list: [
                  { title: 'Instagram', value: 'instagram' },
                  { title: 'X (Twitter)', value: 'x' },
                  { title: 'YouTube', value: 'youtube' },
                  { title: 'Threads', value: 'threads' },
                  { title: 'Facebook', value: 'facebook' },
                  { title: 'TikTok', value: 'tiktok' },
                ],
              },
            }),
            defineField({ name: 'url', title: 'URL', type: 'string' }),
            defineField({ name: 'isVisible', title: '表示する', type: 'boolean', initialValue: true }),
          ],
          preview: { select: { title: 'platform', subtitle: 'url' } },
        },
      ],
    }),
    defineField({ name: 'footerTagline', title: 'フッターの紹介文', type: 'text' }),
    defineField({ name: 'businessHours', title: '営業時間', type: 'string' }),
    defineField({ name: 'businessDays', title: '営業日', type: 'string' }),
    defineField({ name: 'copyrightText', title: 'コピーライト表記', type: 'string' }),
    defineField({
      name: 'maintenancePages',
      title: '準備中にするページ',
      description: 'ここに含めたパスのページは「準備中」表示になります（管理者は閲覧可能）',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'craftMossRentalVisibilityConfigured',
      title: 'クラフトモスレンタル公開設定済み',
      type: 'boolean',
      hidden: true,
      initialValue: false,
    }),
    defineField({
      name: 'rentalTerrariumSitemapConfigured',
      title: 'レンタルテラリウムのサイトマップ設定済み',
      type: 'boolean',
      hidden: true,
      initialValue: false,
    }),
    defineField({
      name: 'allowIndexing',
      title: '検索エンジンのインデックスを許可',
      description: 'オンにするとrobots.txtがクロールを許可し、各ページのrobotsメタタグもindexに切り替わります',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'seo',
      title: 'SEO・計測タグ',
      description: '未入力の項目はコード側のデフォルト値が使われます',
      type: 'object',
      fields: [
        defineField({ name: 'siteTitle', title: 'サイトタイトル', type: 'string' }),
        defineField({
          name: 'titleTemplate',
          title: 'ページタイトルの書式',
          description: '%s の位置に各ページのタイトルが入ります（例: %s | MOSS COUNTRY）',
          type: 'string',
        }),
        defineField({ name: 'description', title: 'サイト説明文', type: 'text', rows: 3 }),
        defineField({ name: 'keywords', title: 'キーワード', type: 'array', of: [{ type: 'string' }] }),
        defineField({
          name: 'ogDescription',
          title: 'SNSシェア時の説明文',
          description: '検索結果用の説明文とは別に、短いキャッチコピーを表示します',
          type: 'text',
          rows: 2,
        }),
        defineField({
          name: 'ogImageUrl',
          title: 'OGP画像のURL',
          description: 'SNSシェア時に表示される画像（推奨サイズ 1200x630）',
          type: 'string',
        }),
        defineField({ name: 'twitterHandle', title: 'Xのアカウント', type: 'string' }),
        defineField({
          name: 'googleSiteVerification',
          title: 'Google Search Console 所有権確認コード',
          description: '空欄にするとメタタグ自体を出力しません',
          type: 'string',
        }),
        defineField({
          name: 'gtmContainerId',
          title: 'Google Tag Manager コンテナID',
          description: 'GTM-XXXXXXX 形式。空欄にすると計測タグを読み込みません',
          type: 'string',
        }),
      ],
    }),
    defineField({ name: 'updatedAt', title: '更新日時', type: 'datetime' }),
  ],
  preview: {
    prepare() {
      return { title: 'サイト設定' }
    },
  },
})
