import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/auth';

// メンテナンス状態取得APIはチェック対象外（fetch ループ防止）
const MAINTENANCE_STATUS_PATH = '/api/maintenance/status';

interface MaintenanceState {
  isEnabled: boolean;
  maintenancePages: string[];
}

async function getMaintenanceState(request: NextRequest): Promise<MaintenanceState> {
  try {
    const statusUrl = new URL(MAINTENANCE_STATUS_PATH, request.url);
    const res = await fetch(statusUrl, { cache: 'no-store' });
    const data = res.ok ? await res.json() : {};
    return {
      isEnabled: process.env.MAINTENANCE_MODE === 'true' || data?.isEnabled === true,
      maintenancePages: Array.isArray(data?.maintenancePages) ? data.maintenancePages : [],
    };
  } catch {
    return { isEnabled: process.env.MAINTENANCE_MODE === 'true', maintenancePages: [] };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === MAINTENANCE_STATUS_PATH) {
    return NextResponse.next();
  }

  const { isEnabled: isMaintenanceMode, maintenancePages } = await getMaintenanceState(request);

  // ページ別メンテナンス（準備中表示）: サイト設定で指定されたパスは準備中ページに差し替える。
  // 管理者ログイン中は内容確認のためそのまま閲覧できる。
  const isPublicPage =
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    pathname !== '/maintenance' &&
    pathname !== '/page-unavailable' &&
    !pathname.includes('.');
  if (isPublicPage && maintenancePages.includes(pathname)) {
    const session = await getAdminSessionFromRequest(request);
    if (!session) {
      return NextResponse.rewrite(new URL('/page-unavailable', request.url));
    }
  }

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
      // 管理画面・管理APIの場合は既存の認証処理を継続（メンテナンス中も管理者はアクセス可能にする）
      if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
        // 下の処理に続く
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

  // 管理APIのルートをチェック（ログイン前後で必要になる一部のエンドポイントは除外）
  if (pathname.startsWith('/api/admin')) {
    const publicAdminApiPaths = new Set([
      '/api/admin/login',
      '/api/admin/auth/login',
      '/api/admin/2fa/verify',
      '/api/admin/2fa/webauthn/authenticate',
      '/api/admin/logout',
    ]);

    if (!publicAdminApiPaths.has(pathname)) {
      const session = await getAdminSessionFromRequest(request);
      if (!session) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
      }

      const is2FAEnabled = process.env.ADMIN_2FA_ENABLED === 'true';
      if (is2FAEnabled && !session.twoFactorVerified) {
        return NextResponse.json({ error: '2段階認証が必要です' }, { status: 401 });
      }
    }

    return NextResponse.next();
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