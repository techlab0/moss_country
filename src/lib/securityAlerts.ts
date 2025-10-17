import { getAuditLogs, AuditLog } from './auditLog';

// セキュリティアラート設定
export interface SecurityAlertRule {
  id: string;
  name: string;
  type: 'failed_logins' | 'suspicious_activity' | 'privilege_escalation' | 'unusual_access' | 'brute_force';
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timeWindow: number; // 分単位
  threshold: number;
  conditions: {
    actions?: string[];
    ipPatterns?: string[];
    timeRanges?: Array<{ start: string; end: string }>; // HH:MM format
    userRoles?: string[];
  };
  notifications: {
    email: boolean;
    dashboard: boolean;
    webhook?: string;
  };
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

// セキュリティアラート
export interface SecurityAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  type: SecurityAlertRule['type'];
  severity: SecurityAlertRule['severity'];
  message: string;
  details: Record<string, any>;
  affectedUsers: string[];
  affectedIPs: string[];
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  status: 'active' | 'acknowledged' | 'resolved' | 'false_positive';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  notes?: string;
  createdAt: Date;
}

// デフォルトのセキュリティルール
const DEFAULT_SECURITY_RULES: Omit<SecurityAlertRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'ログイン連続失敗検出',
    type: 'failed_logins',
    enabled: true,
    severity: 'high',
    timeWindow: 60, // 1時間
    threshold: 5,
    conditions: {
      actions: ['login.failed']
    },
    notifications: {
      email: true,
      dashboard: true
    },
    description: '同一ユーザーによる連続ログイン失敗を検出'
  },
  {
    name: 'ブルートフォース攻撃検出',
    type: 'brute_force',
    enabled: true,
    severity: 'critical',
    timeWindow: 30, // 30分
    threshold: 10,
    conditions: {
      actions: ['login.failed']
    },
    notifications: {
      email: true,
      dashboard: true
    },
    description: '短時間での大量ログイン失敗（ブルートフォース攻撃の可能性）'
  },
  {
    name: '深夜アクセス検出',
    type: 'suspicious_activity',
    enabled: true,
    severity: 'medium',
    timeWindow: 1440, // 24時間
    threshold: 1,
    conditions: {
      actions: ['admin.access', 'login.success'],
      timeRanges: [
        { start: '22:00', end: '23:59' },
        { start: '00:00', end: '06:00' }
      ]
    },
    notifications: {
      email: false,
      dashboard: true
    },
    description: '深夜時間帯での管理画面アクセス'
  },
  {
    name: '権限昇格検出',
    type: 'privilege_escalation',
    enabled: true,
    severity: 'high',
    timeWindow: 60, // 1時間
    threshold: 2,
    conditions: {
      actions: ['user.updated', 'user.created']
    },
    notifications: {
      email: true,
      dashboard: true
    },
    description: 'ユーザー権限の変更・新規作成の頻発'
  },
  {
    name: '異常なアクセスパターン',
    type: 'unusual_access',
    enabled: true,
    severity: 'medium',
    timeWindow: 15, // 15分
    threshold: 20,
    conditions: {
      actions: ['admin.access', 'user.created', 'user.updated', 'user.deleted']
    },
    notifications: {
      email: false,
      dashboard: true
    },
    description: '短時間での異常に多い管理操作'
  }
];

// メモリベースのアラートストレージ
let securityRules: SecurityAlertRule[] = [];
let securityAlerts: SecurityAlert[] = [];

/**
 * セキュリティルールを初期化
 */
export function initializeSecurityRules(): void {
  if (securityRules.length === 0) {
    const now = new Date();
    securityRules = DEFAULT_SECURITY_RULES.map((rule, index) => ({
      ...rule,
      id: `rule_${index + 1}`,
      createdAt: now,
      updatedAt: now
    }));
    
    console.log('🔒 Security rules initialized:', securityRules.length);
  }
}

/**
 * 全セキュリティルールを取得
 */
export function getSecurityRules(): SecurityAlertRule[] {
  initializeSecurityRules();
  return securityRules;
}

/**
 * セキュリティルールを更新
 */
export function updateSecurityRule(ruleId: string, updates: Partial<SecurityAlertRule>): SecurityAlertRule | null {
  const ruleIndex = securityRules.findIndex(rule => rule.id === ruleId);
  if (ruleIndex === -1) return null;
  
  securityRules[ruleIndex] = {
    ...securityRules[ruleIndex],
    ...updates,
    updatedAt: new Date()
  };
  
  return securityRules[ruleIndex];
}

/**
 * 時刻が指定された時間範囲内かチェック
 */
function isTimeInRange(date: Date, timeRanges: Array<{ start: string; end: string }>): boolean {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  
  return timeRanges.some(range => {
    if (range.start <= range.end) {
      // 同日内の時間範囲
      return timeString >= range.start && timeString <= range.end;
    } else {
      // 日付をまたぐ時間範囲
      return timeString >= range.start || timeString <= range.end;
    }
  });
}

/**
 * 高度なセキュリティアラート検出
 */
export async function detectAdvancedSecurityAlerts(): Promise<SecurityAlert[]> {
  initializeSecurityRules();
  
  const enabledRules = securityRules.filter(rule => rule.enabled);
  const newAlerts: SecurityAlert[] = [];
  
  // 最近のログを取得
  const now = new Date();
  const maxTimeWindow = Math.max(...enabledRules.map(rule => rule.timeWindow));
  const startTime = new Date(now.getTime() - maxTimeWindow * 60 * 1000);
  
  const recentLogs = await getAuditLogs({
    limit: 1000,
    startDate: startTime.toISOString(),
    endDate: now.toISOString()
  });
  
  for (const rule of enabledRules) {
    const ruleStartTime = new Date(now.getTime() - rule.timeWindow * 60 * 1000);
    const relevantLogs = recentLogs.filter(log => {
      const logTime = new Date(log.timestamp);
      
      // 時間範囲チェック
      if (logTime < ruleStartTime) return false;
      
      // アクション条件チェック
      if (rule.conditions.actions && !rule.conditions.actions.includes(log.action)) {
        return false;
      }
      
      // 時刻範囲チェック
      if (rule.conditions.timeRanges && !isTimeInRange(logTime, rule.conditions.timeRanges)) {
        return false;
      }
      
      return true;
    });
    
    if (relevantLogs.length >= rule.threshold) {
      // アラートを生成
      const affectedUsers = [...new Set(relevantLogs.map(log => log.userEmail))];
      const affectedIPs = [...new Set(relevantLogs.map(log => log.ipAddress).filter(ip => ip))];
      
      // 既存の同じタイプのアクティブアラートをチェック
      const existingAlert = securityAlerts.find(alert => 
        alert.ruleId === rule.id && 
        alert.status === 'active' &&
        now.getTime() - alert.lastOccurrence.getTime() < 60 * 60 * 1000 // 1時間以内
      );
      
      if (existingAlert) {
        // 既存アラートを更新
        existingAlert.count = relevantLogs.length;
        existingAlert.lastOccurrence = now;
        existingAlert.affectedUsers = affectedUsers;
        existingAlert.affectedIPs = affectedIPs;
      } else {
        // 新しいアラートを作成
        const alert: SecurityAlert = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ruleId: rule.id,
          ruleName: rule.name,
          type: rule.type,
          severity: rule.severity,
          message: generateAlertMessage(rule, relevantLogs.length, affectedUsers),
          details: {
            logs: relevantLogs.slice(0, 10), // 最初の10件のログ
            timeWindow: rule.timeWindow,
            threshold: rule.threshold
          },
          affectedUsers,
          affectedIPs,
          count: relevantLogs.length,
          firstOccurrence: new Date(Math.min(...relevantLogs.map(log => log.timestamp.getTime()))),
          lastOccurrence: now,
          status: 'active',
          createdAt: now
        };
        
        securityAlerts.unshift(alert);
        newAlerts.push(alert);
        
        // メモリ制限（最新1000件まで保持）
        if (securityAlerts.length > 1000) {
          securityAlerts = securityAlerts.slice(0, 1000);
        }
      }
    }
  }
  
  console.log(`🚨 Security alerts detected: ${newAlerts.length} new alerts`);
  return newAlerts;
}

/**
 * アラートメッセージを生成
 */
function generateAlertMessage(rule: SecurityAlertRule, count: number, users: string[]): string {
  switch (rule.type) {
    case 'failed_logins':
      return `${users.join(', ')} によるログイン失敗が ${count} 回発生しました (${rule.timeWindow}分間)`;
    case 'brute_force':
      return `ブルートフォース攻撃の可能性: ${count} 回のログイン失敗 (${rule.timeWindow}分間)`;
    case 'suspicious_activity':
      return `疑わしいアクティビティ: 深夜時間帯に ${users.join(', ')} がアクセス (${count}回)`;
    case 'privilege_escalation':
      return `権限昇格の可能性: ${users.join(', ')} による頻繁なユーザー操作 (${count}回)`;
    case 'unusual_access':
      return `異常なアクセスパターン: ${count} 回の管理操作 (${rule.timeWindow}分間)`;
    default:
      return `セキュリティアラート: ${rule.name} - ${count}回の検出`;
  }
}

/**
 * 全セキュリティアラートを取得
 */
export function getSecurityAlerts(options: {
  status?: SecurityAlert['status'];
  severity?: SecurityAlert['severity'];
  limit?: number;
  offset?: number;
} = {}): SecurityAlert[] {
  let filtered = securityAlerts;
  
  if (options.status) {
    filtered = filtered.filter(alert => alert.status === options.status);
  }
  
  if (options.severity) {
    filtered = filtered.filter(alert => alert.severity === options.severity);
  }
  
  const offset = options.offset || 0;
  const limit = options.limit || 50;
  
  return filtered.slice(offset, offset + limit);
}

/**
 * アラートのステータスを更新
 */
export function updateAlertStatus(
  alertId: string, 
  status: SecurityAlert['status'],
  userId: string,
  notes?: string
): SecurityAlert | null {
  const alert = securityAlerts.find(a => a.id === alertId);
  if (!alert) return null;
  
  alert.status = status;
  
  if (status === 'acknowledged') {
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();
  } else if (status === 'resolved') {
    alert.resolvedBy = userId;
    alert.resolvedAt = new Date();
  }
  
  if (notes) {
    alert.notes = notes;
  }
  
  return alert;
}

/**
 * アラート統計を取得
 */
export function getSecurityAlertStats(): {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  bySeverity: Record<SecurityAlert['severity'], number>;
  byType: Record<SecurityAlert['type'], number>;
} {
  const stats = {
    total: securityAlerts.length,
    active: 0,
    acknowledged: 0,
    resolved: 0,
    bySeverity: { low: 0, medium: 0, high: 0, critical: 0 } as Record<SecurityAlert['severity'], number>,
    byType: {} as Record<SecurityAlert['type'], number>
  };
  
  securityAlerts.forEach(alert => {
    // ステータス別
    if (alert.status === 'active') stats.active++;
    else if (alert.status === 'acknowledged') stats.acknowledged++;
    else if (alert.status === 'resolved') stats.resolved++;
    
    // 重要度別
    stats.bySeverity[alert.severity]++;
    
    // タイプ別
    stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
  });
  
  return stats;
}

/**
 * メール通知用のアラート情報を取得
 */
export function getAlertsForEmailNotification(): SecurityAlert[] {
  return securityAlerts.filter(alert => {
    const rule = securityRules.find(r => r.id === alert.ruleId);
    return rule?.notifications.email && alert.status === 'active';
  });
}