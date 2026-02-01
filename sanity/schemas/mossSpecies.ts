import { defineField, defineType } from 'sanity'

export const mossSpecies = defineType({
  name: 'mossSpecies',
  title: '苔図鑑',
  type: 'document',
  fields: [
    // 基本情報
    defineField({
      name: 'name',
      title: '苔の名前（和名）',
      type: 'string',
      validation: Rule => Rule.required(),
      description: '例：ホソウリゴケ、ヒノキゴケ'
    }),
    defineField({
      name: 'commonNames',
      title: '別名・地方名',
      type: 'array',
      of: [{ type: 'string' }],
      description: '一般的な呼び名や地方での呼び名'
    }),
    defineField({
      name: 'slug',
      title: 'スラッグ',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'description',
      title: '詳細説明',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            {title: '通常', value: 'normal'},
            {title: '見出し2', value: 'h2'},
            {title: '見出し3', value: 'h3'},
          ],
          lists: [
            {title: 'bullet', value: 'bullet'},
            {title: 'number', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: '太字', value: 'strong'},
              {title: '斜体', value: 'em'},
            ],
          },
        },
      ],
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'images',
      title: '画像',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {
            hotspot: true,
          },
          fields: [
            {
              name: 'caption',
              title: 'キャプション',
              type: 'string',
              description: '画像の説明（例：テラリウム内での様子、拡大写真など）'
            }
          ]
        },
      ],
      validation: Rule => Rule.required().min(1)
    }),

    // MOSS COUNTRY オリジナル評価システム
    defineField({
      name: 'characteristics',
      title: '育成特性',
      type: 'object',
      fields: [
        {
          name: 'beginnerFriendly',
          title: '初心者適応度',
          type: 'number',
          options: {
            list: [
              { title: '★☆☆☆☆（とても難しい）', value: 1 },
              { title: '★★☆☆☆（難しい）', value: 2 },
              { title: '★★★☆☆（普通）', value: 3 },
              { title: '★★★★☆（育てやすい）', value: 4 },
              { title: '★★★★★（とても育てやすい）', value: 5 },
            ]
          },
          validation: Rule => Rule.required(),
        },
        {
          name: 'waterRequirement',
          title: '水分要求度',
          type: 'string',
          options: {
            list: [
              { title: '低（霧吹き: 週1-2回）', value: 'low' },
              { title: '中（霧吹き: 週2-3回）', value: 'medium' },
              { title: '高（霧吹き: 毎日〜隔日）', value: 'high' },
            ]
          },
          validation: Rule => Rule.required(),
        },
        {
          name: 'lightRequirement',
          title: '光量要求',
          type: 'string',
          options: {
            list: [
              { title: '弱光（間接光・LED弱）', value: 'weak' },
              { title: '中光（明るい室内・LED中）', value: 'medium' },
              { title: '強光（直射日光可・LED強）', value: 'strong' },
            ]
          },
          validation: Rule => Rule.required(),
        },
        {
          name: 'temperatureAdaptability',
          title: '温度適応性',
          type: 'string',
          options: {
            list: [
              { title: '寒冷（5-15℃が最適）', value: 'cold' },
              { title: '温帯（15-25℃が最適）', value: 'temperate' },
              { title: '高温（25℃以上でも適応）', value: 'warm' },
            ]
          },
          validation: Rule => Rule.required(),
        },
        {
          name: 'growthSpeed',
          title: '容器',
          type: 'string',
          options: {
            list: [
              { title: '解放', value: 'slow' },
              { title: '半開放', value: 'normal' },
              { title: '密閉', value: 'fast' },
            ]
          },
        },
        {
          name: 'growthDescription',
          title: '育ち方',
          type: 'text',
          description: '育ち方・成長の様子を自由に記載（例：ゆっくり伸びる、密閉向きなど）',
        },
      ],
      validation: Rule => Rule.required()
    }),

    // 基本情報
    defineField({
      name: 'basicInfo',
      title: '基本情報',
      type: 'object',
      fields: [
        {
          name: 'habitat',
          title: '生息地・自生地',
          type: 'text',
          description: 'この苔が自然界でどのような場所に生息しているか'
        },
        {
          name: 'appearance',
          title: '外観・見た目の特徴',
          type: 'text',
          description: '色、形、大きさ、質感など、見た目の特徴'
        },
        {
          name: 'characteristics',
          title: 'その他の特徴',
          type: 'text',
          description: '成長パターン、季節変化、その他の特徴的な性質'
        },
      ],
    }),

    // 補足情報
    defineField({
      name: 'supplementaryInfo',
      title: '補足情報',
      type: 'object',
      fields: [
        {
          name: 'distribution',
          title: '道内分布・地域情報',
          type: 'text',
          description: '北海道内での分布、見つけやすい地域など'
        },
        {
          name: 'collectionSeason',
          title: '採取可能時期',
          type: 'array',
          of: [{
            type: 'string',
            options: {
              list: [
                { title: '春（3-5月）', value: 'spring' },
                { title: '夏（6-8月）', value: 'summer' },
                { title: '秋（9-11月）', value: 'autumn' },
                { title: '冬（12-2月）', value: 'winter' },
              ]
            }
          }]
        },
        {
          name: 'winterCare',
          title: '冬期管理の注意点',
          type: 'text',
          description: '北海道の厳しい冬期に特に注意すべき管理方法'
        },
        {
          name: 'additionalNotes',
          title: 'その他の情報・メモ',
          type: 'text',
          description: 'その他の補足情報、豆知識、注意事項など'
        },
      ],
    }),

    // 実践的な育て方アドバイス
    defineField({
      name: 'practicalAdvice',
      title: '実践的な育て方アドバイス',
      type: 'object',
      fields: [
        {
          name: 'workshopUsage',
          title: 'ワークショップで使用',
          type: 'boolean',
          initialValue: false,
          description: 'MOSS COUNTRYのワークショップで実際に使用している苔'
        },
        {
          name: 'difficultyPoints',
          title: 'よくある失敗・注意点',
          type: 'array',
          of: [{ type: 'string' }],
          description: '栽培時に注意すべきポイント'
        },
        {
          name: 'successTips',
          title: '成功のコツ',
          type: 'array',
          of: [{ type: 'string' }],
          description: 'うまく育てるためのプロのアドバイス'
        },
        {
          name: 'careInstructions',
          title: '詳しい育て方・管理方法',
          type: 'text',
          description: '水やりの頻度、光の当て方、温度管理、肥料、植え替えなど、具体的な管理方法'
        },
      ],
    }),

    // 分類・管理情報
    defineField({
      name: 'category',
      title: 'カテゴリ',
      type: 'string',
      options: {
        list: [
          { title: '蘚類（せんるい）', value: 'moss' },
          { title: '苔類（たいるい）', value: 'liverwort' },
          { title: 'ツノゴケ類', value: 'hornwort' },
        ]
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'tags',
      title: 'タグ',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags'
      },
      description: '例：初心者向け、北海道産、ワークショップ使用、密閉型向け'
    }),
    defineField({
      name: 'featured',
      title: 'おすすめ',
      type: 'boolean',
      initialValue: false,
      description: 'トップページや特集で紹介する苔'
    }),
    defineField({
      name: 'publishedAt',
      title: '公開日',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'isVisible',
      title: '公開状態',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'sortOrder',
      title: '表示順',
      type: 'number',
      description: '数字が小さいほど上位に表示されます',
    }),
  ],
  orderings: [
    {
      title: '表示順',
      name: 'sortOrder',
      by: [{ field: 'sortOrder', direction: 'asc' }],
    },
    {
      title: '初心者適応度（高い順）',
      name: 'beginnerFriendlyDesc',
      by: [{ field: 'characteristics.beginnerFriendly', direction: 'desc' }],
    },
    {
      title: '公開日（新しい順）',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'name',
      category: 'category',
      beginnerFriendly: 'characteristics.beginnerFriendly',
      media: 'images.0',
    },
    prepare(selection) {
      const { title, category, beginnerFriendly } = selection
      const stars = '★'.repeat(beginnerFriendly || 0) + '☆'.repeat(5 - (beginnerFriendly || 0))
      return {
        title,
        subtitle: `${category} | 初心者度: ${stars}`,
      }
    },
  },
})