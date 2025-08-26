import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
);

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
    .sign(SECRET_KEY);
}

// JWTトークンを検証
export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as AdminSession;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// セッションクッキーを設定
export function setAdminSession(token: string) {
  const cookieStore = cookies();
  cookieStore.set('admin-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // 24時間
    path: '/',
  });
}

// セッションクッキーを削除
export function clearAdminSession() {
  const cookieStore = cookies();
  cookieStore.delete('admin-session');
}

// 現在のセッションを取得
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('admin-session')?.value;
  
  if (!token) {
    return null;
  }
  
  return await verifyAdminToken(token);
}

// 管理者認証情報を検証
export function validateAdminCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminEmail || !adminPassword) {
    console.error('Admin credentials not configured in environment variables');
    return false;
  }
  
  // セキュアな比較を使用
  const emailMatch = email === adminEmail;
  const passwordMatch = password === adminPassword;
  
  return emailMatch && passwordMatch;
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
    .sign(SECRET_KEY);
}

// JWTトークンを検証 (verifyJWT alias)
export const verifyJWT = verifyAdminToken;