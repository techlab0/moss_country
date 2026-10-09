import { defineField, defineType } from 'sanity'

export const simpleWorkshop = defineType({
  name: 'simpleWorkshop',
  title: 'シンプルワークショップ',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'タイトル',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: '説明',
      type: 'text',
    }),
    defineField({
      name: 'price',
      title: '料金',
      type: 'number',
    }),
    defineField({
      name: 'duration',
      title: '所要時間',
      type: 'string',
    }),
    defineField({
      name: 'category',
      title: '種類',
      type: 'string',
      options: {
        list: [
          { title: '苔テラリウム', value: 'terrarium' },
          { title: 'メンテナンス会', value: 'maintenance' },
          { title: '従来プラン', value: 'legacy' },
        ],
      },
    }),
    defineField({ name: 'containerKey', title: '容器・サイズ識別子', type: 'string' }),
    defineField({ name: 'containerKeys', title: '対応する容器・サイズ', type: 'array', of: [{ type: 'string' }] }),
    defineField({ name: 'containerName', title: '容器・サイズ名', type: 'string' }),
    defineField({ name: 'courseName', title: 'コース名', type: 'string' }),
    defineField({ name: 'mossTypes', title: '使用する苔（1行1種類）', type: 'text' }),
    defineField({ name: 'includedItems', title: '付属品（1行1項目）', type: 'text' }),
    defineField({ name: 'priceNote', title: '追加料金・別売りの案内', type: 'text' }),
    defineField({
      name: 'status',
      title: '受付状態',
      type: 'string',
      initialValue: 'hidden',
      options: {
        list: [
          { title: '受付中', value: 'active' },
          { title: '受付停止中', value: 'paused' },
          { title: '非表示', value: 'hidden' },
        ],
      },
    }),
    defineField({ name: 'sortOrder', title: '表示順', type: 'number' }),
    defineField({
      name: 'pricingMode',
      title: '料金形式',
      type: 'string',
      initialValue: 'standard',
      options: {
        list: [
          { title: '通常料金', value: 'standard' },
          { title: 'メンテナンス会（参加歴別料金）', value: 'maintenance' },
        ],
      },
    }),
    defineField({ name: 'participantPrice', title: '基本コース参加者料金', type: 'number' }),
    defineField({ name: 'nonParticipantPrice', title: '基本コース未参加料金', type: 'number' }),
    defineField({
      name: 'courseImages',
      title: 'コース画像（先頭がメイン・最大5枚）',
      type: 'array',
      validation: (Rule) => Rule.max(5),
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'alt', title: '画像の説明', type: 'string' },
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
    },
  },
})
