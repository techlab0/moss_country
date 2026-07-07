import { defineField, defineType } from 'sanity'

// 送料設定のシングルトンドキュメント（_id: 'shippingSettings'）。
// 送料の実計算・編集はアプリ側の管理画面「送料」タブで行うため、ここはデータの器として定義する。
// ドキュメントが存在しない場合、アプリは src/lib/shipping.ts の DEFAULT_SHIPPING_SETTINGS で動作する。

const shippingSizeTier = {
  type: 'object' as const,
  name: 'shippingSizeTier',
  fields: [
    defineField({ name: 'size', title: 'サイズ区分', type: 'number' }),
    defineField({ name: 'maxDimensionSum', title: '3辺合計の上限(cm)', type: 'number' }),
    defineField({ name: 'maxWeight', title: '重量上限(g)', type: 'number' }),
  ],
}

const shippingRate = {
  type: 'object' as const,
  name: 'shippingRate',
  fields: [
    defineField({ name: 'zoneId', title: '地域ゾーンID', type: 'string' }),
    defineField({ name: 'size', title: 'サイズ区分', type: 'number' }),
    defineField({ name: 'price', title: '送料(円)', type: 'number' }),
  ],
}

const carrierTable = (name: string, title: string) => ({
  type: 'object' as const,
  name,
  title,
  fields: [
    defineField({ name: 'label', title: '表示名', type: 'string' }),
    defineField({ name: 'sizeTiers', title: 'サイズ区分', type: 'array', of: [shippingSizeTier] }),
    defineField({ name: 'rates', title: '料金表', type: 'array', of: [shippingRate] }),
  ],
})

const shippingZone = {
  type: 'object' as const,
  name: 'shippingZone',
  fields: [
    defineField({ name: 'id', title: 'ゾーンID', type: 'string' }),
    defineField({ name: 'name', title: 'ゾーン名', type: 'string' }),
    defineField({ name: 'prefectures', title: '都道府県', type: 'array', of: [{ type: 'string' }] }),
  ],
  preview: { select: { title: 'name', subtitle: 'id' } },
}

export const shippingSettings = defineType({
  name: 'shippingSettings',
  title: '送料設定',
  type: 'document',
  fields: [
    defineField({
      name: 'carrier',
      title: '利用する配送業者',
      type: 'string',
      options: {
        list: [
          { title: 'ゆうパック（日本郵便）', value: 'yupack' },
          { title: '宅急便（ヤマト運輸）', value: 'yamato' },
        ],
      },
      initialValue: 'yupack',
    }),
    defineField({ name: 'zones', title: '地域ゾーン', type: 'array', of: [shippingZone] }),
    defineField({
      name: 'carriers',
      title: '配送業者別 料金表',
      type: 'object',
      fields: [
        defineField(carrierTable('yupack', 'ゆうパック')),
        defineField(carrierTable('yamato', 'ヤマト運輸')),
      ],
    }),
    defineField({ name: 'freeShippingMode', title: 'サイト全体を送料無料にする', type: 'boolean', initialValue: false }),
    defineField({ name: 'freeShippingThreshold', title: '送料割引の対象となる小計(円)', type: 'number' }),
    defineField({ name: 'shippingDiscount', title: '送料割引額(円)', type: 'number' }),
    defineField({ name: 'expressSurcharge', title: '速達加算(円)', type: 'number' }),
    defineField({ name: 'fragileSurcharge', title: '割れ物加算(円)', type: 'number' }),
    defineField({ name: 'packagingBufferCm', title: '梱包時の各辺の余裕(cm)', type: 'number' }),
    defineField({ name: 'packagingWeightG', title: '梱包材の重量(g)', type: 'number' }),
    defineField({ name: 'updatedAt', title: '更新日時', type: 'datetime' }),
  ],
  preview: {
    prepare() {
      return { title: '送料設定' }
    },
  },
})
