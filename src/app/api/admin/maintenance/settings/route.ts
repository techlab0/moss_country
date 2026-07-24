import { NextRequest, NextResponse } from 'next/server';
import { getMaintenanceSettings, updateMaintenanceSettings } from '@/lib/sanity';
import { getAppSetting, setAppSetting, MAINTENANCE_PASSWORD_KEY } from '@/lib/appSettings';
import { verifyAdminSession } from '@/lib/auth';
import { DEFAULT_PURCHASE_LOCKED_MESSAGE } from '@/lib/purchaseLock';

type MaintenanceSettings = {
  isEnabled: boolean;
  password: string;
  message?: string;
  purchaseLocked?: boolean;
  purchaseLockedMessage?: string;
};

// GET: 現在の設定を取得
// isEnabled/messageはSanity、password（機密値）はSupabase(app_settings)から取得してマージする。
export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const [settings, password] = await Promise.all([
      getMaintenanceSettings(),
      getAppSetting(MAINTENANCE_PASSWORD_KEY),
    ]);

    // デフォルト値を設定
    const defaultSettings = {
      isEnabled: false,
      message: '現在、サイトのメンテナンスを行っております。\nご不便をおかけして申し訳ございません。',
      purchaseLocked: false,
      purchaseLockedMessage: DEFAULT_PURCHASE_LOCKED_MESSAGE,
    };

    return NextResponse.json({
      success: true,
      settings: {
        ...defaultSettings,
        ...(settings || {}),
        password: password || '',
      }
    });
  } catch (error) {
    console.error('Failed to read maintenance settings:', error);
    return NextResponse.json(
      { error: '設定の読み込みに失敗しました' },
      { status: 500 }
    );
  }
}

// POST: 設定を更新
// isEnabled/messageはSanityへ、password（機密値）はSupabase(app_settings)へ保存する。
// Sanityの既存passwordフィールドへは一切書き込まない。
export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { isEnabled, password, message, purchaseLocked, purchaseLockedMessage } = await request.json();

    // 入力検証
    if (typeof isEnabled !== 'boolean') {
      return NextResponse.json(
        { error: '無効なメンテナンスモード設定です' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.trim().length < 4) {
      return NextResponse.json(
        { error: 'パスワードは4文字以上で入力してください' },
        { status: 400 }
      );
    }

    if (purchaseLocked !== undefined && typeof purchaseLocked !== 'boolean') {
      return NextResponse.json(
        { error: '無効な購入ロック設定です' },
        { status: 400 }
      );
    }

    const trimmedPassword = password.trim();
    const resolvedMessage = message || '現在、サイトのメンテナンスを行っております。\nご不便をおかけして申し訳ございません。';
    const resolvedPurchaseLocked = purchaseLocked === true;
    const resolvedPurchaseLockedMessage = purchaseLockedMessage || DEFAULT_PURCHASE_LOCKED_MESSAGE;

    // Sanityにはpasswordを含めずisEnabled/message/purchaseLocked/purchaseLockedMessageのみ保存
    await updateMaintenanceSettings({
      isEnabled,
      message: resolvedMessage,
      purchaseLocked: resolvedPurchaseLocked,
      purchaseLockedMessage: resolvedPurchaseLockedMessage,
    });

    // passwordはSupabase(app_settings)へ保存
    await setAppSetting(MAINTENANCE_PASSWORD_KEY, trimmedPassword);

    const newSettings: MaintenanceSettings = {
      isEnabled,
      password: trimmedPassword,
      message: resolvedMessage,
      purchaseLocked: resolvedPurchaseLocked,
      purchaseLockedMessage: resolvedPurchaseLockedMessage,
    };

    return NextResponse.json({
      success: true,
      message: '設定を保存しました',
      settings: newSettings
    });

  } catch (error) {
    console.error('Failed to save maintenance settings:', error);
    return NextResponse.json(
      { error: '設定の保存に失敗しました' },
      { status: 500 }
    );
  }
}