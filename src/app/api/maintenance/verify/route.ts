import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getAdminJwtSecretKey } from '@/lib/auth';
import { checkRateLimit } from '@/lib/simpleRateLimit';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(`maintenance-verify:${ip}`, 5, 60 * 1000)) {
      return NextResponse.json(
        { error: 'リクエストが多すぎます。しばらくしてから再度お試しください' },
        { status: 429 }
      );
    }

    const { password } = await request.json();

    // 入力検証
    if (!password) {
      return NextResponse.json(
        { error: 'パスワードが必要です' },
        { status: 400 }
      );
    }

    // Sanityからメンテナンスパスワードを取得
    const { getMaintenanceSettings } = require('@/lib/sanity');
    const settings = await getMaintenanceSettings();

    if (!settings || !settings.password) {
      return NextResponse.json(
        { error: 'メンテナンスパスワードが設定されていません' },
        { status: 500 }
      );
    }

    const maintenancePassword = settings.password;

    if (password !== maintenancePassword) {
      return NextResponse.json(
        { error: 'パスワードが正しくありません' },
        { status: 401 }
      );
    }

    // パスワードが正しい場合、署名付きJWTを認証クッキーとして発行する
    const maintenanceToken = await new SignJWT({ scope: 'maintenance' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getAdminJwtSecretKey());

    const response = NextResponse.json({
      success: true,
      message: '認証に成功しました'
    });

    // 24時間有効な認証クッキーを設定
    response.cookies.set('maintenance-access', maintenanceToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24時間
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Maintenance verification error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}