import { NextRequest, NextResponse } from 'next/server';
import { getMaintenanceSettings, updateMaintenanceSettings } from '@/lib/sanity';

type MaintenanceSettings = {
  isEnabled: boolean;
  password: string;
  message?: string;
};

// GET: 現在の設定を取得
export async function GET() {
  try {
    const settings = await getMaintenanceSettings();
    
    // デフォルト値を設定
    const defaultSettings = {
      isEnabled: false,
      password: '',
      message: '現在、サイトのメンテナンスを行っております。\nご不便をおかけして申し訳ございません。'
    };
    
    return NextResponse.json({ 
      success: true, 
      settings: settings || defaultSettings
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
export async function POST(request: NextRequest) {
  try {
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

    const newSettings: MaintenanceSettings = {
      isEnabled,
      password: password.trim(),
      message: message || '現在、サイトのメンテナンスを行っております。\nご不便をおかけして申し訳ございません。'
    };

    // Sanityに設定を保存
    await updateMaintenanceSettings(newSettings);

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