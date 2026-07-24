import { defineType } from 'sanity';

export const maintenanceSettings = defineType({
  name: 'maintenanceSettings',
  title: 'メンテナンス設定',
  type: 'document',
  fields: [
    {
      name: 'isEnabled',
      title: 'メンテナンスモード有効',
      type: 'boolean',
      description: 'メンテナンスモードを有効にするかどうか',
      initialValue: false,
    },
    {
      name: 'password',
      title: 'メンテナンスパスワード',
      type: 'string',
      description: 'メンテナンス中にアクセスするためのパスワード',
      validation: (Rule) => Rule.required().min(4).error('パスワードは4文字以上で入力してください'),
    },
    {
      name: 'message',
      title: 'メンテナンスメッセージ',
      type: 'text',
      description: 'メンテナンスページに表示するメッセージ',
      initialValue: '現在、サイトのメンテナンスを行っております。\nご不便をおかけして申し訳ございません。',
    },
    {
      name: 'purchaseLocked',
      title: '購入をロック（閲覧可・注文/決済を停止）',
      type: 'boolean',
      description: 'サイトの閲覧・カート追加はできるが、注文/決済の確定のみを停止する',
      initialValue: false,
    },
    {
      name: 'purchaseLockedMessage',
      title: '購入ロック時の表示メッセージ',
      type: 'text',
      description: '購入ロック中にチェックアウト画面などで表示するメッセージ',
      initialValue: 'ただいまオンライン販売の準備中です。まもなく開始しますので、今しばらくお待ちください。',
    },
    {
      name: 'updatedAt',
      title: '更新日時',
      type: 'datetime',
      readOnly: true,
    },
  ],
  preview: {
    select: {
      isEnabled: 'isEnabled',
      updatedAt: 'updatedAt',
    },
    prepare({ isEnabled, updatedAt }) {
      return {
        title: `メンテナンス設定 - ${isEnabled ? '有効' : '無効'}`,
        subtitle: updatedAt ? `更新: ${new Date(updatedAt).toLocaleDateString('ja-JP')}` : '未更新',
      };
    },
  },
});