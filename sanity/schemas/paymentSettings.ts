import { defineField, defineType } from 'sanity'

// 店頭決済まわりの設定（シングルトン運用）
// 現状はPayPayの店舗用QRコード画像のみ。売上入力の確認画面に表示する
export const paymentSettings = defineType({
  name: 'paymentSettings',
  title: '店頭決済設定',
  type: 'document',
  fields: [
    defineField({
      name: 'payPayQrImage',
      title: 'PayPay 店舗用QRコード',
      type: 'image',
      description: 'PayPay for Businessで発行された店舗掲示用のQRコード画像。売上入力でPayPayを選んだ際の確認画面に表示されます',
    }),
    defineField({ name: 'updatedAt', title: '更新日時', type: 'datetime' }),
  ],
  preview: {
    prepare() {
      return { title: '店頭決済設定' }
    },
  },
})
