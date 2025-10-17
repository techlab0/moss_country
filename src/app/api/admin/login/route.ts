import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken } from '@/lib/auth';
import { findUserByEmail, verifyPassword } from '@/lib/userManager';
import { logAuditEvent } from '@/lib/auditLog';
import { 
  checkLoginAttempts, 
  recordLoginAttempt 
} from '@/lib/advancedSecurity';

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

    console.log('Login attempt for email:', email);

    // リクエスト情報を取得
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // ログイン試行制限をチェック
    const loginCheck = checkLoginAttempts(email, ipAddress);
    if (loginCheck.isBlocked) {
      console.log('Login blocked for:', email, 'IP:', ipAddress, 'Reason:', loginCheck.reason);
      
      // ブロック状態を記録
      recordLoginAttempt(email, ipAddress, userAgent, false, loginCheck.reason);
      
      const message = loginCheck.lockoutUntil 
        ? `ログイン試行回数の制限に達しました。${loginCheck.lockoutUntil.toLocaleString('ja-JP')}まで待ってからお試しください。`
        : 'ログイン試行回数の制限に達しました。しばらく待ってからお試しください。';
      
      return NextResponse.json(
        { 
          error: message,
          lockoutUntil: loginCheck.lockoutUntil,
          remainingAttempts: loginCheck.remainingAttempts
        },
        { status: 429 }
      );
    }

    // ユーザーを検索
    const user = await findUserByEmail(email);
    if (!user) {
      console.log('User not found:', email);
      
      // ログイン失敗を記録（従来のシステム）
      logAuditEvent(
        'unknown',
        email,
        'login.failed',
        'authentication',
        { reason: 'user_not_found' },
        { ipAddress, userAgent, severity: 'high' }
      );
      
      // ログイン失敗を記録（高度セキュリティシステム）
      recordLoginAttempt(email, ipAddress, userAgent, false, 'user_not_found');
      
      return NextResponse.json(
        { error: '認証情報が正しくありません' },
        { status: 401 }
      );
    }

    console.log('User found:', user.email, 'Role:', user.role);

    // パスワードを検証
    const isPasswordValid = verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      console.log('Invalid password for user:', email);
      
      // ログイン失敗を記録（従来のシステム）
      logAuditEvent(
        user.id,
        user.email,
        'login.failed',
        'authentication',
        { reason: 'invalid_password' },
        { ipAddress, userAgent, severity: 'high' }
      );
      
      // ログイン失敗を記録（高度セキュリティシステム）
      recordLoginAttempt(email, ipAddress, userAgent, false, 'invalid_password');
      
      return NextResponse.json(
        { error: '認証情報が正しくありません' },
        { status: 401 }
      );
    }

    console.log('Password verified for user:', email);

    // 2FAが有効かチェック
    if (user.twoFactorEnabled) {
      console.log('2FA required for user:', email);
      // 一時的なトークンを生成（2FA未認証状態）
      const tempToken = await createAdminToken(user.id, user.email);
      
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
      console.log('2FA not required for user:', email);
      // 2FAが無効の場合は直接ログイン
      const token = await createAdminToken(user.id, user.email);
      
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

      // 最終ログイン時刻を更新
      const { updateUser } = await import('@/lib/userManager');
      await updateUser(user.id, {
        lastLogin: new Date(),
      });

      // ログイン成功を記録（従来のシステム）
      logAuditEvent(
        user.id,
        user.email,
        'login.success',
        'authentication',
        { method: '2fa_disabled' },
        { ipAddress, userAgent, severity: 'low' }
      );

      // ログイン成功を記録（高度セキュリティシステム）
      recordLoginAttempt(email, ipAddress, userAgent, true);

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