import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth';

// メンテナンス状態取得APIはチェック対象外（fetch ループ防止）
const MAINTENANCE_STATUS_PATH = '/api/maintenance/status';

async function getIsMaintenanceMode(request: NextRequest): Promise<boolean> {
  if (process.env.MAINTENANCE_MODE === 'true') return true;
  try {
    const statusUrl = new URL(MAINTENANCE_STATUS_PATH, request.url);
    const res = await fetch(statusUrl, { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.isEnabled === true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === MAINTENANCE_STATUS_PATH) {
    return NextResponse.next();
  }

  const isMaintenanceMode = await getIsMaintenanceMode(request);

  if (isMaintenanceMode) {
    // 管理画面、API、メンテナンス関連のパスは除外
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/api') ||
      pathname === '/maintenance' ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/images') ||
      pathname.includes('.') // 静的ファイル
    ) {
      // 管理画面の場合は既存の認証処理を継続
      if (pathname.startsWith('/admin')) {
        // 下の管理画面処理に続く
      } else {
        return NextResponse.next();
      }
    } else {
      // メンテナンス認証クッキーをチェック
      const maintenanceAccess = request.cookies.get('maintenance-access');

      if (maintenanceAccess?.value !== 'allowed') {
        const maintenanceUrl = new URL('/maintenance', request.url);
        return NextResponse.redirect(maintenanceUrl);
      }
    }
  }

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
    // メンテナンスモード用にすべてのパブリックルートをチェック
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};