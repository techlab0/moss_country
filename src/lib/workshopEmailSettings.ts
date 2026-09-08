import { getAppSetting, setAppSetting } from '@/lib/appSettings';

export const WORKSHOP_EMAIL_SETTINGS_KEY = 'workshop_confirmation_email';

export interface WorkshopEmailSettings {
  subject: string;
  body: string;
}

export interface WorkshopEmailVariables {
  bookingNumber: string;
  planName: string;
  date: string;
  startTime: string;
  endTime: string;
  partySize: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  customerName: string;
}

export const WORKSHOP_EMAIL_PLACEHOLDERS = [
  '{{customerName}}',
  '{{bookingNumber}}',
  '{{planName}}',
  '{{date}}',
  '{{startTime}}',
  '{{endTime}}',
  '{{partySize}}',
  '{{total}}',
  '{{paymentLabel}}',
] as const;

export const DEFAULT_WORKSHOP_EMAIL_SUBJECT =
  '【MOSS COUNTRY】ワークショップご予約確認（{{bookingNumber}}）';

export const DEFAULT_WORKSHOP_EMAIL_BODY = [
  '{{customerName}} 様',
  '',
  'MOSS COUNTRY ワークショップのご予約を承りました。',
  '',
  '予約番号: {{bookingNumber}}',
  'プラン: {{planName}}',
  '日時: {{date}} {{startTime}}〜{{endTime}}',
  '人数: {{partySize}}名',
  '金額: ¥{{total}}',
  'お支払い方法: {{paymentLabel}}',
  '',
  '【キャンセルポリシー】',
  '2日前まで: 無料',
  '前日: 参加費の30%',
  '当日: 参加費の50%',
  '体調不良・悪天候・交通機関の乱れなど、やむを得ない事情によるキャンセルはキャンセル料をいただきません。',
  'お手数ですが、お早めにご連絡ください。',
  '',
  'ご不明な点がございましたら本メールへ返信にてお問い合わせください。',
  '',
  'MOSS COUNTRY',
].join('\n');

export function paymentLabelForWorkshopEmail(params: WorkshopEmailVariables): string {
  if (params.paymentMethod === 'credit_card') {
    return params.paymentStatus === 'paid'
      ? 'クレジットカード（決済完了）'
      : 'クレジットカード（決済処理中）';
  }
  if (params.paymentMethod === 'paypay') {
    return params.paymentStatus === 'paid'
      ? 'PayPay（決済完了）'
      : 'PayPay（お支払い手続き中）';
  }
  return '現地精算（当日店舗にてお支払いください）';
}

export function defaultWorkshopEmailBody(params: WorkshopEmailVariables): string {
  return [
    `${params.customerName} 様`,
    '',
    'MOSS COUNTRY ワークショップのご予約を承りました。',
    '',
    `予約番号: ${params.bookingNumber}`,
    `プラン: ${params.planName}`,
    `日時: ${params.date} ${params.startTime}〜${params.endTime}`,
    `人数: ${params.partySize}名`,
    `金額: ¥${params.total.toLocaleString('ja-JP')}`,
    `お支払い方法: ${paymentLabelForWorkshopEmail(params)}`,
    '',
    '【キャンセルポリシー】',
    '2日前まで: 無料',
    '前日: 参加費の30%',
    '当日: 参加費の50%',
    '体調不良・悪天候・交通機関の乱れなど、やむを得ない事情によるキャンセルはキャンセル料をいただきません。',
    'お手数ですが、お早めにご連絡ください。',
    '',
    'ご不明な点がございましたら本メールへ返信にてお問い合わせください。',
    '',
    'MOSS COUNTRY',
  ].join('\n');
}

export function defaultWorkshopEmailSettings(): WorkshopEmailSettings {
  return {
    subject: DEFAULT_WORKSHOP_EMAIL_SUBJECT,
    body: DEFAULT_WORKSHOP_EMAIL_BODY,
  };
}

export function renderWorkshopEmailTemplate(template: string, params: WorkshopEmailVariables): string {
  const values: Record<string, string> = {
    customerName: params.customerName,
    bookingNumber: params.bookingNumber,
    planName: params.planName,
    date: params.date,
    startTime: params.startTime,
    endTime: params.endTime,
    partySize: String(params.partySize),
    total: params.total.toLocaleString('ja-JP'),
    paymentLabel: paymentLabelForWorkshopEmail(params),
  };
  return template.replace(/\{\{([a-zA-Z]+)\}\}/g, (match, key: string) => values[key] ?? match);
}

export async function getWorkshopEmailSettings(): Promise<WorkshopEmailSettings> {
  const defaults = defaultWorkshopEmailSettings();
  const saved = await getAppSetting(WORKSHOP_EMAIL_SETTINGS_KEY);
  if (!saved) return defaults;
  try {
    const parsed = JSON.parse(saved) as Partial<WorkshopEmailSettings>;
    return {
      subject: typeof parsed.subject === 'string' && parsed.subject.trim() ? parsed.subject : defaults.subject,
      body: typeof parsed.body === 'string' && parsed.body.trim() ? parsed.body : defaults.body,
    };
  } catch (error) {
    console.error('ワークショップ自動返信設定の解析に失敗しました:', error);
    return defaults;
  }
}

export async function saveWorkshopEmailSettings(settings: WorkshopEmailSettings): Promise<void> {
  await setAppSetting(WORKSHOP_EMAIL_SETTINGS_KEY, JSON.stringify(settings));
}
