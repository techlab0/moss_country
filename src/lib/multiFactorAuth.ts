import { findUserByEmail, findUserById, generateDeviceCode, verifyDeviceCode, updateUser } from './userManager';
import { sendSMSCode, verifySMSCode, normalizePhoneNumber, isValidPhoneNumber } from './smsAuth';
import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
);

export interface AuthResult {
  success: boolean;
  requiresTwoFactor?: boolean;
  twoFactorMethod?: string;
  message: string;
  token?: string;
  deviceCode?: string;
}

// パスワード認証
export async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  const user = findUserByEmail(email);
  
  if (!user) {
    return { success: false, message: '認証情報が正しくありません' };
  }

  const bcrypt = await import('bcryptjs');
  const isValidPassword = bcrypt.compareSync(password, user.passwordHash);
  
  if (!isValidPassword) {
    return { success: false, message: '認証情報が正しくありません' };
  }

  // 2FAが有効でない場合は完了
  if (!user.twoFactorEnabled) {
    const token = await createUserToken(user.id, user.email, user.role, true);
    return {
      success: true,
      message: 'ログインに成功しました',
      token,
    };
  }

  // 2FAが必要
  let deviceCode;
  if (user.twoFactorMethod === 'device') {
    deviceCode = generateDeviceCode(user.id);
  } else if (user.twoFactorMethod === 'sms' && user.phoneNumber) {
    await sendSMSCode(user.phoneNumber, user.id);
  }

  const tempToken = await createUserToken(user.id, user.email, user.role, false);
  
  return {
    success: true,
    requiresTwoFactor: true,
    twoFactorMethod: user.twoFactorMethod!,
    message: '2段階認証が必要です',
    token: tempToken,
    deviceCode,
  };
}

// 2段階認証を検証
export async function verifyTwoFactor(tempToken: string, code: string, method: string): Promise<AuthResult> {
  try {
    const payload = await verifyUserToken(tempToken);
    if (!payload || payload.twoFactorVerified) {
      return { success: false, message: '無効なトークンです' };
    }

    const user = findUserById(payload.userId);
    if (!user) {
      return { success: false, message: 'ユーザーが見つかりません' };
    }

    let isValid = false;
    
    switch (method) {
      case 'sms':
        isValid = verifySMSCode(user.id, code);
        break;
      case 'device':
        isValid = verifyDeviceCode(user.id, code);
        break;
      case 'google':
        // Google認証は別のフローで処理
        return { success: false, message: 'Google認証は別途処理してください' };
      default:
        return { success: false, message: '不明な認証方法です' };
    }

    if (!isValid) {
      return { success: false, message: '認証コードが正しくありません' };
    }

    // 最終認証済みトークンを生成
    const finalToken = await createUserToken(user.id, user.email, user.role, true);
    
    // 最終ログイン時刻を更新
    updateUser(user.id, { lastLogin: new Date() });
    
    return {
      success: true,
      message: '2段階認証が完了しました',
      token: finalToken,
    };

  } catch (error) {
    return { success: false, message: '認証エラーが発生しました' };
  }
}

// 2FAを設定
export async function setupTwoFactor(userId: string, method: 'sms' | 'device', phoneNumber?: string): Promise<AuthResult> {
  const user = findUserById(userId);
  if (!user) {
    return { success: false, message: 'ユーザーが見つかりません' };
  }

  if (method === 'sms') {
    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      return { success: false, message: '有効な電話番号を入力してください' };
    }
    
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    updateUser(userId, {
      twoFactorEnabled: true,
      twoFactorMethod: 'sms',
      phoneNumber: normalizedPhone,
    });
  } else if (method === 'device') {
    updateUser(userId, {
      twoFactorEnabled: true,
      twoFactorMethod: 'device',
    });
  }

  return { success: true, message: '2段階認証が設定されました' };
}

// JWTトークンを作成
async function createUserToken(userId: string, email: string, role: string, twoFactorVerified: boolean): Promise<string> {
  return await new SignJWT({ userId, email, role, twoFactorVerified })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY);
}

// JWTトークンを検証
async function verifyUserToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as any;
  } catch (error) {
    return null;
  }
}

// セッションからユーザー情報を取得
export async function getUserFromSession(token: string) {
  const payload = await verifyUserToken(token);
  if (!payload) return null;
  
  return findUserById(payload.userId);
}