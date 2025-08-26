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

/**
 * 監査ログを記録
 */
export function logAuditEvent(
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

  auditLogs.unshift(log); // 新しいログを先頭に追加
  
  // メモリ上限を1000件に制限
  if (auditLogs.length > 1000) {
    auditLogs = auditLogs.slice(0, 1000);
  }

  console.log('🔍 Audit Log:', {
    action: log.action,
    user: log.userEmail,
    resource: log.resource,
    severity: log.severity,
    details: log.details,
  });
}

/**
 * 監査ログを取得
 */
export function getAuditLogs(options: {
  limit?: number;
  offset?: number;
  userId?: string;
  action?: AuditAction;
  severity?: AuditLog['severity'];
  dateFrom?: Date;
  dateTo?: Date;
} = {}): AuditLog[] {
  let filtered = auditLogs;

  // フィルタリング
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

  // ページネーション
  const offset = options.offset || 0;
  const limit = options.limit || 50;
  
  return filtered.slice(offset, offset + limit);
}

/**
 * 監査ログの統計を取得
 */
export function getAuditLogStats(): {
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

  // 重要度別統計
  const bySeverity: Record<AuditLog['severity'], number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  // アクション別統計
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
 * セキュリティアラートを検出
 */
export function detectSecurityAlerts(): {
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

  // 過去1時間のログを分析
  const recentLogs = auditLogs.filter(log => log.timestamp >= oneHour);

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