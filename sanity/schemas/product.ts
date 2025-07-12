import { defineField, defineType } from 'sanity'

export const product = defineType({
  name: 'product',
  title: '商品',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: '商品名',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'slug',
      title: 'スラッグ',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
    }),
    defineField({
      name: 'description',
      title: '商品説明',
      type: 'text',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'price',
      title: '価格',
      type: 'number',
      validation: Rule => Rule.required().positive()
    }),
    defineField({
      name: 'category',
      title: 'カテゴリー',
      type: 'string',
      options: {
        list: [
          { title: 'カプセルテラリウム', value: 'capsule' },
          { title: 'ボトルテラリウム', value: 'bottle' },
          { title: 'オープンテラリウム', value: 'open' },
          { title: 'メンテナンス用品', value: 'maintenance' },
          { title: 'その他', value: 'other' },
        ],
      },
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'images',
      title: '商品画像',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {
            hotspot: true,
          },
        },
      ],
      validation: Rule => Rule.required().min(1)
    }),
    defineField({
      name: 'features',
      title: '特徴',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'size',
      title: 'サイズ',
      type: 'object',
      fields: [
        {
          name: 'width',
          title: '幅（cm）',
          type: 'number',
        },
        {
          name: 'height',
          title: '高さ（cm）',
          type: 'number',
        },
        {
          name: 'depth',
          title: '奥行き（cm）',
          type: 'number',
        },
      ],
    }),
    defineField({
      name: 'materials',
      title: '材質・植物',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'careInstructions',
      title: 'お手入れ方法',
      type: 'text',
    }),
    defineField({
      name: 'inStock',
      title: '在庫あり',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'featured',
      title: 'おすすめ商品',
      type: 'boolean',
      initialValue: false,
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
      title: '価格（安い順）',
      name: 'priceAsc',
      by: [{ field: 'price', direction: 'asc' }],
    },
    {
      title: '価格（高い順）',
      name: 'priceDesc',
      by: [{ field: 'price', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'name',
      category: 'category',
      price: 'price',
      media: 'images.0',
    },
    prepare(selection) {
      const { title, category, price } = selection
      return {
        title,
        subtitle: `${category} - ¥${price?.toLocaleString()}`,
      }
    },
  },
})