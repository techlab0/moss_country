import { defineField, defineType } from 'sanity'

export const dailySales = defineType({
  name: 'dailySales',
  title: '日別売上',
  type: 'document',
  fields: [
    defineField({
      name: 'date',
      title: '日付',
      type: 'date',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'visitorCount',
      title: '来店者数',
      type: 'number',
    }),
    defineField({
      name: 'purchaseGroupCount',
      title: '購入組数',
      type: 'number',
    }),
    defineField({
      name: 'lineItems',
      title: '売上明細',
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
            defineField({ name: 'quantity', title: '数量', type: 'number' }),
            defineField({ name: 'amount', title: '金額', type: 'number' }),
          ],
        },
      ],
    }),
    defineField({ name: 'cashAmount', title: '現金', type: 'number' }),
    defineField({ name: 'payPayAmount', title: 'PayPay', type: 'number' }),
    defineField({ name: 'manualCardAmount', title: 'クレジットカード（手入力）', type: 'number' }),
    defineField({ name: 'wordOfMouthDiscount', title: '口コミ割引', type: 'number' }),
    defineField({ name: 'adjustment', title: '調整', type: 'number' }),
    defineField({ name: 'notes', title: '備考', type: 'text' }),
    defineField({ name: 'updatedAt', title: '更新日時', type: 'datetime' }),
  ],
  preview: {
    select: { title: 'date' },
  },
})
