import type { WorkshopBooking } from './workshopBookings';

type CancellationEmailBooking = Pick<
  WorkshopBooking,
  | 'bookingNumber'
  | 'workshopPlanName'
  | 'date'
  | 'startTime'
  | 'endTime'
  | 'partySize'
  | 'customerName'
  | 'paymentMethod'
  | 'total'
>;

export type WorkshopCancellationOutcome =
  | { kind: 'cancelled'; needsRefund: boolean }
  | { kind: 'refunded'; refundAmount: number; isFullRefund: boolean };

function paymentMethodLabel(paymentMethod: WorkshopBooking['paymentMethod']): string {
  switch (paymentMethod) {
    case 'paypay':
      return 'PayPay';
    case 'credit_card':
      return 'クレジットカード';
    case 'external':
      return '外部予約サイト';
    case 'on_site':
      return '現地払い';
    default:
      return '未設定';
  }
}

/**
 * ワークショップのキャンセル／返金完了メールを組み立てる。
 * 返金を行っていない通常キャンセルでは、返金済みと誤認させない文面にする。
 */
export function buildWorkshopCancellationEmail(
  booking: CancellationEmailBooking,
  outcome: WorkshopCancellationOutcome,
): { subject: string; text: string } {
  const commonLines = [
    `${booking.customerName || 'お客様'} 様`,
    '',
    outcome.kind === 'refunded'
      ? outcome.isFullRefund
        ? 'ご予約をキャンセルし、お支払いいただいた全額を返金いたしました。'
        : 'ご予約をキャンセルし、下記の金額を返金いたしました。'
      : 'ご予約のキャンセル処理が完了しましたので、お知らせいたします。',
    '',
    `予約番号: ${booking.bookingNumber}`,
    `プラン: ${booking.workshopPlanName || 'ワークショップ'}`,
    `日時: ${booking.date} ${booking.startTime}〜${booking.endTime}`,
    `人数: ${booking.partySize}名`,
  ];

  const outcomeLines = outcome.kind === 'refunded'
    ? [
        `返金金額: ¥${outcome.refundAmount.toLocaleString('ja-JP')}`,
        ...(outcome.isFullRefund || booking.total === null
          ? []
          : [
              `お支払い金額: ¥${booking.total.toLocaleString('ja-JP')}`,
              'キャンセルポリシーに基づき、キャンセル料を差し引いた金額を返金しております。',
            ]),
        `返金方法: ${paymentMethodLabel(booking.paymentMethod)}`,
        '',
        '返金の反映までには、お支払い方法により数日かかる場合があります。',
      ]
    : outcome.needsRefund
      ? [
          '',
          'このメールは予約キャンセルの完了をお知らせするものです。返金手続きはまだ完了していません。',
          '返金・精算については、店舗から別途ご案内いたします。',
        ]
      : [
          '',
          'このキャンセルに伴うオンライン返金はありません。',
        ];

  return {
    subject: outcome.kind === 'refunded'
      ? `【MOSS COUNTRY】ご予約のキャンセルと返金のお知らせ（予約番号: ${booking.bookingNumber}）`
      : `【MOSS COUNTRY】ワークショップ予約キャンセルのお知らせ（予約番号: ${booking.bookingNumber}）`,
    text: [
      ...commonLines,
      ...outcomeLines,
      '',
      'ご不明な点がございましたら、このメールへご返信ください。',
      '',
      '----',
      'MOSS COUNTRY',
    ].join('\n'),
  };
}
