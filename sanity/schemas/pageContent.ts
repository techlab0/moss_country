import { defineField, defineType } from 'sanity'

// 公開ページの文言・画像の上書き値（ページごとに1ドキュメント、_id: 'pageContent-{pageId}'）。
// どのキーが編集可能か（ラベル・種別・デフォルト値）は src/lib/pageContentRegistry.ts が持ち、
// Sanityには管理画面から保存された上書き値だけを持たせる。
// 値が保存されていないキーはレジストリのデフォルト（現行のハードコード文言）で表示される。
export const pageContent = defineType({
  name: 'pageContent',
  title: 'ページ文言・画像',
  type: 'document',
  fields: [
    defineField({
      name: 'pageId',
      title: 'ページID',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'texts',
      title: '文言の上書き',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'textOverride',
          fields: [
            defineField({ name: 'key', title: 'キー', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'value', title: '内容', type: 'text' }),
          ],
          preview: { select: { title: 'key', subtitle: 'value' } },
        },
      ],
    }),
    defineField({
      name: 'images',
      title: '画像の上書き',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'imageOverride',
          fields: [
            defineField({ name: 'key', title: 'キー', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'image', title: '画像', type: 'image', options: { hotspot: true } }),
            defineField({ name: 'alt', title: '代替テキスト', type: 'string' }),
            defineField({ name: 'positionX', title: '表示位置（横）', type: 'number', initialValue: 50, validation: (Rule) => Rule.min(0).max(100) }),
            defineField({ name: 'positionY', title: '表示位置（縦）', type: 'number', initialValue: 50, validation: (Rule) => Rule.min(0).max(100) }),
          ],
          preview: { select: { title: 'key', media: 'image' } },
        },
      ],
    }),
    defineField({ name: 'updatedAt', title: '更新日時', type: 'datetime' }),
  ],
  preview: {
    select: { title: 'pageId' },
    prepare({ title }) {
      return { title: `ページ文言: ${title}` }
    },
  },
})
