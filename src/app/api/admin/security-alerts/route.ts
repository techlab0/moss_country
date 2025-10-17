import { NextRequest, NextResponse } from 'next/server';
import { 
  detectAdvancedSecurityAlerts,
  getSecurityAlerts,
  getSecurityAlertStats,
  updateAlertStatus
} from '@/lib/securityAlerts';
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

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;
    const severity = searchParams.get('severity') as any;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action');

    if (action === 'detect') {
      // 新しいセキュリティアラートを検出
      const newAlerts = await detectAdvancedSecurityAlerts();
      return NextResponse.json({ 
        alerts: newAlerts,
        message: `${newAlerts.length}件の新しいアラートを検出しました`
      });
    }

    if (action === 'stats') {
      // アラート統計を取得
      const stats = getSecurityAlertStats();
      return NextResponse.json({ stats });
    }

    // 通常のアラート一覧取得
    const alerts = getSecurityAlerts({
      status,
      severity,
      limit,
      offset
    });

    return NextResponse.json({
      alerts,
      pagination: {
        limit,
        offset,
        hasMore: alerts.length === limit
      }
    });

  } catch (error) {
    console.error('Security alerts fetch error:', error);
    return NextResponse.json({ error: 'セキュリティアラートの取得に失敗しました' }, { status: 500 });
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

    const { action, alertId, status, notes } = await request.json();

    if (action === 'update_status') {
      if (!alertId || !status) {
        return NextResponse.json({ 
          error: 'アラートIDとステータスが必要です' 
        }, { status: 400 });
      }

      const updatedAlert = updateAlertStatus(alertId, status, currentUser.id, notes);
      
      if (!updatedAlert) {
        return NextResponse.json({ 
          error: 'アラートが見つかりません' 
        }, { status: 404 });
      }

      // アラートステータス変更を記録
      await logAuditEvent(
        currentUser.id,
        currentUser.email,
        'settings.changed',
        'security',
        {
          alert_id: alertId,
          old_status: 'active',
          new_status: status,
          notes: notes || null
        },
        {
          resourceId: alertId,
          severity: 'medium'
        }
      );

      return NextResponse.json({
        success: true,
        message: 'アラートステータスが更新されました',
        alert: updatedAlert
      });
    }

    return NextResponse.json({ error: '無効なアクションです' }, { status: 400 });

  } catch (error) {
    console.error('Security alerts action error:', error);
    return NextResponse.json({ error: 'セキュリティアラートの操作に失敗しました' }, { status: 500 });
  }
}