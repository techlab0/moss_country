import { NextResponse } from 'next/server';
import { getMaintenanceSettings } from '@/lib/sanity';

/**
 * メンテナンスモードの有効/無効を返す（ミドルウェア用・認証不要）
 * Sanity の設定を参照するため、管理画面で有効にすると即反映される。
 */
export async function GET() {
  try {
    const settings = await getMaintenanceSettings();
    const isEnabled = settings?.isEnabled === true;
    return NextResponse.json({ isEnabled });
  } catch (error) {
    console.warn('Failed to fetch maintenance status:', error);
    return NextResponse.json({ isEnabled: false });
  }
}
