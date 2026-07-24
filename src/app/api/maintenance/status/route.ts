import { NextResponse } from 'next/server';
import { getMaintenanceSettings, writeClient } from '@/lib/sanity';
import { DEFAULT_PURCHASE_LOCKED_MESSAGE } from '@/lib/purchaseLock';

/**
 * メンテナンスモードの状態を返す（ミドルウェア用・認証不要）
 * - isEnabled: サイト全体のメンテナンスモード
 * - maintenancePages: ページ単位で「準備中」にするパスの一覧（サイト設定から取得）
 * - purchaseLocked: 閲覧・カート追加はできるが注文/決済の確定のみを止める購入ロック
 * - purchaseLockedMessage: 購入ロック中にチェックアウト画面等で表示するメッセージ
 * Sanity の設定を参照するため、管理画面で変更すると即反映される。
 * ミドルウェアが毎リクエスト参照するため、CDNキャッシュではなく常に最新を返すwriteClientを使う。
 */
export async function GET() {
  try {
    const [settings, siteSettings] = await Promise.all([
      getMaintenanceSettings(),
      writeClient.fetch<{ maintenancePages?: string[] } | null>(
        `*[_type == "siteSettings" && _id == "siteSettings"][0]{ maintenancePages }`
      ),
    ]);
    const isEnabled = settings?.isEnabled === true;
    const maintenancePages = (siteSettings?.maintenancePages || []).filter(
      (p): p is string => typeof p === 'string' && p.startsWith('/')
    );
    const purchaseLocked = settings?.purchaseLocked === true;
    const purchaseLockedMessage = settings?.purchaseLockedMessage || DEFAULT_PURCHASE_LOCKED_MESSAGE;
    return NextResponse.json({ isEnabled, maintenancePages, purchaseLocked, purchaseLockedMessage });
  } catch (error) {
    console.warn('Failed to fetch maintenance status:', error);
    return NextResponse.json({
      isEnabled: false,
      maintenancePages: [],
      purchaseLocked: false,
      purchaseLockedMessage: DEFAULT_PURCHASE_LOCKED_MESSAGE,
    });
  }
}
