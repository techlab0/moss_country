import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

// かつてフォールバックとして使われていた既知の鍵。この値が設定されている場合、
// ソースコードを見た第三者が管理者JWTを偽造できるため、設定漏れと同様に拒否する。
const KNOWN_INSECURE_SECRETS = [
  'your-super-secret-jwt-key-change-this-in-production',
  'your-super-secret-jwt-key-change-this-in-production-minimum-32-characters',
];

// 署名鍵はモジュール読み込み時ではなく使用時に解決する（ビルド時に環境変数が
// 無くてもビルド自体は通し、実際の認証処理だけを確実に失敗させるため）
export function getAdminJwtSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error('ADMIN_JWT_SECRET が設定されていません。管理者認証を利用するには必ず設定してください。');
  }
  if (KNOWN_INSECURE_SECRETS.includes(secret)) {
    throw new Error('ADMIN_JWT_SECRET にサンプル値が設定されています。安全なランダム値（32文字以上）に変更してください。');
  }
  return new TextEncoder().encode(secret);
}

export interface AdminSession {
  userId: string;
  email: string;
  iat: number;
  exp: number;
  twoFactorVerified?: boolean;
}

// JWTトークンを生成
export async function createAdminToken(userId: string, email: string): Promise<string> {
  return await new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getAdminJwtSecretKey());
}

// JWTトークンを検証
export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getAdminJwtSecretKey());
    return payload as unknown as AdminSession;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// リクエストから管理者セッションを取得
export async function getAdminSessionFromRequest(request: NextRequest): Promise<AdminSession | null> {
  const token = request.cookies.get('admin-session')?.value;
  
  if (!token) {
    return null;
  }
  
  return await verifyAdminToken(token);
}

// 2FA完了後のトークンを生成
export async function createTwoFactorVerifiedToken(userId: string, email: string): Promise<string> {
  return await new SignJWT({ userId, email, twoFactorVerified: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getAdminJwtSecretKey());
}

// JWTトークンを検証 (verifyJWT alias)
export const verifyJWT = verifyAdminToken;

// 管理者セッションを検証する関数（APIルート用）
export async function verifyAdminSession(request: NextRequest): Promise<AdminSession | null> {
  return await getAdminSessionFromRequest(request);
}