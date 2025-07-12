import { defineField, defineType } from 'sanity'

export const workshop = defineType({
  name: 'workshop',
  title: 'ワークショップ',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'タイトル',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'slug',
      title: 'スラッグ',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
    }),
    defineField({
      name: 'category',
      title: 'カテゴリー',
      type: 'string',
      options: {
        list: [
          { title: '基本コース', value: 'basic' },
          { title: '上級コース', value: 'advanced' },
          { title: 'ファミリーコース', value: 'family' },
          { title: 'プレミアムコース', value: 'premium' },
        ],
      },
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'description',
      title: '説明',
      type: 'text',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'duration',
      title: '所要時間',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'price',
      title: '料金',
      type: 'number',
      validation: Rule => Rule.required().positive()
    }),
    defineField({
      name: 'capacity',
      title: '定員',
      type: 'number',
      validation: Rule => Rule.required().positive()
    }),
    defineField({
      name: 'image',
      title: 'メイン画像',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'features',
      title: '特徴・含まれるもの',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'difficulty',
      title: '難易度',
      type: 'string',
      options: {
        list: [
          { title: '初心者向け', value: 'beginner' },
          { title: '中級者向け', value: 'intermediate' },
          { title: '上級者向け', value: 'advanced' },
        ],
      },
    }),
    defineField({
      name: 'isActive',
      title: '公開状態',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'schedules',
      title: '開催スケジュール',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'date',
              title: '開催日',
              type: 'datetime',
            },
            {
              name: 'availableSlots',
              title: '空き枠数',
              type: 'number',
            },
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      media: 'image',
    },
    prepare(selection) {
      const { title, category } = selection
      return {
        title,
        subtitle: category,
      }
    },
  },
})