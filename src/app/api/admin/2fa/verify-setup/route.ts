import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth';
import { verifyTwoFactorToken } from '@/lib/twoFactor';

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

    const { token, secret } = await request.json();

    if (!token || !secret) {
      return NextResponse.json(
        { error: '認証コードとシークレットが必要です' },
        { status: 400 }
      );
    }

    // TOTPコードを検証
    const isValid = await verifyTwoFactorToken(token, secret);
    
    if (!isValid) {
      return NextResponse.json(
        { error: '認証コードが正しくありません' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: '認証コードの確認に失敗しました' },
      { status: 500 }
    );
  }
}