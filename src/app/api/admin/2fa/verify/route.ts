import { NextRequest, NextResponse } from 'next/server';
import { createTwoFactorVerifiedToken } from '@/lib/auth';
import { verifyTwoFactorToken, verifyBackupCode, getTwoFactorSecret, getBackupCodes } from '@/lib/twoFactor';

export async function POST(request: NextRequest) {
  try {
    const { code, isBackupCode } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: '認証コードが必要です' },
        { status: 400 }
      );
    }

    // 2FAが設定されているかチェック
    const secret = getTwoFactorSecret();
    if (!secret) {
      return NextResponse.json(
        { error: '2FAが設定されていません' },
        { status: 400 }
      );
    }

    let isValid = false;

    if (isBackupCode) {
      // バックアップコードを確認
      const backupCodes = getBackupCodes();
      isValid = verifyBackupCode(code, backupCodes);
      
      if (isValid) {
        // 使用されたバックアップコードを削除（実際の実装では環境変数の更新が必要）
        console.log(`バックアップコード ${code} が使用されました。環境変数から削除してください。`);
      }
    } else {
      // TOTPコードを確認
      isValid = verifyTwoFactorToken(code, secret);
    }

    if (!isValid) {
      return NextResponse.json(
        { error: '認証コードが正しくありません' },
        { status: 401 }
      );
    }

    // 2FA認証済みトークンを生成
    const adminEmail = process.env.ADMIN_EMAIL!;
    const token = await createTwoFactorVerifiedToken('admin', adminEmail);
    
    const response = NextResponse.json({ 
      success: true, 
      message: '2FA認証が完了しました' 
    });
    
    response.cookies.set('admin-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24時間
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: '認証に失敗しました' },
      { status: 500 }
    );
  }
}