import { NextRequest, NextResponse } from 'next/server';
import { getMaintenanceSettings, updateMaintenanceSettings } from '@/lib/sanity';
import { getAppSetting, setAppSetting, MAINTENANCE_PASSWORD_KEY } from '@/lib/appSettings';
import { verifyAdminSession } from '@/lib/auth';

type MaintenanceSettings = {
  isEnabled: boolean;
  password: string;
  message?: string;
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
      message: '現在、サイトのメンテナンスを行っております。\nご不便をおかけして申し訳ございません。'
    };

    return NextResponse.json({
      success: true,
      settings: {
        ...(settings || defaultSettings),
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

    const { isEnabled, password, message } = await request.json();

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

    const trimmedPassword = password.trim();
    const resolvedMessage = message || '現在、サイトのメンテナンスを行っております。\nご不便をおかけして申し訳ございません。';

    // Sanityにはpasswordを含めずisEnabled/messageのみ保存
    await updateMaintenanceSettings({ isEnabled, message: resolvedMessage });

    // passwordはSupabase(app_settings)へ保存
    await setAppSetting(MAINTENANCE_PASSWORD_KEY, trimmedPassword);

    const newSettings: MaintenanceSettings = {
      isEnabled,
      password: trimmedPassword,
      message: resolvedMessage,
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