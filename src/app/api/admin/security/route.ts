import { NextRequest, NextResponse } from 'next/server';
import {
  getSecuritySettings,
  updateSecuritySettings,
  checkLoginAttempts,
  checkIPRestrictions,
  addIPRestriction,
  removeIPRestriction,
  generateSecurityReport,
  getSecurityReports,
  checkPasswordStrength,
  getSecurityStatistics,
  recordLoginAttempt
} from '@/lib/advancedSecurity';
import { findUserById } from '@/lib/userManager';
import { verifyJWT } from '@/lib/auth';
import { logAuditEvent } from '@/lib/auditLog';

export async function GET(request: NextRequest) {
  try {
    // 管理者認証を確認
    const token = request.cookies.get('admin-session')?.value;
    if (!token) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: '無効なトークンです' }, { status: 401 });
    }

    const currentUser = await findUserById(payload.userId as string);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'settings':
        const settings = getSecuritySettings();
        return NextResponse.json({ settings });

      case 'statistics':
        const statistics = getSecurityStatistics();
        return NextResponse.json({ statistics });

      case 'reports':
        const limit = parseInt(searchParams.get('limit') || '20');
        const reports = getSecurityReports(limit);
        return NextResponse.json({ reports });

      case 'check-login':
        const email = searchParams.get('email');
        const ip = searchParams.get('ip');
        
        if (!email || !ip) {
          return NextResponse.json({ 
            error: 'メールアドレスとIPアドレスが必要です' 
          }, { status: 400 });
        }

        const loginCheck = checkLoginAttempts(email, ip);
        return NextResponse.json({ loginCheck });

      case 'check-ip':
        const ipAddress = searchParams.get('ip');
        
        if (!ipAddress) {
          return NextResponse.json({ 
            error: 'IPアドレスが必要です' 
          }, { status: 400 });
        }

        const ipCheck = checkIPRestrictions(ipAddress);
        return NextResponse.json({ ipCheck });

      case 'password-strength':
        const password = searchParams.get('password');
        
        if (!password) {
          return NextResponse.json({ 
            error: 'パスワードが必要です' 
          }, { status: 400 });
        }

        const passwordCheck = checkPasswordStrength(password);
        return NextResponse.json({ passwordCheck });

      default:
        // 概要情報を返す
        const [overviewSettings, overviewStats, overviewReports] = await Promise.all([
          Promise.resolve(getSecuritySettings()),
          Promise.resolve(getSecurityStatistics()),
          Promise.resolve(getSecurityReports(5))
        ]);

        return NextResponse.json({
          settings: overviewSettings,
          statistics: overviewStats,
          recentReports: overviewReports
        });
    }

  } catch (error) {
    console.error('Security API error:', error);
    return NextResponse.json({ 
      error: 'セキュリティ情報の取得に失敗しました',
      details: error instanceof Error ? error.message : '不明なエラー'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 管理者認証を確認
    const token = request.cookies.get('admin-session')?.value;
    if (!token) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: '無効なトークンです' }, { status: 401 });
    }

    const currentUser = await findUserById(payload.userId as string);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const { action, data } = await request.json();
    const userIP = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    switch (action) {
      case 'update-settings':
        if (!data) {
          return NextResponse.json({ 
            error: '設定データが必要です' 
          }, { status: 400 });
        }

        const updatedSettings = updateSecuritySettings(data, currentUser.id);

        await logAuditEvent(
          currentUser.id,
          currentUser.email,
          'security.settings_update',
          'security',
          {
            updated_fields: Object.keys(data),
            previous_values: getSecuritySettings(),
            new_values: data
          },
          {
            ipAddress: userIP,
            userAgent
          }
        );

        return NextResponse.json({
          success: true,
          message: 'セキュリティ設定を更新しました',
          settings: updatedSettings
        });

      case 'add-ip-restriction':
        if (!data?.type || !data?.ipAddress || !data?.description) {
          return NextResponse.json({ 
            error: 'タイプ、IPアドレス、説明が必要です' 
          }, { status: 400 });
        }

        const restriction = addIPRestriction(
          data.type,
          data.ipAddress,
          data.description,
          currentUser.id,
          {
            cidrNotation: data.cidrNotation,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
          }
        );

        return NextResponse.json({
          success: true,
          message: 'IP制限を追加しました',
          restriction
        });

      case 'remove-ip-restriction':
        if (!data?.restrictionId) {
          return NextResponse.json({ 
            error: '制限IDが必要です' 
          }, { status: 400 });
        }

        const removed = removeIPRestriction(data.restrictionId, currentUser.id);
        
        if (!removed) {
          return NextResponse.json({ 
            error: 'IP制限が見つかりません' 
          }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          message: 'IP制限を削除しました'
        });

      case 'generate-report':
        const reportType = data?.type || 'daily';
        const now = new Date();
        let start: Date, end: Date;

        switch (reportType) {
          case 'daily':
            start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            end = now;
            break;
          case 'weekly':
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            end = now;
            break;
          case 'monthly':
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            end = now;
            break;
          default:
            start = data?.startDate ? new Date(data.startDate) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
            end = data?.endDate ? new Date(data.endDate) : now;
        }

        const report = generateSecurityReport(reportType, { start, end });

        await logAuditEvent(
          currentUser.id,
          currentUser.email,
          'security.report_generated',
          'security',
          {
            report_type: reportType,
            report_id: report.id,
            period_start: start,
            period_end: end
          },
          {
            ipAddress: userIP,
            userAgent
          }
        );

        return NextResponse.json({
          success: true,
          message: 'セキュリティレポートを生成しました',
          report
        });

      case 'record-login-attempt':
        if (!data?.email || !data?.success === undefined) {
          return NextResponse.json({ 
            error: 'メールアドレスと成功フラグが必要です' 
          }, { status: 400 });
        }

        const loginAttempt = recordLoginAttempt(
          data.email,
          userIP,
          userAgent,
          data.success,
          data.failureReason,
          data.geolocation
        );

        return NextResponse.json({
          success: true,
          message: 'ログイン試行を記録しました',
          attempt: loginAttempt
        });

      default:
        return NextResponse.json({ 
          error: '無効なアクションです' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Security operation error:', error);
    return NextResponse.json({ 
      error: 'セキュリティ操作に失敗しました',
      details: error instanceof Error ? error.message : '不明なエラー'
    }, { status: 500 });
  }
}