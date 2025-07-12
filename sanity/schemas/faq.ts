import { defineField, defineType } from 'sanity'

export const faq = defineType({
  name: 'faq',
  title: 'よくあるご質問',
  type: 'document',
  fields: [
    defineField({
      name: 'question',
      title: '質問',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'answer',
      title: '回答',
      type: 'text',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'category',
      title: 'カテゴリー',
      type: 'string',
      options: {
        list: [
          { title: '商品について', value: 'products' },
          { title: 'ワークショップについて', value: 'workshop' },
          { title: 'メンテナンスについて', value: 'maintenance' },
          { title: '配送について', value: 'shipping' },
          { title: '店舗について', value: 'store' },
          { title: 'その他', value: 'other' },
        ],
      },
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'sortOrder',
      title: '表示順',
      type: 'number',
      description: '数字が小さいほど上位に表示されます',
    }),
    defineField({
      name: 'isPublished',
      title: '公開状態',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  orderings: [
    {
      title: '表示順',
      name: 'sortOrder',
      by: [{ field: 'sortOrder', direction: 'asc' }],
    },
    {
      title: 'カテゴリー別',
      name: 'category',
      by: [{ field: 'category', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'question',
      category: 'category',
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