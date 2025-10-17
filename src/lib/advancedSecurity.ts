import { supabaseAdmin } from './supabase';
import { logAuditEvent } from './auditLog';

// セキュリティ設定の型定義
export interface SecuritySettings {
  id: string;
  loginAttemptLimit: number; // ログイン試行制限回数
  loginAttemptWindow: number; // ログイン試行制限の時間窓（分）
  lockoutDuration: number; // アカウントロック時間（分）
  ipWhitelist: string[]; // IP許可リスト
  ipBlacklist: string[]; // IP禁止リスト
  sessionTimeout: number; // セッションタイムアウト（分）
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventReuse: number; // 過去N回分のパスワード再利用を禁止
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginAttempt {
  id: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  timestamp: Date;
  failureReason?: string;
  geolocation?: {
    country: string;
    city: string;
    latitude: number;
    longitude: number;
  };
}

export interface SecurityReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'incident';
  title: string;
  summary: string;
  data: {
    loginAttempts: {
      total: number;
      successful: number;
      failed: number;
      blocked: number;
    };
    ipAnalysis: {
      uniqueIPs: number;
      suspiciousIPs: string[];
      blockedIPs: string[];
    };
    userActivity: {
      activeUsers: number;
      newUsers: number;
      lockedAccounts: number;
    };
    threatDetection: {
      bruteForceAttempts: number;
      suspiciousActivity: number;
      geoAnomalies: number;
    };
    recommendations: string[];
  };
  generatedAt: Date;
}

export interface IPRestriction {
  id: string;
  type: 'whitelist' | 'blacklist';
  ipAddress: string;
  cidrNotation?: string; // CIDR記法 (例: 192.168.1.0/24)
  description: string;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

// メモリベースストレージ（開発・テスト用）
let securitySettings: SecuritySettings | null = null;
let loginAttempts: LoginAttempt[] = [];
let ipRestrictions: IPRestriction[] = [];
let securityReports: SecurityReport[] = [];

/**
 * デフォルトセキュリティ設定を初期化
 */
export function initializeSecuritySettings(): SecuritySettings {
  if (!securitySettings) {
    const now = new Date();
    securitySettings = {
      id: 'default_security_settings',
      loginAttemptLimit: 5,
      loginAttemptWindow: 15,
      lockoutDuration: 30,
      ipWhitelist: [],
      ipBlacklist: [],
      sessionTimeout: 120,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        preventReuse: 5
      },
      createdAt: now,
      updatedAt: now
    };
    
    console.log('🛡️ Advanced security settings initialized');
  }
  return securitySettings;
}

/**
 * セキュリティ設定を取得
 */
export function getSecuritySettings(): SecuritySettings {
  return initializeSecuritySettings();
}

/**
 * セキュリティ設定を更新
 */
export function updateSecuritySettings(
  updates: Partial<Omit<SecuritySettings, 'id' | 'createdAt' | 'updatedAt'>>,
  updatedBy: string
): SecuritySettings {
  const settings = initializeSecuritySettings();
  
  Object.assign(settings, updates, { updatedAt: new Date() });
  
  // 監査ログに記録
  logAuditEvent(
    updatedBy,
    'system@moss-country.com',
    'security.settings_update',
    'security',
    {
      updated_fields: Object.keys(updates),
      new_values: updates
    }
  );
  
  return settings;
}

/**
 * ログイン試行を記録
 */
export function recordLoginAttempt(
  email: string,
  ipAddress: string,
  userAgent: string,
  success: boolean,
  failureReason?: string,
  geolocation?: LoginAttempt['geolocation']
): LoginAttempt {
  const attempt: LoginAttempt = {
    id: `login_attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email,
    ipAddress,
    userAgent,
    success,
    timestamp: new Date(),
    failureReason,
    geolocation
  };
  
  loginAttempts.unshift(attempt);
  
  // メモリ制限（最新5000件まで保持）
  if (loginAttempts.length > 5000) {
    loginAttempts = loginAttempts.slice(0, 5000);
  }
  
  return attempt;
}

/**
 * 指定メールアドレスの最近のログイン試行回数をチェック
 */
export function checkLoginAttempts(email: string, ipAddress: string): {
  isBlocked: boolean;
  remainingAttempts: number;
  lockoutUntil?: Date;
  reason?: string;
} {
  const settings = getSecuritySettings();
  const now = new Date();
  const windowStart = new Date(now.getTime() - settings.loginAttemptWindow * 60 * 1000);
  
  // 指定時間窓での失敗試行を取得
  const recentFailures = loginAttempts.filter(attempt => 
    (attempt.email === email || attempt.ipAddress === ipAddress) &&
    !attempt.success &&
    attempt.timestamp >= windowStart
  );
  
  const failureCount = recentFailures.length;
  
  if (failureCount >= settings.loginAttemptLimit) {
    const lastFailure = recentFailures[0];
    const lockoutUntil = new Date(
      lastFailure.timestamp.getTime() + settings.lockoutDuration * 60 * 1000
    );
    
    if (now < lockoutUntil) {
      return {
        isBlocked: true,
        remainingAttempts: 0,
        lockoutUntil,
        reason: 'ログイン試行回数の制限に達しました'
      };
    }
  }
  
  return {
    isBlocked: false,
    remainingAttempts: Math.max(0, settings.loginAttemptLimit - failureCount)
  };
}

/**
 * IPアドレスがブロックされているかチェック（簡易版）
 */
export function checkIPRestrictions(ipAddress: string): {
  isAllowed: boolean;
  reason?: string;
  restriction?: IPRestriction;
} {
  // IP制限機能は無効化
  return { isAllowed: true };
}

/**
 * IPアドレスマッチング（CIDR対応）
 */
function isIPMatch(clientIP: string, targetIP: string, cidr?: string): boolean {
  if (cidr) {
    // CIDR記法での判定（簡易実装）
    const [network, mask] = cidr.split('/');
    if (network === targetIP) {
      // 簡易的な実装：同一ネットワーク判定
      const clientParts = clientIP.split('.');
      const networkParts = network.split('.');
      const maskBits = parseInt(mask);
      
      // IPv4の簡易マスク判定（完全な実装ではありません）
      if (maskBits >= 24) {
        return clientParts.slice(0, 3).join('.') === networkParts.slice(0, 3).join('.');
      } else if (maskBits >= 16) {
        return clientParts.slice(0, 2).join('.') === networkParts.slice(0, 2).join('.');
      }
    }
  }
  
  return clientIP === targetIP;
}

/**
 * IP制限を追加（無効化）
 */
export function addIPRestriction(
  type: 'whitelist' | 'blacklist',
  ipAddress: string,
  description: string,
  createdBy: string,
  options: {
    cidrNotation?: string;
    expiresAt?: Date;
  } = {}
): IPRestriction {
  // IP制限機能は無効化されています
  throw new Error('IP制限機能は現在無効化されています');
}

/**
 * IP制限を削除（無効化）
 */
export function removeIPRestriction(restrictionId: string, removedBy: string): boolean {
  // IP制限機能は無効化されています
  return false;
}

/**
 * セキュリティレポートを生成
 */
export function generateSecurityReport(
  type: SecurityReport['type'],
  timeRange: { start: Date; end: Date }
): SecurityReport {
  const now = new Date();
  const { start, end } = timeRange;
  
  // 指定期間のログイン試行を分析
  const periodAttempts = loginAttempts.filter(attempt => 
    attempt.timestamp >= start && attempt.timestamp <= end
  );
  
  const successful = periodAttempts.filter(a => a.success).length;
  const failed = periodAttempts.filter(a => !a.success).length;
  const uniqueIPs = [...new Set(periodAttempts.map(a => a.ipAddress))];
  
  // 疑わしいIPアドレスを検出（失敗率が高い）
  const ipStats = uniqueIPs.map(ip => {
    const ipAttempts = periodAttempts.filter(a => a.ipAddress === ip);
    const ipFailed = ipAttempts.filter(a => !a.success).length;
    return {
      ip,
      total: ipAttempts.length,
      failed: ipFailed,
      failureRate: ipFailed / ipAttempts.length
    };
  });
  
  const suspiciousIPs = ipStats
    .filter(stat => stat.failureRate > 0.5 && stat.total > 3)
    .map(stat => stat.ip);
  
  const blockedIPs = ipRestrictions
    .filter(r => r.type === 'blacklist' && r.isActive)
    .map(r => r.ipAddress);
  
  // 推奨事項を生成
  const recommendations: string[] = [];
  
  if (failed > successful) {
    recommendations.push('ログイン失敗が成功を上回っています。パスワードポリシーの強化を検討してください。');
  }
  
  if (suspiciousIPs.length > 0) {
    recommendations.push(`${suspiciousIPs.length}個の疑わしいIPアドレスを検出しました。IP制限の追加を検討してください。`);
  }
  
  if (uniqueIPs.length > 50) {
    recommendations.push('多数のIPアドレスからのアクセスを検出しました。地理的ブロック機能の有効化を検討してください。');
  }
  
  const report: SecurityReport = {
    id: `security_report_${Date.now()}`,
    type,
    title: `セキュリティレポート - ${type === 'daily' ? '日次' : type === 'weekly' ? '週次' : type === 'monthly' ? '月次' : 'インシデント'}`,
    summary: `期間: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
    data: {
      loginAttempts: {
        total: periodAttempts.length,
        successful,
        failed,
        blocked: 0 // TODO: 実際のブロック数を計算
      },
      ipAnalysis: {
        uniqueIPs: uniqueIPs.length,
        suspiciousIPs,
        blockedIPs
      },
      userActivity: {
        activeUsers: [...new Set(periodAttempts.filter(a => a.success).map(a => a.email))].length,
        newUsers: 0, // TODO: 新規ユーザー数を計算
        lockedAccounts: 0 // TODO: ロックされたアカウント数を計算
      },
      threatDetection: {
        bruteForceAttempts: suspiciousIPs.length,
        suspiciousActivity: periodAttempts.filter(a => !a.success && a.failureReason).length,
        geoAnomalies: 0 // TODO: 地理的異常を検出
      },
      recommendations
    },
    generatedAt: now
  };
  
  securityReports.unshift(report);
  
  // メモリ制限（最新100件まで保持）
  if (securityReports.length > 100) {
    securityReports = securityReports.slice(0, 100);
  }
  
  return report;
}

/**
 * セキュリティレポート一覧を取得
 */
export function getSecurityReports(limit = 20): SecurityReport[] {
  return securityReports.slice(0, limit);
}

/**
 * パスワード強度をチェック
 */
export function checkPasswordStrength(password: string): {
  isValid: boolean;
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
} {
  const settings = getSecuritySettings();
  const policy = settings.passwordPolicy;
  
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  
  // 長さチェック
  if (password.length < policy.minLength) {
    issues.push(`パスワードは${policy.minLength}文字以上である必要があります`);
  } else {
    score += 20;
  }
  
  // 大文字チェック
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    issues.push('大文字を1つ以上含む必要があります');
  } else if (/[A-Z]/.test(password)) {
    score += 20;
  }
  
  // 小文字チェック
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    issues.push('小文字を1つ以上含む必要があります');
  } else if (/[a-z]/.test(password)) {
    score += 20;
  }
  
  // 数字チェック
  if (policy.requireNumbers && !/\d/.test(password)) {
    issues.push('数字を1つ以上含む必要があります');
  } else if (/\d/.test(password)) {
    score += 20;
  }
  
  // 特殊文字チェック
  if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    issues.push('特殊文字を1つ以上含む必要があります');
    suggestions.push('!@#$%^&*(),.?":{}|<> のような特殊文字を使用してください');
  } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 20;
  }
  
  // 推奨事項
  if (password.length < 12) {
    suggestions.push('より安全にするため12文字以上のパスワードを推奨します');
  }
  
  if (!/\d.*\d/.test(password)) {
    suggestions.push('数字を複数使用するとより安全です');
  }
  
  return {
    isValid: issues.length === 0,
    score,
    issues,
    suggestions
  };
}

/**
 * 統計情報を取得
 */
export function getSecurityStatistics(): {
  totalLoginAttempts: number;
  recentFailureRate: number;
  activeIPRestrictions: number;
  suspiciousActivityCount: number;
  lastReportGenerated?: Date;
} {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const recentAttempts = loginAttempts.filter(a => a.timestamp >= last24Hours);
  const recentFailures = recentAttempts.filter(a => !a.success);
  
  const activeRestrictions = ipRestrictions.filter(r => 
    r.isActive && (!r.expiresAt || r.expiresAt > now)
  );
  
  return {
    totalLoginAttempts: loginAttempts.length,
    recentFailureRate: recentAttempts.length > 0 ? recentFailures.length / recentAttempts.length : 0,
    activeIPRestrictions: activeRestrictions.length,
    suspiciousActivityCount: recentFailures.length,
    lastReportGenerated: securityReports.length > 0 ? securityReports[0].generatedAt : undefined
  };
}