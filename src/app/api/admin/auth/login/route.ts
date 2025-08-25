import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/multiFactorAuth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // 入力検証
    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードが必要です' },
        { status: 400 }
      );
    }

    const authResult = await authenticateUser(email, password);

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.message },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      requiresTwoFactor: authResult.requiresTwoFactor,
      twoFactorMethod: authResult.twoFactorMethod,
      message: authResult.message,
      deviceCode: authResult.deviceCode, // 端末認証用
    });

    // トークンをクッキーに設定
    if (authResult.token) {
      const cookieName = authResult.requiresTwoFactor ? 'admin-temp-session' : 'admin-session';
      const maxAge = authResult.requiresTwoFactor ? 10 * 60 : 24 * 60 * 60; // 2FA待機は10分、完全認証は24時間

      response.cookies.set(cookieName, authResult.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge,
        path: '/',
      });
    }

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}