import { NextRequest, NextResponse } from 'next/server';
import { 
  getSecurityRules,
  updateSecurityRule
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

    const rules = getSecurityRules();
    return NextResponse.json({ rules });

  } catch (error) {
    console.error('Security rules fetch error:', error);
    return NextResponse.json({ error: 'セキュリティルールの取得に失敗しました' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

    const { ruleId, updates } = await request.json();

    if (!ruleId || !updates) {
      return NextResponse.json({ 
        error: 'ルールIDと更新データが必要です' 
      }, { status: 400 });
    }

    const updatedRule = updateSecurityRule(ruleId, updates);
    
    if (!updatedRule) {
      return NextResponse.json({ 
        error: 'セキュリティルールが見つかりません' 
      }, { status: 404 });
    }

    // セキュリティルール変更を記録
    await logAuditEvent(
      currentUser.id,
      currentUser.email,
      'settings.changed',
      'security',
      {
        rule_id: ruleId,
        rule_name: updatedRule.name,
        changes: updates
      },
      {
        resourceId: ruleId,
        severity: 'medium'
      }
    );

    return NextResponse.json({
      success: true,
      message: 'セキュリティルールが更新されました',
      rule: updatedRule
    });

  } catch (error) {
    console.error('Security rule update error:', error);
    return NextResponse.json({ error: 'セキュリティルールの更新に失敗しました' }, { status: 500 });
  }
}