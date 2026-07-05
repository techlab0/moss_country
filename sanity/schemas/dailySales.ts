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
      description: '商品ごとに現金・PayPay・クレジット（手入力、QR以外のカード決済用）で内訳を入力します',
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
            defineField({ name: 'cashQuantity', title: '現金：数量', type: 'number' }),
            defineField({ name: 'cashAmount', title: '現金：金額', type: 'number' }),
            defineField({ name: 'payPayQuantity', title: 'PayPay：数量', type: 'number' }),
            defineField({ name: 'payPayAmount', title: 'PayPay：金額', type: 'number' }),
            defineField({ name: 'cardQuantity', title: 'クレジット：数量', type: 'number' }),
            defineField({ name: 'cardAmount', title: 'クレジット：金額', type: 'number' }),
          ],
        },
      ],
    }),
    defineField({
      name: 'customLineItems',
      title: 'その他（都度入力の商品）',
      description: 'カタログにない商品を単発で販売した場合に、商品名と金額を直接記録します',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'customLineItem',
          fields: [
            defineField({ name: 'name', title: '商品名', type: 'string', validation: Rule => Rule.required() }),
            defineField({ name: 'amount', title: '金額', type: 'number', validation: Rule => Rule.required().positive() }),
            defineField({
              name: 'paymentMethod',
              title: '支払い方法',
              type: 'string',
              options: { list: [{ title: '現金', value: 'cash' }, { title: 'PayPay', value: 'payPay' }, { title: 'クレジット', value: 'card' }] },
              initialValue: 'cash',
            }),
          ],
        },
      ],
    }),
    defineField({ name: 'cashAmount', title: '現金合計（自動計算）', type: 'number', readOnly: true }),
    defineField({ name: 'payPayAmount', title: 'PayPay合計（自動計算）', type: 'number', readOnly: true }),
    defineField({ name: 'manualCardAmount', title: 'クレジット合計・手入力分（自動計算）', type: 'number', readOnly: true }),
    defineField({ name: 'wordOfMouthDiscount', title: '口コミ割引', type: 'number' }),
    defineField({ name: 'adjustment', title: '調整', type: 'number' }),
    defineField({ name: 'notes', title: '備考', type: 'text' }),
    defineField({ name: 'updatedAt', title: '更新日時', type: 'datetime' }),
  ],
  preview: {
    select: { title: 'date' },
  },
})
