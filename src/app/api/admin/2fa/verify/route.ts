import { NextRequest, NextResponse } from 'next/server';
import { createTwoFactorVerifiedToken, verifyJWT } from '@/lib/auth';
import { verifyTwoFactorToken, verifyBackupCode, getTwoFactorSecret, getBackupCodes } from '@/lib/twoFactor';
import { checkLoginAttempts, recordLoginAttempt } from '@/lib/advancedSecurity';

export async function POST(request: NextRequest) {
  try {
    const { code, isBackupCode } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: '認証コードが必要です' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 一時セッションからユーザー情報を取得（コード検証前に取得し、試行回数制限のキーに使う）
    const tempToken = request.cookies.get('admin-temp-session')?.value;
    let userId = 'admin';
    let userEmail = process.env.ADMIN_EMAIL!;

    if (tempToken) {
      try {
        const payload = await verifyJWT(tempToken);
        if (payload) {
          userId = payload.userId as string;
          userEmail = payload.email as string;
        }
      } catch (error) {
        console.log('Temp token verification failed, using default admin');
      }
    }

    // 総当たり攻撃対策: 6桁のTOTPコードは試行回数を制限しないと現実的に破られうる
    const attemptCheck = await checkLoginAttempts(userEmail, ipAddress);
    if (attemptCheck.isBlocked) {
      await recordLoginAttempt(userEmail, ipAddress, userAgent, false, attemptCheck.reason);
      const message = attemptCheck.lockoutUntil
        ? `認証試行回数の制限に達しました。${attemptCheck.lockoutUntil.toLocaleString('ja-JP')}まで待ってからお試しください。`
        : '認証試行回数の制限に達しました。しばらく待ってからお試しください。';
      return NextResponse.json(
        { error: message, lockoutUntil: attemptCheck.lockoutUntil },
        { status: 429 }
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
      isValid = await verifyTwoFactorToken(code, secret);
    }

    if (!isValid) {
      await recordLoginAttempt(userEmail, ipAddress, userAgent, false, 'invalid_2fa_code');
      return NextResponse.json(
        { error: '認証コードが正しくありません' },
        { status: 401 }
      );
    }

    await recordLoginAttempt(userEmail, ipAddress, userAgent, true);

    // 2FA認証済みトークンを生成
    const token = await createTwoFactorVerifiedToken(userId, userEmail);
    
    // 最終ログイン時刻を更新
    try {
      const { updateUser } = await import('@/lib/userManager');
      await updateUser(userId, {
        lastLogin: new Date(),
      });
    } catch (error) {
      console.log('Failed to update lastLogin:', error);
    }
    
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

    // 一時セッションを削除
    response.cookies.delete('admin-temp-session');

    return response;

  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: '認証に失敗しました' },
      { status: 500 }
    );
  }
}