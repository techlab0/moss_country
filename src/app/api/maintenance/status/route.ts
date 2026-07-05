import { NextResponse } from 'next/server';
import { getMaintenanceSettings, writeClient } from '@/lib/sanity';

/**
 * メンテナンスモードの状態を返す（ミドルウェア用・認証不要）
 * - isEnabled: サイト全体のメンテナンスモード
 * - maintenancePages: ページ単位で「準備中」にするパスの一覧（サイト設定から取得）
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
    return NextResponse.json({ isEnabled, maintenancePages });
  } catch (error) {
    console.warn('Failed to fetch maintenance status:', error);
    return NextResponse.json({ isEnabled: false, maintenancePages: [] });
  }
}
