import { defineField, defineType } from 'sanity'

export const heroImageSettings = defineType({
  name: 'heroImageSettings',
  title: 'ヒーロー画像設定',
  type: 'document',
  fields: [
    defineField({
      name: 'main',
      title: 'メインページ',
      type: 'object',
      fields: [
        defineField({
          name: 'image',
          title: '画像',
          type: 'image',
          options: {
            hotspot: true,
          },
          description: 'メインページのヒーロー画像（推奨サイズ: 1920×1080px）',
        }),
        defineField({
          name: 'alt',
          title: '代替テキスト',
          type: 'string',
          description: '画像の説明文（SEO対策）',
          initialValue: '美しい苔テラリウムのクローズアップ - MOSS COUNTRYメインビジュアル',
        }),
      ],
    }),
    defineField({
      name: 'products',
      title: '商品ページ',
      type: 'object',
      fields: [
        defineField({
          name: 'image',
          title: '画像',
          type: 'image',
          options: {
            hotspot: true,
          },
          description: '商品ページのヒーロー画像（推奨サイズ: 1920×600px）',
        }),
        defineField({
          name: 'alt',
          title: '代替テキスト',
          type: 'string',
          description: '画像の説明文（SEO対策）',
          initialValue: '様々な種類のテラリウム商品ラインナップ',
        }),
      ],
    }),
    defineField({
      name: 'workshop',
      title: 'ワークショップページ',
      type: 'object',
      fields: [
        defineField({
          name: 'image',
          title: '画像',
          type: 'image',
          options: {
            hotspot: true,
          },
          description: 'ワークショップページのヒーロー画像（推奨サイズ: 1920×600px）',
        }),
        defineField({
          name: 'alt',
          title: '代替テキスト',
          type: 'string',
          description: '画像の説明文（SEO対策）',
          initialValue: 'テラリウム制作ワークショップの様子',
        }),
      ],
    }),
    defineField({
      name: 'story',
      title: 'ストーリーページ',
      type: 'object',
      fields: [
        defineField({
          name: 'image',
          title: '画像',
          type: 'image',
          options: {
            hotspot: true,
          },
          description: 'ストーリーページのヒーロー画像（推奨サイズ: 1920×600px）',
        }),
        defineField({
          name: 'alt',
          title: '代替テキスト',
          type: 'string',
          description: '画像の説明文（SEO対策）',
          initialValue: 'MOSS COUNTRY職人の手作業によるテラリウム制作',
        }),
      ],
    }),
    defineField({
      name: 'store',
      title: '店舗ページ',
      type: 'object',
      fields: [
        defineField({
          name: 'image',
          title: '画像',
          type: 'image',
          options: {
            hotspot: true,
          },
          description: '店舗ページのヒーロー画像（推奨サイズ: 1920×600px）',
        }),
        defineField({
          name: 'alt',
          title: '代替テキスト',
          type: 'string',
          description: '画像の説明文（SEO対策）',
          initialValue: 'MOSS COUNTRY札幌店の温かい店内雰囲気',
        }),
      ],
    }),
    defineField({
      name: 'updatedAt',
      title: '更新日時',
      type: 'datetime',
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      updatedAt: 'updatedAt',
    },
    prepare({ updatedAt }) {
      return {
        title: 'ヒーロー画像設定',
        subtitle: updatedAt ? `更新: ${new Date(updatedAt).toLocaleDateString('ja-JP')}` : '未更新',
      }
    },
  },
})
