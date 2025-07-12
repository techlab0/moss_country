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
  ],
  preview: {
    select: {
      title: 'title',
    },
  },
})