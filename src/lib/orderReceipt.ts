// 注文明細をレシート体裁の文字列に組み立てるユーティリティ。
// PayPayアプリの支払い明細に表示される説明文（orderDescription）と、注文確認メールの本文で
// 同じ並び（商品→送料→合計）を使うためにここへ集約する。

export interface ReceiptItem {
  name: string;
  variant?: string | null;
  quantity: number;
  /** 単価（円） */
  price: number;
}

function yen(amount: number): string {
  return `¥${Math.round(amount).toLocaleString()}`;
}

function itemLabel(item: ReceiptItem): string {
  return item.variant ? `${item.name}（${item.variant}）` : item.name;
}

/** メール本文用の明細行（例: 「・タマゴケ（大）×2 ¥2,000」） */
export function buildReceiptItemLines(items: ReceiptItem[]): string[] {
  return items.map(item => `・${itemLabel(item)}×${item.quantity} ${yen(item.price * item.quantity)}`);
}

/** 注文確認メールの「お届け先」欄。住所が未登録なら「未入力」を返す */
export function formatShippingAddress(address: {
  postalCode?: string;
  state?: string;
  city?: string;
  address1?: string;
  address2?: string;
  lastName?: string;
  firstName?: string;
  phone?: string;
} | null | undefined): string {
  if (!address) return '未入力';

  return [
    `〒${address.postalCode ?? ''} ${address.state ?? ''}${address.city ?? ''}${address.address1 ?? ''}${address.address2 ? ' ' + address.address2 : ''}`,
    `${address.lastName ?? ''} ${address.firstName ?? ''} 様`,
    address.phone ? `電話番号: ${address.phone}` : null,
  ].filter((line): line is string => line !== null).join('\n');
}

/**
 * PayPayアプリの支払い詳細に出る説明文を組み立てる。
 * お客様が「何をいくらで買ったか」をアプリの履歴だけで確認できるようにする。
 *
 * PayPayのorderDescriptionは255文字が上限のため、商品数が多い場合は入る分だけ並べて
 * 残りを「ほかN点」に丸める。送料・合計は必ず残す（金額の説明が消えると意味が無いため）。
 */
export function buildPaymentDescription({
  items,
  shippingCost = 0,
  total,
  maxLength = 255,
}: {
  items: ReceiptItem[];
  shippingCost?: number;
  total: number;
  maxLength?: number;
}): string {
  const tailLines: string[] = [];
  if (shippingCost > 0) tailLines.push(`送料 ${yen(shippingCost)}`);
  tailLines.push(`合計 ${yen(total)}`);
  const tail = tailLines.join('\n');

  const itemLines = items.map(item => `${itemLabel(item)}×${item.quantity} ${yen(item.price * item.quantity)}`);

  const kept: string[] = [];
  for (let index = 0; index < itemLines.length; index++) {
    if ([...kept, itemLines[index], tail].join('\n').length <= maxLength) {
      kept.push(itemLines[index]);
      continue;
    }

    // これ以上入らないので、残りを「ほかN点」にまとめる。それも入らなければ
    // 入るまで手前の明細を削る（最後は送料・合計だけになる）。
    let remaining = itemLines.length - kept.length;
    while (kept.length > 0 && [...kept, `ほか${remaining}点`, tail].join('\n').length > maxLength) {
      kept.pop();
      remaining = itemLines.length - kept.length;
    }
    const summarized = [...kept, `ほか${remaining}点`, tail].join('\n');
    return summarized.length <= maxLength ? summarized : tail.slice(0, maxLength);
  }

  return [...kept, tail].join('\n');
}
