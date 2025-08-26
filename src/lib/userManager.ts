import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'editor';
  twoFactorEnabled: boolean;
  twoFactorMethod: 'sms' | 'google' | 'device' | null;
  phoneNumber?: string;
  googleId?: string;
  deviceCode?: string;
  deviceCodeExpiry?: Date;
  lastLogin?: Date;
  createdAt: Date;
}

export interface UserSession {
  userId: string;
  email: string;
  role: string;
  twoFactorVerified: boolean;
  iat: number;
  exp: number;
}

// 環境変数からユーザーデータを読み込み（本来はデータベース）
export function getUsers(): AdminUser[] {
  const usersJson = process.env.ADMIN_USERS;
  if (!usersJson) {
    // デフォルトユーザー
    const defaultUser: AdminUser = {
      id: 'admin-1',
      email: process.env.ADMIN_EMAIL || 'admin@moss.country',
      passwordHash: hashPassword(process.env.ADMIN_PASSWORD || 'ChangeThis2024!'),
      role: 'admin',
      twoFactorEnabled: false,
      twoFactorMethod: null,
      createdAt: new Date(),
    };
    return [defaultUser];
  }
  
  try {
    return JSON.parse(usersJson);
  } catch {
    return [];
  }
}

// ユーザーデータを環境変数に保存（本来はデータベース）
export function saveUsers(users: AdminUser[]): void {
  // 実際の運用では、この情報をデータベースに保存
  console.log('=== ユーザー情報更新 ===');
  console.log('以下を環境変数 ADMIN_USERS に設定してください:');
  console.log(`ADMIN_USERS='${JSON.stringify(users, null, 2)}'`);
  console.log('====================');
}

// ユーザーをメールアドレスで検索
export function findUserByEmail(email: string): AdminUser | null {
  const users = getUsers();
  return users.find(user => user.email === email) || null;
}

// ユーザーをIDで検索
export function findUserById(id: string): AdminUser | null {
  const users = getUsers();
  return users.find(user => user.id === id) || null;
}

// パスワードをハッシュ化
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

// パスワードを検証
export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// 新しいユーザーを作成
export function createUser(email: string, password: string, role: 'admin' | 'editor' = 'editor'): AdminUser {
  const users = getUsers();
  
  // メールアドレスの重複チェック
  if (users.find(user => user.email === email)) {
    throw new Error('このメールアドレスは既に使用されています');
  }

  const newUser: AdminUser = {
    id: `admin-${Date.now()}`,
    email,
    passwordHash: hashPassword(password),
    role,
    twoFactorEnabled: false,
    twoFactorMethod: null,
    createdAt: new Date(),
  };

  users.push(newUser);
  saveUsers(users);
  
  return newUser;
}

// ユーザー情報を更新
export function updateUser(userId: string, updates: Partial<AdminUser>): AdminUser | null {
  const users = getUsers();
  const userIndex = users.findIndex(user => user.id === userId);
  
  if (userIndex === -1) {
    return null;
  }

  users[userIndex] = { ...users[userIndex], ...updates };
  saveUsers(users);
  
  return users[userIndex];
}

// パスワードを変更
export function changePassword(userId: string, newPassword: string): boolean {
  const users = getUsers();
  const userIndex = users.findIndex(user => user.id === userId);
  
  if (userIndex === -1) {
    return false;
  }

  users[userIndex].passwordHash = hashPassword(newPassword);
  saveUsers(users);
  
  return true;
}

// 端末コードを生成
export function generateDeviceCode(userId: string): string {
  const code = Math.random().toString().substr(2, 6); // 6桁の数字
  const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5分後に失効
  
  updateUser(userId, {
    deviceCode: code,
    deviceCodeExpiry: expiry,
  });
  
  return code;
}

// 端末コードを検証
export function verifyDeviceCode(userId: string, inputCode: string): boolean {
  const user = findUserById(userId);
  if (!user || !user.deviceCode || !user.deviceCodeExpiry) {
    return false;
  }

  const isValid = user.deviceCode === inputCode && new Date() < user.deviceCodeExpiry;
  
  if (isValid) {
    // 使用済みコードをクリア
    updateUser(userId, {
      deviceCode: undefined,
      deviceCodeExpiry: undefined,
    });
  }
  
  return isValid;
}

// ユーザーを削除
export function deleteUser(userId: string): boolean {
  const users = getUsers();
  const filteredUsers = users.filter(user => user.id !== userId);
  
  if (filteredUsers.length === users.length) {
    return false; // ユーザーが見つからない
  }
  
  saveUsers(filteredUsers);
  return true;
}

// エクスポートエイリアス
export const getAdminUsers = getUsers;
export const comparePassword = verifyPassword;
export const updateAdminUser = updateUser;