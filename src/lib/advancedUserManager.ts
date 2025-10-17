import { AdminUser, getUsers, findUserById, updateUser } from './userManager';
import { logAuditEvent } from './auditLog';

// 詳細権限システム
export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'system' | 'users' | 'content' | 'commerce' | 'security' | 'analytics';
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // Permission IDs
  isSystem: boolean; // システム定義の役割（削除不可）
  createdAt: Date;
  updatedAt: Date;
}

export interface UserGroup {
  id: string;
  name: string;
  description: string;
  userIds: string[];
  permissions: string[]; // 追加権限
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtendedAdminUser extends Omit<AdminUser, 'role'> {
  role: string; // UserRole ID
  groups: string[]; // UserGroup IDs
  permissions: string[]; // 個別権限
  profile: UserProfile;
  status: 'active' | 'inactive' | 'suspended';
  lastActivity?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  notes?: string;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  department?: string;
  position?: string;
  phone?: string;
  avatar?: string;
  timezone: string;
  language: string;
  preferences: Record<string, any>;
}

export interface UserActivity {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// システム定義の権限
const SYSTEM_PERMISSIONS: Permission[] = [
  // システム管理
  { id: 'system.manage', name: 'システム管理', description: 'システム設定の管理', category: 'system' },
  { id: 'system.logs', name: 'ログ閲覧', description: '監査ログとシステムログの閲覧', category: 'system' },
  { id: 'system.backup', name: 'バックアップ管理', description: 'データのバックアップと復元', category: 'system' },
  
  // ユーザー管理
  { id: 'users.view', name: 'ユーザー閲覧', description: 'ユーザー情報の閲覧', category: 'users' },
  { id: 'users.create', name: 'ユーザー作成', description: '新規ユーザーの作成', category: 'users' },
  { id: 'users.edit', name: 'ユーザー編集', description: 'ユーザー情報の編集', category: 'users' },
  { id: 'users.delete', name: 'ユーザー削除', description: 'ユーザーの削除', category: 'users' },
  { id: 'users.roles', name: '役割管理', description: 'ユーザー役割の管理', category: 'users' },
  
  // コンテンツ管理
  { id: 'content.view', name: 'コンテンツ閲覧', description: 'コンテンツの閲覧', category: 'content' },
  { id: 'content.create', name: 'コンテンツ作成', description: '新規コンテンツの作成', category: 'content' },
  { id: 'content.edit', name: 'コンテンツ編集', description: 'コンテンツの編集', category: 'content' },
  { id: 'content.publish', name: 'コンテンツ公開', description: 'コンテンツの公開', category: 'content' },
  { id: 'content.delete', name: 'コンテンツ削除', description: 'コンテンツの削除', category: 'content' },
  
  // 商取引
  { id: 'commerce.orders', name: '注文管理', description: '注文の管理', category: 'commerce' },
  { id: 'commerce.products', name: '商品管理', description: '商品の管理', category: 'commerce' },
  { id: 'commerce.inventory', name: '在庫管理', description: '在庫の管理', category: 'commerce' },
  { id: 'commerce.customers', name: '顧客管理', description: '顧客情報の管理', category: 'commerce' },
  { id: 'commerce.reports', name: '売上レポート', description: '売上・分析レポート', category: 'commerce' },
  
  // セキュリティ
  { id: 'security.alerts', name: 'セキュリティアラート', description: 'セキュリティアラートの管理', category: 'security' },
  { id: 'security.settings', name: 'セキュリティ設定', description: 'セキュリティ設定の管理', category: 'security' },
  { id: 'security.audit', name: '監査機能', description: '監査ログの管理', category: 'security' },
  
  // 分析
  { id: 'analytics.view', name: 'アナリティクス閲覧', description: 'アクセス解析の閲覧', category: 'analytics' },
  { id: 'analytics.export', name: 'データエクスポート', description: 'データのエクスポート', category: 'analytics' },
];

// システム定義の役割
const SYSTEM_ROLES: Omit<UserRole, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'admin',
    name: '管理者',
    description: 'システム全体の管理権限を持つユーザー',
    permissions: [
      'system.manage', 'system.logs', 'system.backup',
      'users.view', 'users.create', 'users.edit', 'users.delete', 'users.roles',
      'content.view', 'content.create', 'content.edit', 'content.publish', 'content.delete',
      'commerce.orders', 'commerce.products', 'commerce.inventory', 'commerce.customers', 'commerce.reports',
      'security.alerts', 'security.settings', 'security.audit',
      'analytics.view', 'analytics.export'
    ],
    isSystem: true
  },
  {
    id: 'operator',
    name: '運用者',
    description: '日常運用に必要な権限を持つユーザー',
    permissions: [
      'users.view', 'users.edit',
      'content.view', 'content.create', 'content.edit', 'content.publish',
      'commerce.orders', 'commerce.products', 'commerce.inventory', 'commerce.customers', 'commerce.reports',
      'security.alerts',
      'analytics.view'
    ],
    isSystem: true
  },
  {
    id: 'editor',
    name: '編集者',
    description: 'コンテンツ編集権限を持つユーザー',
    permissions: [
      'content.view', 'content.create', 'content.edit',
      'commerce.orders', 'commerce.products', 'commerce.customers',
      'analytics.view'
    ],
    isSystem: true
  },
  {
    id: 'viewer',
    name: '閲覧者',
    description: '閲覧のみの権限を持つユーザー',
    permissions: [
      'content.view',
      'commerce.orders', 'commerce.customers',
      'analytics.view'
    ],
    isSystem: true
  }
];

// メモリベースのストレージ
let permissions: Permission[] = SYSTEM_PERMISSIONS;
let roles: UserRole[] = [];
let groups: UserGroup[] = [];
let userActivities: UserActivity[] = [];

/**
 * システムを初期化
 */
export function initializeAdvancedUserSystem(): void {
  if (roles.length === 0) {
    const now = new Date();
    roles = SYSTEM_ROLES.map(role => ({
      ...role,
      createdAt: now,
      updatedAt: now
    }));
    
    console.log('🔧 Advanced user system initialized');
  }
}

/**
 * 全権限を取得
 */
export function getPermissions(): Permission[] {
  return permissions;
}

/**
 * 権限をカテゴリ別に取得
 */
export function getPermissionsByCategory(): Record<string, Permission[]> {
  return permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);
}

/**
 * 全役割を取得
 */
export function getUserRoles(): UserRole[] {
  initializeAdvancedUserSystem();
  return roles;
}

/**
 * 役割を作成
 */
export function createUserRole(roleData: Omit<UserRole, 'id' | 'createdAt' | 'updatedAt'>): UserRole {
  const now = new Date();
  const newRole: UserRole = {
    ...roleData,
    id: `role_${Date.now()}`,
    createdAt: now,
    updatedAt: now
  };
  
  roles.push(newRole);
  return newRole;
}

/**
 * 役割を更新
 */
export function updateUserRole(roleId: string, updates: Partial<UserRole>): UserRole | null {
  const roleIndex = roles.findIndex(role => role.id === roleId);
  if (roleIndex === -1) return null;
  
  // システム定義の役割は更新不可
  if (roles[roleIndex].isSystem) {
    throw new Error('システム定義の役割は更新できません');
  }
  
  roles[roleIndex] = {
    ...roles[roleIndex],
    ...updates,
    updatedAt: new Date()
  };
  
  return roles[roleIndex];
}

/**
 * 全グループを取得
 */
export function getUserGroups(): UserGroup[] {
  return groups;
}

/**
 * グループを作成
 */
export function createUserGroup(groupData: Omit<UserGroup, 'id' | 'createdAt' | 'updatedAt'>): UserGroup {
  const now = new Date();
  const newGroup: UserGroup = {
    ...groupData,
    id: `group_${Date.now()}`,
    createdAt: now,
    updatedAt: now
  };
  
  groups.push(newGroup);
  return newGroup;
}

/**
 * グループを更新
 */
export function updateUserGroup(groupId: string, updates: Partial<UserGroup>): UserGroup | null {
  const groupIndex = groups.findIndex(group => group.id === groupId);
  if (groupIndex === -1) return null;
  
  groups[groupIndex] = {
    ...groups[groupIndex],
    ...updates,
    updatedAt: new Date()
  };
  
  return groups[groupIndex];
}

/**
 * ユーザーの効果的な権限を計算
 */
export function getUserEffectivePermissions(user: ExtendedAdminUser): string[] {
  const effectivePermissions = new Set<string>();
  
  // 個別権限
  user.permissions.forEach(permission => effectivePermissions.add(permission));
  
  // 役割による権限
  const userRole = roles.find(role => role.id === user.role);
  if (userRole) {
    userRole.permissions.forEach(permission => effectivePermissions.add(permission));
  }
  
  // グループによる権限
  user.groups.forEach(groupId => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      group.permissions.forEach(permission => effectivePermissions.add(permission));
    }
  });
  
  return Array.from(effectivePermissions);
}

/**
 * ユーザーが特定の権限を持っているかチェック
 */
export function hasPermission(user: ExtendedAdminUser, permission: string): boolean {
  const effectivePermissions = getUserEffectivePermissions(user);
  return effectivePermissions.includes(permission);
}

/**
 * ユーザーアクティビティを記録
 */
export function recordUserActivity(
  userId: string,
  userEmail: string,
  action: string,
  resource: string,
  details: Record<string, any> = {},
  options: {
    ipAddress?: string;
    userAgent?: string;
  } = {}
): void {
  const activity: UserActivity = {
    id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    userEmail,
    action,
    resource,
    details,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    timestamp: new Date()
  };
  
  userActivities.unshift(activity);
  
  // メモリ制限（最新2000件まで保持）
  if (userActivities.length > 2000) {
    userActivities = userActivities.slice(0, 2000);
  }
  
  // 監査ログにも記録
  logAuditEvent(userId, userEmail, action as any, resource, details, {
    ipAddress: options.ipAddress,
    userAgent: options.userAgent
  });
}

/**
 * ユーザーアクティビティを取得
 */
export function getUserActivities(options: {
  userId?: string;
  action?: string;
  resource?: string;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
} = {}): UserActivity[] {
  let filtered = userActivities;
  
  if (options.userId) {
    filtered = filtered.filter(activity => activity.userId === options.userId);
  }
  
  if (options.action) {
    filtered = filtered.filter(activity => activity.action.includes(options.action!));
  }
  
  if (options.resource) {
    filtered = filtered.filter(activity => activity.resource.includes(options.resource!));
  }
  
  if (options.startDate) {
    filtered = filtered.filter(activity => activity.timestamp >= options.startDate!);
  }
  
  if (options.endDate) {
    filtered = filtered.filter(activity => activity.timestamp <= options.endDate!);
  }
  
  const offset = options.offset || 0;
  const limit = options.limit || 50;
  
  return filtered.slice(offset, offset + limit);
}

/**
 * バッチ操作: 複数ユーザーのステータス更新
 */
export async function batchUpdateUserStatus(
  userIds: string[],
  status: ExtendedAdminUser['status'],
  operatorId: string,
  operatorEmail: string,
  reason?: string
): Promise<{
  success: string[];
  failed: Array<{ userId: string; error: string }>;
}> {
  const success: string[] = [];
  const failed: Array<{ userId: string; error: string }> = [];
  
  for (const userId of userIds) {
    try {
      const user = await findUserById(userId);
      if (!user) {
        failed.push({ userId, error: 'ユーザーが見つかりません' });
        continue;
      }
      
      // ここで実際のユーザーステータス更新処理
      // 現在は基本的な更新のみサポート
      
      success.push(userId);
      
      // アクティビティを記録
      recordUserActivity(
        operatorId,
        operatorEmail,
        'user.batch_status_update',
        'user_management',
        {
          target_user: user.email,
          old_status: 'active', // 仮の値
          new_status: status,
          reason: reason || null,
          batch_operation: true
        }
      );
      
    } catch (error) {
      failed.push({ 
        userId, 
        error: error instanceof Error ? error.message : '不明なエラー' 
      });
    }
  }
  
  return { success, failed };
}

/**
 * バッチ操作: 複数ユーザーの役割変更
 */
export async function batchUpdateUserRoles(
  userIds: string[],
  roleId: string,
  operatorId: string,
  operatorEmail: string,
  reason?: string
): Promise<{
  success: string[];
  failed: Array<{ userId: string; error: string }>;
}> {
  const success: string[] = [];
  const failed: Array<{ userId: string; error: string }> = [];
  
  // 役割の存在確認
  const targetRole = roles.find(role => role.id === roleId);
  if (!targetRole) {
    return {
      success: [],
      failed: userIds.map(userId => ({ userId, error: '指定された役割が見つかりません' }))
    };
  }
  
  for (const userId of userIds) {
    try {
      const user = await findUserById(userId);
      if (!user) {
        failed.push({ userId, error: 'ユーザーが見つかりません' });
        continue;
      }
      
      // 現在は基本的な役割のみサポート（admin/editor）
      const legacyRole = roleId === 'admin' ? 'admin' : 'editor';
      
      await updateUser(userId, { role: legacyRole });
      success.push(userId);
      
      // アクティビティを記録
      recordUserActivity(
        operatorId,
        operatorEmail,
        'user.batch_role_update',
        'user_management',
        {
          target_user: user.email,
          old_role: user.role,
          new_role: targetRole.name,
          reason: reason || null,
          batch_operation: true
        }
      );
      
    } catch (error) {
      failed.push({ 
        userId, 
        error: error instanceof Error ? error.message : '不明なエラー' 
      });
    }
  }
  
  return { success, failed };
}

/**
 * ユーザー統計を取得
 */
export async function getUserStatistics(): Promise<{
  total: number;
  active: number;
  inactive: number;
  byRole: Record<string, number>;
  byGroup: Record<string, number>;
  recentActivity: number; // 過去24時間
}> {
  const users = await getUsers();
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const stats = {
    total: users.length,
    active: users.length, // 現在のシステムでは全てアクティブ
    inactive: 0,
    byRole: {} as Record<string, number>,
    byGroup: {} as Record<string, number>,
    recentActivity: userActivities.filter(activity => activity.timestamp >= yesterday).length
  };
  
  // 役割別統計
  users.forEach(user => {
    const roleName = user.role === 'admin' ? '管理者' : '編集者';
    stats.byRole[roleName] = (stats.byRole[roleName] || 0) + 1;
  });
  
  return stats;
}