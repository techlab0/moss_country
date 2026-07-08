import { defineField, defineType } from 'sanity'

export const inStoreCharge = defineType({
  name: 'inStoreCharge',
  title: '店頭QR決済',
  type: 'document',
  fields: [
    defineField({
      name: 'amount',
      title: '金額（割引後・実際にSquareへ請求する金額）',
      type: 'number',
      validation: Rule => Rule.required().positive(),
    }),
    defineField({ name: 'subtotal', title: '小計（割引前）', type: 'number' }),
    defineField({
      name: 'discountType',
      title: '割引の種類',
      type: 'string',
      options: { list: [{ title: '金額', value: 'amount' }, { title: 'パーセント', value: 'percent' }] },
    }),
    defineField({ name: 'discountValue', title: '割引の入力値', type: 'number' }),
    defineField({ name: 'discountAmount', title: '割引額（実際に引かれた金額）', type: 'number' }),
    defineField({
      name: 'description',
      title: '備考',
      type: 'string',
    }),
    defineField({
      name: 'lineItems',
      title: '商品明細',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'lineItem',
          fields: [
            defineField({
              name: 'salesItem',
              title: '項目',
              type: 'reference',
              to: [{ type: 'salesItem' }],
            }),
            defineField({ name: 'name', title: '項目名（記録用）', type: 'string' }),
            defineField({ name: 'quantity', title: '数量', type: 'number' }),
            defineField({ name: 'amount', title: '金額', type: 'number' }),
          ],
        },
      ],
    }),
    defineField({
      name: 'visitorCount',
      title: '来店人数（この会計）',
      type: 'number',
    }),
    defineField({
      name: 'method',
      title: '決済方式',
      type: 'string',
      options: {
        list: [
          { title: 'QR決済（お客様のスマホ）', value: 'qr' },
          { title: 'POSアプリ起動（店側iPhoneでタッチ決済等）', value: 'pos' },
        ],
      },
      initialValue: 'qr',
    }),
    defineField({
      name: 'squareOrderId',
      title: 'Square注文ID',
      type: 'string',
    }),
    defineField({
      name: 'posTransactionId',
      title: 'POS API 取引ID（transaction_id）',
      type: 'string',
      description: 'POSアプリ起動決済で返るサーバー側取引ID。Orders/Payments API照合に使用',
    }),
    defineField({
      name: 'posClientTransactionId',
      title: 'POS API 端末取引ID（client_transaction_id）',
      type: 'string',
    }),
    defineField({
      name: 'paymentLinkId',
      title: 'Square決済リンクID',
      type: 'string',
      description: '未払いキャンセル時にSquare側のリンクを削除するために保存',
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
          { title: '返金済み', value: 'refunded' },
        ],
      },
      initialValue: 'pending',
    }),
    defineField({
      name: 'refundId',
      title: 'Square返金ID',
      type: 'string',
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
