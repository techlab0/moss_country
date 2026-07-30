// Supabase関数を動的インポート用
async function getSupabaseAuditFunctions() {
  const USE_DATABASE = process.env.USE_SUPABASE === 'true';
  if (!USE_DATABASE) {
    console.log('USE_SUPABASE is false, skipping Supabase import');
    return null;
  }
  try {
    const supabaseModule = await import('./supabase');
    return {
      logAuditEventToDB: supabaseModule.logAuditEventToDB,
      getAuditLogsFromDB: supabaseModule.getAuditLogsFromDB
    };
  } catch (error) {
    console.warn('Supabase監査ログモジュールの読み込みに失敗:', error);
    return null;
  }
}

/**
 * 監査ログの保存先を調べる。
 *
 * USE_SUPABASE が 'true' でない場合、ログはこのモジュール内の配列にしか残らない。
 * Vercelのサーバーレスではリクエストごとにメモリが破棄されるため、
 * 記録しているつもりでも監査ログ画面には何も出てこない。
 * どちらに書かれているかを画面から確認できるようにするために使う。
 */
export async function getAuditLogStorage(): Promise<{
  mode: 'database' | 'memory';
  reason?: string;
}> {
  if (process.env.USE_SUPABASE !== 'true') {
    return {
      mode: 'memory',
      reason: 'USE_SUPABASE が true ではないため、監査ログはメモリにのみ記録されます。サーバーレス環境では保存されません。',
    };
  }

  const supabaseFunctions = await getSupabaseAuditFunctions();
  if (!supabaseFunctions) {
    return {
      mode: 'memory',
      reason: 'Supabaseモジュールの読み込みに失敗したため、メモリに記録されています。',
    };
  }

  // モジュールが読めただけでは不十分。テーブルが無い・権限が足りない場合も
  // 書き込みは警告を出してメモリに退避するだけなので、実際に読めるかを確かめる。
  try {
    await supabaseFunctions.getAuditLogsFromDB(1, 0);
    return { mode: 'database' };
  } catch (error) {
    return {
      mode: 'memory',
      reason: `audit_logs テーブルを読めませんでした（${
        error instanceof Error ? error.message : String(error)
      }）。テーブルが作成済みか確認してください。`,
    };
  }
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// 環境変数でデータベース使用を制御
const USE_DATABASE = process.env.USE_SUPABASE === 'true';

// 配列を正として型を導出する。こうしておくと、外部入力（クエリパラメータなど）が
// 正しいアクション名かを実行時に検証できる。
export const AUDIT_ACTIONS = [
  // 認証関連
  'login.success',
  'login.failed',
  'logout',
  '2fa.setup',
  '2fa.verify.success',
  '2fa.verify.failed',
  'password.changed',
  // ユーザー管理
  'user.created',
  'user.updated',
  'user.deleted',
  // システム操作
  'admin.access',
  'settings.changed',
  // お問い合わせ対応
  'contact.list_viewed',
  'contact.viewed',
  'contact.updated',
  'contact.replied',
  // セキュリティ
  'security.breach_attempt',
  'security.suspicious_activity',
  'security.settings_update',
  'security.report_generated',
  // データベース運用
  'database.maintenance',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

/** 外部入力が許可された値かを確かめる。違えば undefined を返して「指定なし」として扱う。 */
export function parseAuditEnum<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[]
): T | undefined {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

// メモリベースの監査ログストレージ
let auditLogs: AuditLog[] = [];

// DB用監査ログ型定義（動的インポート用）
interface DBAuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  category: string;
  details: Record<string, unknown>;
  resource_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: Date;
}

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
  details: Record<string, unknown> = {},
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
    const supabaseFunctions = await getSupabaseAuditFunctions();
    if (supabaseFunctions) {
      try {
        await supabaseFunctions.logAuditEventToDB(logData);
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
  details: Record<string, unknown> = {},
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
  userEmail?: string;
  action?: AuditAction;
  severity?: AuditLog['severity'];
  startDate?: string;
  endDate?: string;
  dateFrom?: Date;
  dateTo?: Date;
  ipAddress?: string;
  resource?: string;
  searchText?: string;
  sortBy?: 'timestamp' | 'action' | 'severity' | 'userEmail';
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<AuditLog[]> {
  // 日付文字列をDateオブジェクトに変換
  const dateFrom = options.startDate ? new Date(options.startDate) : options.dateFrom;
  const dateTo = options.endDate ? new Date(options.endDate) : options.dateTo;

  if (USE_DATABASE) {
    const supabaseFunctions = await getSupabaseAuditFunctions();
    if (supabaseFunctions) {
      try {
        const dbLogs = await supabaseFunctions.getAuditLogsFromDB(options.limit, options.offset);
        let filtered = dbLogs.map(convertDBAuditLogToAuditLog);

      // フィルタリング（データベースクエリでやらなかった分）
      if (options.userId) {
        filtered = filtered.filter(log => log.userId === options.userId);
      }
      if (options.userEmail) {
        filtered = filtered.filter(log => log.userEmail.toLowerCase().includes(options.userEmail!.toLowerCase()));
      }
      if (options.action) {
        filtered = filtered.filter(log => log.action === options.action);
      }
      if (options.severity) {
        filtered = filtered.filter(log => log.severity === options.severity);
      }
      if (dateFrom) {
        filtered = filtered.filter(log => log.timestamp >= dateFrom!);
      }
      if (dateTo) {
        filtered = filtered.filter(log => log.timestamp <= dateTo!);
      }
      if (options.ipAddress) {
        filtered = filtered.filter(log => log.ipAddress && log.ipAddress.includes(options.ipAddress!));
      }
      if (options.resource) {
        filtered = filtered.filter(log => log.resource.toLowerCase().includes(options.resource!.toLowerCase()));
      }
      if (options.searchText) {
        const searchLower = options.searchText.toLowerCase();
        filtered = filtered.filter(log => 
          log.userEmail.toLowerCase().includes(searchLower) ||
          log.action.toLowerCase().includes(searchLower) ||
          log.resource.toLowerCase().includes(searchLower) ||
          JSON.stringify(log.details).toLowerCase().includes(searchLower)
        );
      }

      // ソート
      const sortBy = options.sortBy || 'timestamp';
      const sortOrder = options.sortOrder || 'desc';
      filtered.sort((a, b) => {
        let aVal, bVal;
        switch (sortBy) {
          case 'timestamp':
            aVal = a.timestamp.getTime();
            bVal = b.timestamp.getTime();
            break;
          case 'action':
            aVal = a.action;
            bVal = b.action;
            break;
          case 'severity':
            const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
            aVal = severityOrder[a.severity];
            bVal = severityOrder[b.severity];
            break;
          case 'userEmail':
            aVal = a.userEmail;
            bVal = b.userEmail;
            break;
          default:
            aVal = a.timestamp.getTime();
            bVal = b.timestamp.getTime();
        }

        if (sortOrder === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });

        return filtered;
      } catch (error) {
        console.warn('データベース監査ログ取得に失敗、メモリベースにフォールバック:', error);
      }
    }
  }

  // メモリベース（フォールバック）
  let filtered = auditLogs;

  if (options.userId) {
    filtered = filtered.filter(log => log.userId === options.userId);
  }
  if (options.userEmail) {
    filtered = filtered.filter(log => log.userEmail.toLowerCase().includes(options.userEmail!.toLowerCase()));
  }
  if (options.action) {
    filtered = filtered.filter(log => log.action === options.action);
  }
  if (options.severity) {
    filtered = filtered.filter(log => log.severity === options.severity);
  }
  if (dateFrom) {
    filtered = filtered.filter(log => log.timestamp >= dateFrom!);
  }
  if (dateTo) {
    filtered = filtered.filter(log => log.timestamp <= dateTo!);
  }
  if (options.ipAddress) {
    filtered = filtered.filter(log => log.ipAddress && log.ipAddress.includes(options.ipAddress!));
  }
  if (options.resource) {
    filtered = filtered.filter(log => log.resource.toLowerCase().includes(options.resource!.toLowerCase()));
  }
  if (options.searchText) {
    const searchLower = options.searchText.toLowerCase();
    filtered = filtered.filter(log => 
      log.userEmail.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.resource.toLowerCase().includes(searchLower) ||
      JSON.stringify(log.details).toLowerCase().includes(searchLower)
    );
  }

  // ソート
  const sortBy = options.sortBy || 'timestamp';
  const sortOrder = options.sortOrder || 'desc';
  filtered.sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case 'timestamp':
        aVal = a.timestamp.getTime();
        bVal = b.timestamp.getTime();
        break;
      case 'action':
        aVal = a.action;
        bVal = b.action;
        break;
      case 'severity':
        const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
        aVal = severityOrder[a.severity];
        bVal = severityOrder[b.severity];
        break;
      case 'userEmail':
        aVal = a.userEmail;
        bVal = b.userEmail;
        break;
      default:
        aVal = a.timestamp.getTime();
        bVal = b.timestamp.getTime();
    }

    if (sortOrder === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });

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
    const supabaseFunctions = await getSupabaseAuditFunctions();
    if (supabaseFunctions) {
      try {
        const dbLogs = await supabaseFunctions.getAuditLogsFromDB(1000, 0); // 統計用に多めに取得
        logs = dbLogs.map(convertDBAuditLogToAuditLog);
      } catch (error) {
        console.warn('データベース監査ログ統計取得に失敗、メモリベースにフォールバック:', error);
        logs = auditLogs;
      }
    } else {
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

/** 監査ログから検出するセキュリティアラート */
interface DetectedSecurityAlert {
  type: 'failed_logins' | 'suspicious_activity' | 'privilege_escalation';
  severity: 'medium' | 'high' | 'critical';
  message: string;
  count: number;
  users: string[];
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
  const alerts: DetectedSecurityAlert[] = [];
  const now = new Date();
  const oneHour = new Date(now.getTime() - 60 * 60 * 1000);

  let logs: AuditLog[] = [];

  if (USE_DATABASE) {
    const supabaseFunctions = await getSupabaseAuditFunctions();
    if (supabaseFunctions) {
      try {
        const dbLogs = await supabaseFunctions.getAuditLogsFromDB(500, 0); // 最近のログを取得
        logs = dbLogs.map(convertDBAuditLogToAuditLog);
      } catch (error) {
        console.warn('データベースセキュリティアラート検出に失敗、メモリベースにフォールバック:', error);
        logs = auditLogs;
      }
    } else {
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
  const alerts: DetectedSecurityAlert[] = [];
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
    'contact.list_viewed': 'low',
    'contact.viewed': 'low',
    
    // 中重要度
    'user.updated': 'medium',
    'settings.changed': 'medium',
    '2fa.setup': 'medium',
    'contact.updated': 'medium',
    'security.settings_update': 'medium',
    'security.report_generated': 'medium',
    'database.maintenance': 'medium',
    // お客様宛にメールが飛ぶ操作なので、閲覧系より上に置く
    'contact.replied': 'medium',
    
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