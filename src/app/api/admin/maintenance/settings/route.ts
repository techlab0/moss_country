import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'maintenance-settings.json');

type MaintenanceSettings = {
  isEnabled: boolean;
  password: string;
};

const defaultSettings: MaintenanceSettings = {
  isEnabled: false,
  password: ''
};

// 設定ファイルから読み込み
async function readSettings(): Promise<MaintenanceSettings> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // ファイルが存在しない場合はデフォルト設定を返す
    return defaultSettings;
  }
}

// 設定ファイルに保存
async function saveSettings(settings: MaintenanceSettings): Promise<void> {
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// GET: 現在の設定を取得
export async function GET() {
  try {
    const settings = await readSettings();
    return NextResponse.json({ 
      success: true, 
      settings 
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
    const { isEnabled, password } = await request.json();

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
      password: password.trim()
    };

    // 設定を保存
    await saveSettings(newSettings);

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