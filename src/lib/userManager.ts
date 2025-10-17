import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'editor';
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'totp' | 'webauthn' | null;
  totpSecret?: string;
  webauthnCredentials?: any[];
  lastLogin?: Date;
  createdAt: Date;
}

// 環境変数でデータベース使用を制御
const USE_DATABASE = process.env.USE_SUPABASE === 'true';

// Supabase関数を動的インポート用
async function getSupabaseFunctions() {
  if (!USE_DATABASE) return null;
  try {
    const supabaseModule = await import('./supabase');
    return {
      createUserInDB: supabaseModule.createUserInDB,
      findUserByEmailInDB: supabaseModule.findUserByEmailInDB,
      findUserByIdInDB: supabaseModule.findUserByIdInDB,
      updateUserInDB: supabaseModule.updateUserInDB,
      getAllUsersFromDB: supabaseModule.getAllUsersFromDB
    };
  } catch (error) {
    console.warn('Supabaseモジュールの読み込みに失敗:', error);
    return null;
  }
}

export interface UserSession {
  userId: string;
  email: string;
  role: string;
  twoFactorVerified: boolean;
  iat: number;
  exp: number;
}

// メモリベースのユーザーストレージ（開発・デモ用）
let usersCache: AdminUser[] | null = null;

// デフォルトユーザーを作成
function createDefaultUser(): AdminUser {
  const adminEmail = process.env.ADMIN_EMAIL || 'moss.country.kokenokuni@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeThis2024!SecurePassword';
  
  return {
    id: 'admin-1',
    email: adminEmail,
    passwordHash: hashPassword(adminPassword),
    role: 'admin',
    twoFactorEnabled: false,
    twoFactorMethod: null,
    createdAt: new Date(),
  };
}

// ユーザーデータを読み込み（データベース優先、フォールバックでメモリベース）
export async function getUsers(): Promise<AdminUser[]> {
  console.log('getUsers called, USE_DATABASE:', USE_DATABASE);
  
  if (USE_DATABASE) {
    const supabaseFunctions = await getSupabaseFunctions();
    if (supabaseFunctions) {
      try {
        console.log('Attempting to get users from database...');
        const dbUsers = await supabaseFunctions.getAllUsersFromDB();
        console.log('Database users retrieved:', dbUsers?.length || 0);
        return dbUsers.map(convertDBUserToAdminUser);
      } catch (error) {
        console.error('データベース接続に失敗、メモリベースにフォールバック:', error);
      }
    }
  }
  
  // メモリベース（フォールバック）
  console.log('Using memory-based fallback');
  
  if (usersCache === null) {
    console.log('Initializing users cache');
    const usersJson = process.env.ADMIN_USERS;
    if (!usersJson) {
      const defaultUser = createDefaultUser();
      usersCache = [defaultUser];
      
      console.log('Created default user:', {
        email: defaultUser.email,
        role: defaultUser.role,
        twoFactorEnabled: defaultUser.twoFactorEnabled
      });
    } else {
      try {
        usersCache = JSON.parse(usersJson);
        console.log('Loaded users from env var:', usersCache?.length || 0);
      } catch {
        console.log('Failed to parse ADMIN_USERS, creating default');
        usersCache = [createDefaultUser()];
      }
    }
  }
  
  const result = usersCache || [];
  console.log('getUsers returning:', result.length, 'users');
  return result;
}

// 同期版（既存コードとの互換性用）
export function getUsersSync(): AdminUser[] {
  if (usersCache === null) {
    const usersJson = process.env.ADMIN_USERS;
    if (!usersJson) {
      const defaultUser = createDefaultUser();
      usersCache = [defaultUser];
    } else {
      try {
        usersCache = JSON.parse(usersJson);
      } catch {
        usersCache = [createDefaultUser()];
      }
    }
  }
  return usersCache || [];
}

// ユーザーデータを保存（メモリベース）
export function saveUsers(users: AdminUser[]): void {
  usersCache = [...users]; // 配列をコピーして保存
  
  console.log('=== ユーザー情報更新 ===');
  console.log(`現在のユーザー数: ${users.length}`);
  users.forEach(user => {
    console.log(`- ${user.email} (${user.role})`);
  });
  console.log('====================');
  
  // 本番環境では、ここでデータベースに保存
  // 現在はメモリ上でのみ管理（サーバー再起動でリセット）
}

// DB用ユーザー型定義（動的インポート用）
interface DBAdminUser {
  id: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'editor';
  two_factor_enabled: boolean;
  totp_secret?: string | null;
  webauthn_credentials?: any[] | null;
  last_login?: Date | null;
  created_at: Date;
  updated_at: Date;
}

// DB用ユーザー型変換
function convertDBUserToAdminUser(dbUser: DBAdminUser): AdminUser {
  return {
    id: dbUser.id,
    email: dbUser.email,
    passwordHash: dbUser.password_hash,
    role: dbUser.role,
    twoFactorEnabled: dbUser.two_factor_enabled,
    twoFactorMethod: dbUser.totp_secret ? 'totp' : (dbUser.webauthn_credentials?.length ? 'webauthn' : null),
    totpSecret: dbUser.totp_secret || undefined,
    webauthnCredentials: dbUser.webauthn_credentials || undefined,
    lastLogin: dbUser.last_login || undefined,
    createdAt: new Date(dbUser.created_at)
  };
}

function convertAdminUserToDBUser(user: AdminUser): Omit<DBAdminUser, 'id' | 'created_at' | 'updated_at'> {
  return {
    email: user.email,
    password_hash: user.passwordHash,
    role: user.role,
    two_factor_enabled: user.twoFactorEnabled,
    totp_secret: user.totpSecret || null,
    webauthn_credentials: user.webauthnCredentials || null,
    last_login: user.lastLogin || null
  };
}

// ユーザーをメールアドレスで検索
export async function findUserByEmail(email: string): Promise<AdminUser | null> {
  if (USE_DATABASE) {
    const supabaseFunctions = await getSupabaseFunctions();
    if (supabaseFunctions) {
      try {
        const dbUser = await supabaseFunctions.findUserByEmailInDB(email);
        return dbUser ? convertDBUserToAdminUser(dbUser) : null;
      } catch (error) {
        console.warn('データベース検索に失敗、メモリベースにフォールバック:', error);
      }
    }
  }
  
  const users = getUsersSync();
  return users.find(user => user.email === email) || null;
}

// 同期版（既存コードとの互換性用）
export function findUserByEmailSync(email: string): AdminUser | null {
  const users = getUsersSync();
  return users.find(user => user.email === email) || null;
}

// ユーザーをIDで検索
export async function findUserById(id: string): Promise<AdminUser | null> {
  if (USE_DATABASE) {
    const supabaseFunctions = await getSupabaseFunctions();
    if (supabaseFunctions) {
      try {
        const dbUser = await supabaseFunctions.findUserByIdInDB(id);
        return dbUser ? convertDBUserToAdminUser(dbUser) : null;
      } catch (error) {
        console.warn('データベース検索に失敗、メモリベースにフォールバック:', error);
      }
    }
  }
  
  const users = getUsersSync();
  return users.find(user => user.id === id) || null;
}

// 同期版（既存コードとの互換性用）
export function findUserByIdSync(id: string): AdminUser | null {
  const users = getUsersSync();
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
export async function createUser(email: string, password: string, role: 'admin' | 'editor' = 'editor'): Promise<AdminUser> {
  // メールアドレスの重複チェック
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    console.log('User already exists:', existingUser.email);
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

  if (USE_DATABASE) {
    const supabaseFunctions = await getSupabaseFunctions();
    if (supabaseFunctions) {
      try {
        console.log('Creating user in database:', {
          email: newUser.email,
          role: newUser.role,
          use_database: USE_DATABASE
        });
        
        const dbUserData = convertAdminUserToDBUser(newUser);
        console.log('Converted user data for DB:', dbUserData);
        
        const dbUser = await supabaseFunctions.createUserInDB(dbUserData);
        console.log('User created in DB:', dbUser);
        
        return convertDBUserToAdminUser(dbUser);
      } catch (error) {
        console.error('データベース作成に失敗、メモリベースにフォールバック:', error);
        console.error('Error details:', error);
        
        // 重複エラーの場合は例外を再throw
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
          throw new Error('このメールアドレスは既に使用されています');
        }
      }
    }
  }

  // メモリベース（フォールバック）
  const users = getUsersSync();
  users.push(newUser);
  saveUsers(users);
  
  return newUser;
}

// 同期版（既存コードとの互換性用）
export function createUserSync(email: string, password: string, role: 'admin' | 'editor' = 'editor'): AdminUser {
  const users = getUsersSync();
  
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
export async function updateUser(userId: string, updates: Partial<AdminUser>): Promise<AdminUser | null> {
  if (USE_DATABASE) {
    const supabaseFunctions = await getSupabaseFunctions();
    if (supabaseFunctions) {
      try {
        const currentUser = await supabaseFunctions.findUserByIdInDB(userId);
        if (!currentUser) return null;
        
        const updatedUser = { ...convertDBUserToAdminUser(currentUser), ...updates };
        const dbUser = await supabaseFunctions.updateUserInDB(userId, convertAdminUserToDBUser(updatedUser));
        return convertDBUserToAdminUser(dbUser);
      } catch (error) {
        console.warn('データベース更新に失敗、メモリベースにフォールバック:', error);
      }
    }
  }
  
  // メモリベース（フォールバック）
  const users = getUsersSync();
  const userIndex = users.findIndex(user => user.id === userId);
  
  if (userIndex === -1) {
    return null;
  }

  users[userIndex] = { ...users[userIndex], ...updates };
  saveUsers(users);
  
  return users[userIndex];
}

// 同期版（既存コードとの互換性用）
export function updateUserSync(userId: string, updates: Partial<AdminUser>): AdminUser | null {
  const users = getUsersSync();
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
  const users = getUsersSync();
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
  
  updateUserSync(userId, {
    deviceCode: code,
    deviceCodeExpiry: expiry,
  });
  
  return code;
}

// 端末コードを検証
export function verifyDeviceCode(userId: string, inputCode: string): boolean {
  const user = findUserByIdSync(userId);
  if (!user || !user.deviceCode || !user.deviceCodeExpiry) {
    return false;
  }

  const isValid = user.deviceCode === inputCode && new Date() < user.deviceCodeExpiry;
  
  if (isValid) {
    // 使用済みコードをクリア
    updateUserSync(userId, {
      deviceCode: undefined,
      deviceCodeExpiry: undefined,
    });
  }
  
  return isValid;
}

// ユーザーを削除
export function deleteUser(userId: string): boolean {
  const users = getUsersSync();
  const filteredUsers = users.filter(user => user.id !== userId);
  
  if (filteredUsers.length === users.length) {
    return false; // ユーザーが見つからない
  }
  
  saveUsers(filteredUsers);
  return true;
}

// 既存API互換性のための同期関数エクスポート
// export { getUsersSync as getUsers }; // 重複回避のためコメントアウト
// export { findUserByEmailSync as findUserByEmail }; // 重複回避のためコメントアウト
// export { findUserByIdSync as findUserById }; // 重複回避のためコメントアウト
// export { createUserSync as createUser }; // 重複回避のためコメントアウト
// export { updateUserSync as updateUser }; // 重複回避のためコメントアウト

// エクスポートエイリアス
export const getAdminUsers = getUsersSync;
export const comparePassword = verifyPassword;
export const updateAdminUser = updateUserSync;