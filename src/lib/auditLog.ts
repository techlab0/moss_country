import { logAuditEventToDB, getAuditLogsFromDB, AuditLog as DBAuditLog } from './supabase';

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// 環境変数でデータベース使用を制御
const USE_DATABASE = process.env.USE_SUPABASE === 'true';

export type AuditAction = 
  // 認証関連
  | 'login.success'
  | 'login.failed'
  | 'logout'
  | '2fa.setup'
  | '2fa.verify.success'
  | '2fa.verify.failed'
  | 'password.changed'
  // ユーザー管理
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  // システム操作
  | 'admin.access'
  | 'settings.changed'
  // セキュリティ
  | 'security.breach_attempt'
  | 'security.suspicious_activity';

// メモリベースの監査ログストレージ
let auditLogs: AuditLog[] = [];

// DB用監査ログ型変換
function convertDBAuditLogToAuditLog(dbLog: DBAuditLog): AuditLog {
  return {
    id: dbLog.id,
    userId: dbLog.user_id,
    userEmail: dbLog.user_email,
    action: dbLog.action as AuditAction,
    resource: dbLog.category, // category を resource にマッピング
    resourceId: dbLog.resource_id || undefined,
    details: dbLog.details,
    ipAddress: dbLog.ip_address || undefined,
    userAgent: dbLog.user_agent || undefined,
    timestamp: new Date(dbLog.created_at),
    severity: dbLog.severity
  };
}

/**
 * 監査ログを記録（データベース優先、フォールバックでメモリベース）
 */
export async function logAuditEvent(
  userId: string,
  userEmail: string,
  action: AuditAction,
  resource: string,
  details: Record<string, any> = {},
  options: {
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    severity?: AuditLog['severity'];
  } = {}
): Promise<void> {
  const logData = {
    user_id: userId,
    user_email: userEmail,
    action,
    category: resource,
    details,
    resource_id: options.resourceId,
    ip_address: options.ipAddress,
    user_agent: options.userAgent,
    severity: options.severity || getSeverityForAction(action),
  };

  if (USE_DATABASE) {
    try {
      await logAuditEventToDB(logData);
      console.log('🔍 Audit Log (DB):', {
        action,
        user: userEmail,
        resource,
        severity: logData.severity,
        details,
      });
      return;
    } catch (error) {
      console.warn('データベース監査ログ記録に失敗、メモリベースにフォールバック:', error);
    }
  }

  // メモリベース（フォールバック）
  const log: AuditLog = {
    id: generateLogId(),
    userId,
    userEmail,
    action,
    resource,
    resourceId: options.resourceId,
    details,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    timestamp: new Date(),
    severity: logData.severity,
  };

  auditLogs.unshift(log);
  
  if (auditLogs.length > 1000) {
    auditLogs = auditLogs.slice(0, 1000);
  }

  console.log('🔍 Audit Log (Memory):', {
    action: log.action,
    user: log.userEmail,
    resource: log.resource,
    severity: log.severity,
    details: log.details,
  });
}

/**
 * 同期版監査ログ記録（既存コードとの互換性用）
 */
export function logAuditEventSync(
  userId: string,
  userEmail: string,
  action: AuditAction,
  resource: string,
  details: Record<string, any> = {},
  options: {
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    severity?: AuditLog['severity'];
  } = {}
): void {
  const log: AuditLog = {
    id: generateLogId(),
    userId,
    userEmail,
    action,
    resource,
    resourceId: options.resourceId,
    details,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    timestamp: new Date(),
    severity: options.severity || getSeverityForAction(action),
  };

  auditLogs.unshift(log);
  
  if (auditLogs.length > 1000) {
    auditLogs = auditLogs.slice(0, 1000);
  }

  console.log('🔍 Audit Log (Memory Sync):', {
    action: log.action,
    user: log.userEmail,
    resource: log.resource,
    severity: log.severity,
    details: log.details,
  });
}

/**
 * 監査ログを取得（データベース優先、フォールバックでメモリベース）
 */
export async function getAuditLogs(options: {
  limit?: number;
  offset?: number;
  userId?: string;
  action?: AuditAction;
  severity?: AuditLog['severity'];
  dateFrom?: Date;
  dateTo?: Date;
} = {}): Promise<AuditLog[]> {
  if (USE_DATABASE) {
    try {
      const dbLogs = await getAuditLogsFromDB(options.limit, options.offset);
      let filtered = dbLogs.map(convertDBAuditLogToAuditLog);

      // フィルタリング（データベースクエリでやらなかった分）
      if (options.userId) {
        filtered = filtered.filter(log => log.userId === options.userId);
      }
      if (options.action) {
        filtered = filtered.filter(log => log.action === options.action);
      }
      if (options.severity) {
        filtered = filtered.filter(log => log.severity === options.severity);
      }
      if (options.dateFrom) {
        filtered = filtered.filter(log => log.timestamp >= options.dateFrom!);
      }
      if (options.dateTo) {
        filtered = filtered.filter(log => log.timestamp <= options.dateTo!);
      }

      return filtered;
    } catch (error) {
      console.warn('データベース監査ログ取得に失敗、メモリベースにフォールバック:', error);
    }
  }

  // メモリベース（フォールバック）
  let filtered = auditLogs;

  if (options.userId) {
    filtered = filtered.filter(log => log.userId === options.userId);
  }
  if (options.action) {
    filtered = filtered.filter(log => log.action === options.action);
  }
  if (options.severity) {
    filtered = filtered.filter(log => log.severity === options.severity);
  }
  if (options.dateFrom) {
    filtered = filtered.filter(log => log.timestamp >= options.dateFrom!);
  }
  if (options.dateTo) {
    filtered = filtered.filter(log => log.timestamp <= options.dateTo!);
  }

  const offset = options.offset || 0;
  const limit = options.limit || 50;
  
  return filtered.slice(offset, offset + limit);
}

/**
 * 同期版監査ログ取得（既存コードとの互換性用）
 */
export function getAuditLogsSync(options: {
  limit?: number;
  offset?: number;
  userId?: string;
  action?: AuditAction;
  severity?: AuditLog['severity'];
  dateFrom?: Date;
  dateTo?: Date;
} = {}): AuditLog[] {
  let filtered = auditLogs;

  if (options.userId) {
    filtered = filtered.filter(log => log.userId === options.userId);
  }
  if (options.action) {
    filtered = filtered.filter(log => log.action === options.action);
  }
  if (options.severity) {
    filtered = filtered.filter(log => log.severity === options.severity);
  }
  if (options.dateFrom) {
    filtered = filtered.filter(log => log.timestamp >= options.dateFrom!);
  }
  if (options.dateTo) {
    filtered = filtered.filter(log => log.timestamp <= options.dateTo!);
  }

  const offset = options.offset || 0;
  const limit = options.limit || 50;
  
  return filtered.slice(offset, offset + limit);
}

/**
 * 監査ログの統計を取得（データベース優先、フォールバックでメモリベース）
 */
export async function getAuditLogStats(): Promise<{
  total: number;
  today: number;
  thisWeek: number;
  bySeverity: Record<AuditLog['severity'], number>;
  byAction: Record<string, number>;
}> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let logs: AuditLog[] = [];

  if (USE_DATABASE) {
    try {
      const dbLogs = await getAuditLogsFromDB(1000, 0); // 統計用に多めに取得
      logs = dbLogs.map(convertDBAuditLogToAuditLog);
    } catch (error) {
      console.warn('データベース監査ログ統計取得に失敗、メモリベースにフォールバック:', error);
      logs = auditLogs;
    }
  } else {
    logs = auditLogs;
  }

  const todayLogs = logs.filter(log => log.timestamp >= today);
  const thisWeekLogs = logs.filter(log => log.timestamp >= thisWeek);

  const bySeverity: Record<AuditLog['severity'], number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  const byAction: Record<string, number> = {};

  logs.forEach(log => {
    bySeverity[log.severity]++;
    byAction[log.action] = (byAction[log.action] || 0) + 1;
  });

  return {
    total: logs.length,
    today: todayLogs.length,
    thisWeek: thisWeekLogs.length,
    bySeverity,
    byAction,
  };
}

/**
 * 同期版監査ログ統計取得（既存コードとの互換性用）
 */
export function getAuditLogStatsSync(): {
  total: number;
  today: number;
  thisWeek: number;
  bySeverity: Record<AuditLog['severity'], number>;
  byAction: Record<string, number>;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const todayLogs = auditLogs.filter(log => log.timestamp >= today);
  const thisWeekLogs = auditLogs.filter(log => log.timestamp >= thisWeek);

  const bySeverity: Record<AuditLog['severity'], number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  const byAction: Record<string, number> = {};

  auditLogs.forEach(log => {
    bySeverity[log.severity]++;
    byAction[log.action] = (byAction[log.action] || 0) + 1;
  });

  return {
    total: auditLogs.length,
    today: todayLogs.length,
    thisWeek: thisWeekLogs.length,
    bySeverity,
    byAction,
  };
}

/**
 * セキュリティアラートを検出（データベース優先、フォールバックでメモリベース）
 */
export async function detectSecurityAlerts(): Promise<{
  alerts: Array<{
    type: 'failed_logins' | 'suspicious_activity' | 'privilege_escalation';
    severity: 'medium' | 'high' | 'critical';
    message: string;
    count: number;
    users: string[];
  }>;
}> {
  const alerts = [];
  const now = new Date();
  const oneHour = new Date(now.getTime() - 60 * 60 * 1000);

  let logs: AuditLog[] = [];

  if (USE_DATABASE) {
    try {
      const dbLogs = await getAuditLogsFromDB(500, 0); // 最近のログを取得
      logs = dbLogs.map(convertDBAuditLogToAuditLog);
    } catch (error) {
      console.warn('データベースセキュリティアラート検出に失敗、メモリベースにフォールバック:', error);
      logs = auditLogs;
    }
  } else {
    logs = auditLogs;
  }

  // 過去1時間のログを分析
  const recentLogs = logs.filter(log => log.timestamp >= oneHour);

  // 連続ログイン失敗を検出
  const failedLogins = recentLogs.filter(log => log.action === 'login.failed');
  const failedLoginsByUser: Record<string, number> = {};
  
  failedLogins.forEach(log => {
    failedLoginsByUser[log.userEmail] = (failedLoginsByUser[log.userEmail] || 0) + 1;
  });

  Object.entries(failedLoginsByUser).forEach(([email, count]) => {
    if (count >= 5) {
      alerts.push({
        type: 'failed_logins',
        severity: count >= 10 ? 'critical' : 'high',
        message: `${email} で ${count} 回連続してログインに失敗しました`,
        count,
        users: [email],
      });
    }
  });

  // 深夜の管理画面アクセスを検出
  const nightAccess = recentLogs.filter(log => {
    const hour = log.timestamp.getHours();
    return log.action === 'admin.access' && (hour < 6 || hour > 22);
  });

  if (nightAccess.length > 0) {
    const users = [...new Set(nightAccess.map(log => log.userEmail))];
    alerts.push({
      type: 'suspicious_activity',
      severity: 'medium',
      message: `深夜時間帯に管理画面へのアクセスがありました`,
      count: nightAccess.length,
      users,
    });
  }

  return { alerts };
}

/**
 * 同期版セキュリティアラート検出（既存コードとの互換性用）
 */
export function detectSecurityAlertsSync(): {
  alerts: Array<{
    type: 'failed_logins' | 'suspicious_activity' | 'privilege_escalation';
    severity: 'medium' | 'high' | 'critical';
    message: string;
    count: number;
    users: string[];
  }>;
} {
  const alerts = [];
  const now = new Date();
  const oneHour = new Date(now.getTime() - 60 * 60 * 1000);

  const recentLogs = auditLogs.filter(log => log.timestamp >= oneHour);

  const failedLogins = recentLogs.filter(log => log.action === 'login.failed');
  const failedLoginsByUser: Record<string, number> = {};
  
  failedLogins.forEach(log => {
    failedLoginsByUser[log.userEmail] = (failedLoginsByUser[log.userEmail] || 0) + 1;
  });

  Object.entries(failedLoginsByUser).forEach(([email, count]) => {
    if (count >= 5) {
      alerts.push({
        type: 'failed_logins',
        severity: count >= 10 ? 'critical' : 'high',
        message: `${email} で ${count} 回連続してログインに失敗しました`,
        count,
        users: [email],
      });
    }
  });

  const nightAccess = recentLogs.filter(log => {
    const hour = log.timestamp.getHours();
    return log.action === 'admin.access' && (hour < 6 || hour > 22);
  });

  if (nightAccess.length > 0) {
    const users = [...new Set(nightAccess.map(log => log.userEmail))];
    alerts.push({
      type: 'suspicious_activity',
      severity: 'medium',
      message: `深夜時間帯に管理画面へのアクセスがありました`,
      count: nightAccess.length,
      users,
    });
  }

  return { alerts };
}

/**
 * ログIDを生成
 */
function generateLogId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * アクションの重要度を判定
 */
function getSeverityForAction(action: AuditAction): AuditLog['severity'] {
  const severityMap: Record<AuditAction, AuditLog['severity']> = {
    // 低重要度
    'login.success': 'low',
    'logout': 'low',
    'admin.access': 'low',
    '2fa.verify.success': 'low',
    
    // 中重要度
    'user.updated': 'medium',
    'settings.changed': 'medium',
    '2fa.setup': 'medium',
    
    // 高重要度
    'login.failed': 'high',
    'user.created': 'high',
    'user.deleted': 'high',
    'password.changed': 'high',
    '2fa.verify.failed': 'high',
    
    // 緊急度
    'security.breach_attempt': 'critical',
    'security.suspicious_activity': 'critical',
  };

  return severityMap[action] || 'medium';
}