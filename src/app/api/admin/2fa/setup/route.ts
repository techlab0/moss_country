import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { generateTwoFactorSetup } from '@/lib/twoFactor';

export async function POST(request: NextRequest) {
  try {
    // 管理者認証を確認
    const session = await getAdminSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 2FA設定を生成
    const setupData = await generateTwoFactorSetup();
    
    return NextResponse.json(setupData);

  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: '2FA設定の生成に失敗しました' },
      { status: 500 }
    );
  }
}