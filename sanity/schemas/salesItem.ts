import { defineField, defineType } from 'sanity'

export const salesItem = defineType({
  name: 'salesItem',
  title: '売上項目',
  type: 'document',
  fields: [
    defineField({
      name: 'category',
      title: 'カテゴリー',
      type: 'string',
      options: {
        list: [
          { title: 'コケ', value: 'moss' },
          { title: '商品', value: 'product' },
          { title: 'フィギュア', value: 'figure' },
          { title: 'ワークショップ', value: 'workshop' },
          { title: 'ガチャ', value: 'gacha' },
          { title: 'その他', value: 'other' },
        ],
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'name',
      title: '項目名',
      type: 'string',
      description: '例: 「ハイゴケ(大)」「1500円プラン」',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'pricingType',
      title: '価格の入力方法',
      type: 'string',
      options: {
        list: [
          { title: '数量入力（単価×数量）', value: 'fixed' },
          { title: '金額を直接入力', value: 'variable' },
        ],
      },
      initialValue: 'fixed',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'unitPrice',
      title: '単価',
      type: 'number',
      description: '「数量入力」の場合のみ使用します',
      validation: Rule => Rule.min(0),
      hidden: ({ document }) => document?.pricingType !== 'fixed',
    }),
    defineField({
      name: 'sortOrder',
      title: '表示順',
      type: 'number',
      initialValue: 0,
    }),
    defineField({
      name: 'isActive',
      title: '有効',
      type: 'boolean',
      description: '無効化しても過去の売上記録には影響しません',
      initialValue: true,
    }),
  ],
  orderings: [
    {
      title: '表示順',
      name: 'sortOrderAsc',
      by: [{ field: 'category', direction: 'asc' }, { field: 'sortOrder', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'category',
      active: 'isActive',
    },
    prepare({ title, subtitle, active }) {
      return {
        title: active === false ? `${title}（無効）` : title,
        subtitle,
      }
    },
  },
})
