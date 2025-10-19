import { NextRequest, NextResponse } from 'next/server';

type MaintenanceSettings = {
  isEnabled: boolean;
  password: string;
};

// 環境変数から設定を読み込み
function readSettings(): MaintenanceSettings {
  return {
    isEnabled: process.env.MAINTENANCE_MODE === 'true',
    password: process.env.MAINTENANCE_PASSWORD || ''
  };
}

// GET: 現在の設定を取得
export async function GET() {
  try {
    const settings = readSettings();
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
    return NextResponse.json(
      { 
        error: '本番環境では環境変数の動的更新はできません。Vercelダッシュボードで環境変数MAINTENANCE_MODEとMAINTENANCE_PASSWORDを設定してください。' 
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to save maintenance settings:', error);
    return NextResponse.json(
      { error: '設定の保存に失敗しました' },
      { status: 500 }
    );
  }
}