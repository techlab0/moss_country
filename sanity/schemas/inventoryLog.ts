// 在庫変更ログスキーマ
import { defineType } from 'sanity';

export default defineType({
  name: 'inventoryLog',
  title: '在庫変更ログ',
  type: 'document',
  fields: [
    {
      name: 'productId',
      title: '商品ID',
      type: 'string',
      validation: (rule) => rule.required()
    },
    {
      name: 'quantityChange',
      title: '数量変更',
      type: 'number',
      validation: (rule) => rule.required()
    },
    {
      name: 'operation',
      title: '操作種別',
      type: 'string',
      options: {
        list: [
          { title: '予約', value: 'reserve' },
          { title: '予約解放', value: 'release' },
          { title: '購入確定', value: 'purchase' },
          { title: '在庫補充', value: 'restock' }
        ]
      },
      validation: (rule) => rule.required()
    },
    {
      name: 'orderId',
      title: '注文ID',
      type: 'string'
    },
    {
      name: 'reason',
      title: '変更理由',
      type: 'string'
    },
    {
      name: 'timestamp',
      title: '変更日時',
      type: 'datetime',
      validation: (rule) => rule.required()
    },
    {
      name: 'user',
      title: '実行ユーザー',
      type: 'string',
      validation: (rule) => rule.required()
    }
  ],
  orderings: [
    {
      title: '新しい順',
      name: 'timestampDesc',
      by: [{ field: 'timestamp', direction: 'desc' }]
    },
    {
      title: '古い順',
      name: 'timestampAsc', 
      by: [{ field: 'timestamp', direction: 'asc' }]
    }
  ],
  preview: {
    select: {
      productId: 'productId',
      operation: 'operation',
      quantityChange: 'quantityChange',
      timestamp: 'timestamp'
    },
    prepare(selection) {
      const { productId, operation, quantityChange, timestamp } = selection;
      const operationLabels = {
        reserve: '予約',
        release: '解放',
        purchase: '購入',
        restock: '補充'
      };
      
      return {
        title: `${operationLabels[operation as keyof typeof operationLabels] || operation}: ${quantityChange > 0 ? '+' : ''}${quantityChange}個`,
        subtitle: `${productId} - ${new Date(timestamp).toLocaleDateString('ja-JP')}`,
        media: '📊'
      };
    }
  }
});