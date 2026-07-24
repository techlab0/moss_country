import { getMaintenanceSettings } from '@/lib/sanity';

// 管理画面でメッセージが未設定の場合のフォールバック文言。
// sanity/schemas/maintenanceSettings.ts の purchaseLockedMessage の initialValue と揃えている。
export const DEFAULT_PURCHASE_LOCKED_MESSAGE =
  'ただいまオンライン販売の準備中です。まもなく開始しますので、今しばらくお待ちください。';

export type PurchaseLockStatus = {
  locked: boolean;
  message?: string;
};

/**
 * 「購入ロック」中かどうかを判定する共通ヘルパー。
 * 閲覧・カート追加は許可したまま、注文/決済の確定だけを止めたい場合に、
 * 各注文/決済/予約APIの先頭でこれを呼び、locked===trueなら即403で返す。
 *
 * Sanityの取得に失敗した場合は「ロックされていない」側に倒す。
 * ここは在庫や決済の整合性の話ではなく単なる販売可否のフラグなので、
 * 取得失敗時まで過度に厳しく決済を止める必要はない（既存動作＝販売可を維持する）。
 */
export async function assertPurchaseAllowed(): Promise<PurchaseLockStatus> {
  try {
    const settings = await getMaintenanceSettings();
    if (settings?.purchaseLocked === true) {
      return {
        locked: true,
        message: settings.purchaseLockedMessage || DEFAULT_PURCHASE_LOCKED_MESSAGE,
      };
    }
    return { locked: false };
  } catch (error) {
    console.warn('Failed to check purchase lock status, allowing purchase:', error);
    return { locked: false };
  }
}
