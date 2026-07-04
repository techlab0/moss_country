import { defineField, defineType } from 'sanity'

export const inStoreCharge = defineType({
  name: 'inStoreCharge',
  title: '店頭QR決済',
  type: 'document',
  fields: [
    defineField({
      name: 'amount',
      title: '金額',
      type: 'number',
      validation: Rule => Rule.required().positive(),
    }),
    defineField({
      name: 'description',
      title: '備考',
      type: 'string',
    }),
    defineField({
      name: 'squareOrderId',
      title: 'Square注文ID',
      type: 'string',
    }),
    defineField({
      name: 'squarePaymentId',
      title: 'Square決済ID',
      type: 'string',
    }),
    defineField({
      name: 'paymentLinkUrl',
      title: '決済リンクURL',
      type: 'url',
    }),
    defineField({
      name: 'status',
      title: 'ステータス',
      type: 'string',
      options: {
        list: [
          { title: '発行済み（未決済）', value: 'pending' },
          { title: '支払い済み', value: 'paid' },
          { title: 'キャンセル', value: 'cancelled' },
        ],
      },
      initialValue: 'pending',
    }),
    defineField({ name: 'createdAt', title: '作成日時', type: 'datetime' }),
    defineField({ name: 'paidAt', title: '支払い日時', type: 'datetime' }),
  ],
  preview: {
    select: { title: 'amount', subtitle: 'status' },
    prepare({ title, subtitle }) {
      return { title: `¥${title}`, subtitle }
    },
  },
})
