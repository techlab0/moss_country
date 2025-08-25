import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 管理画面のルートをチェック
  if (pathname.startsWith('/admin')) {
    // 認証不要のページ
    if (pathname === '/admin/login' || pathname === '/admin/verify-2fa') {
      // ログイン済みの場合はダッシュボードにリダイレクト
      const session = await getAdminSessionFromRequest(request);
      if (session && session.twoFactorVerified !== false) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      return NextResponse.next();
    }

    // 2FA設定ページは基本認証のみ必要
    if (pathname === '/admin/setup-2fa') {
      const session = await getAdminSessionFromRequest(request);
      if (!session) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
      return NextResponse.next();
    }

    // その他の管理画面は完全な認証が必要
    const session = await getAdminSessionFromRequest(request);
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // 2FAが有効で未認証の場合
    const is2FAEnabled = process.env.ADMIN_2FA_ENABLED === 'true';
    if (is2FAEnabled && !session.twoFactorVerified) {
      return NextResponse.redirect(new URL('/admin/verify-2fa', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 管理画面のすべてのルートを保護
    '/admin/:path*',
    // APIルートも保護
    '/api/admin/:path*',
  ],
};