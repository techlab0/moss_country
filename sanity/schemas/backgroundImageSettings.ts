import { defineField, defineType } from 'sanity'

// 共通の背景画像フィールドを生成するヘルパー関数
const createBackgroundImageFields = (pageName: string, pageTitle: string, altDefault: string) =>
  defineField({
    name: pageName,
    title: pageTitle,
    type: 'object',
    fields: [
      defineField({
        name: 'image',
        title: '画像（PC）',
        type: 'image',
        options: {
          hotspot: true,
        },
        description: `${pageTitle}の背景画像 PC用（推奨サイズ: 1920×1080px）`,
      }),
      defineField({
        name: 'imageMobile',
        title: '画像（モバイル）',
        type: 'image',
        options: {
          hotspot: true,
        },
        description: `${pageTitle}の背景画像 モバイル用（推奨サイズ: 750×1334px）※未設定の場合はPC用画像を使用`,
      }),
      defineField({
        name: 'alt',
        title: '代替テキスト',
        type: 'string',
        description: '画像の説明文（SEO対策）',
        initialValue: altDefault,
      }),
    ],
  })

export const backgroundImageSettings = defineType({
  name: 'backgroundImageSettings',
  title: '背景画像設定',
  type: 'document',
  fields: [
    createBackgroundImageFields('main', 'メインページ', 'MOSS COUNTRY 背景'),
    createBackgroundImageFields('products', '商品ページ', '商品ページ背景'),
    createBackgroundImageFields('workshop', 'ワークショップページ', 'ワークショップページ背景'),
    createBackgroundImageFields('story', 'ストーリーページ', 'ストーリーページ背景'),
    createBackgroundImageFields('store', '店舗ページ', '店舗ページ背景'),
    createBackgroundImageFields('mossGuide', '苔図鑑ページ', '苔図鑑ページ背景'),
    createBackgroundImageFields('blog', 'ブログページ', 'ブログページ背景'),
    createBackgroundImageFields('contact', 'お問い合わせページ', 'お問い合わせページ背景'),
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
