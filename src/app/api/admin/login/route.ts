import { NextRequest, NextResponse } from 'next/server';
import { validateAdminCredentials, createAdminToken, setAdminSession } from '@/lib/auth';

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

    // 管理者認証情報を検証
    const isValid = validateAdminCredentials(email, password);
    
    if (!isValid) {
      // セキュリティのため、詳細なエラーメッセージは返さない
      return NextResponse.json(
        { error: '認証情報が正しくありません' },
        { status: 401 }
      );
    }

    // 2FAが有効かチェック
    const is2FAEnabled = process.env.ADMIN_2FA_ENABLED === 'true';
    
    if (is2FAEnabled) {
      // 一時的なトークンを生成（2FA未認証状態）
      const tempToken = await createAdminToken('admin', email);
      
      const response = NextResponse.json({ 
        success: true, 
        requiresTwoFactor: true,
        message: '2段階認証が必要です' 
      });
      
      response.cookies.set('admin-temp-session', tempToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 10 * 60, // 10分間の短期間
        path: '/',
      });

      return response;
    } else {
      // 2FAが無効の場合は従来通り
      const token = await createAdminToken('admin', email);
      
      const response = NextResponse.json({ 
        success: true, 
        message: 'ログインに成功しました' 
      });
      
      response.cookies.set('admin-session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60, // 24時間
        path: '/',
      });

      return response;
    }

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}