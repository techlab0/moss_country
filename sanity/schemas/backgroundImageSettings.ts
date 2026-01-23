import { defineField, defineType } from 'sanity'

export const backgroundImageSettings = defineType({
  name: 'backgroundImageSettings',
  title: '背景画像設定',
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
          description: 'メインページの背景画像（推奨サイズ: 1920×1080px）',
        }),
        defineField({
          name: 'alt',
          title: '代替テキスト',
          type: 'string',
          description: '画像の説明文（SEO対策）',
          initialValue: 'MOSS COUNTRY 背景',
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
          description: '商品ページの背景画像（推奨サイズ: 1920×1080px）',
        }),
        defineField({
          name: 'alt',
          title: '代替テキスト',
          type: 'string',
          description: '画像の説明文（SEO対策）',
          initialValue: '商品ページ背景',
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
          title: '画像（PC）',
          type: 'image',
          options: {
            hotspot: true,
          },
          description: 'ワークショップページの背景画像 PC用（推奨サイズ: 1920×1080px）',
        }),
        defineField({
          name: 'imageMobile',
          title: '画像（モバイル）',
          type: 'image',
          options: {
            hotspot: true,
          },
          description: 'ワークショップページの背景画像 モバイル用（推奨サイズ: 750×1334px）',
        }),
        defineField({
          name: 'alt',
          title: '代替テキスト',
          type: 'string',
          description: '画像の説明文（SEO対策）',
          initialValue: 'ワークショップページ背景',
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
          description: 'ストーリーページの背景画像（推奨サイズ: 1920×1080px）',
        }),
        defineField({
          name: 'alt',
          title: '代替テキスト',
          type: 'string',
          description: '画像の説明文（SEO対策）',
          initialValue: 'ストーリーページ背景',
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
          description: '店舗ページの背景画像（推奨サイズ: 1920×1080px）',
        }),
        defineField({
          name: 'alt',
          title: '代替テキスト',
          type: 'string',
          description: '画像の説明文（SEO対策）',
          initialValue: '店舗ページ背景',
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
        title: '背景画像設定',
        subtitle: updatedAt ? `更新: ${new Date(updatedAt).toLocaleDateString('ja-JP')}` : '未更新',
      }
    },
  },
})
