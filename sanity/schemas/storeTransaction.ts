import { defineField, defineType } from 'sanity'

// 店頭での1会計 = 1ドキュメント。現金・PayPay・手動カード決済の記録用
// （QRコード決済は inStoreCharge が同じ役割を担う）
export const storeTransaction = defineType({
  name: 'storeTransaction',
  title: '店頭取引',
  type: 'document',
  fields: [
    defineField({
      name: 'date',
      title: '日付（JST）',
      type: 'string',
      description: 'YYYY-MM-DD形式。日別集計のキー',
      validation: Rule => Rule.required(),
    }),
    defineField({ name: 'createdAt', title: '登録日時', type: 'datetime' }),
    defineField({
      name: 'paymentMethod',
      title: '支払い方法',
      type: 'string',
      options: {
        list: [
          { title: '現金', value: 'cash' },
          { title: 'PayPay', value: 'payPay' },
          { title: 'クレジット（手動）', value: 'card' },
        ],
      },
    }),
    defineField({
      name: 'visitorCount',
      title: '来店人数（この会計）',
      type: 'number',
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
    defineField({ name: 'total', title: '合計金額', type: 'number' }),
  ],
  preview: {
    select: { total: 'total', method: 'paymentMethod', date: 'date' },
    prepare({ total, method, date }) {
      return { title: `¥${total ?? 0}`, subtitle: `${date ?? ''} ${method ?? ''}` }
    },
  },
})
