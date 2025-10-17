import { NextRequest, NextResponse } from 'next/server';
import { 
  batchUpdateUserStatus,
  batchUpdateUserRoles,
  recordUserActivity
} from '@/lib/advancedUserManager';
import { findUserById } from '@/lib/userManager';
import { verifyJWT } from '@/lib/auth';

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

    const { action, userIds, data, reason } = await request.json();

    if (!action || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ 
        error: 'アクションとユーザーIDが必要です' 
      }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'update_status':
        if (!data?.status) {
          return NextResponse.json({ 
            error: 'ステータスが必要です' 
          }, { status: 400 });
        }
        
        result = await batchUpdateUserStatus(
          userIds,
          data.status,
          currentUser.id,
          currentUser.email,
          reason
        );
        break;

      case 'update_role':
        if (!data?.roleId) {
          return NextResponse.json({ 
            error: '役割IDが必要です' 
          }, { status: 400 });
        }
        
        result = await batchUpdateUserRoles(
          userIds,
          data.roleId,
          currentUser.id,
          currentUser.email,
          reason
        );
        break;

      default:
        return NextResponse.json({ 
          error: '無効なアクションです' 
        }, { status: 400 });
    }

    // バッチ操作を記録
    recordUserActivity(
      currentUser.id,
      currentUser.email,
      `batch.${action}`,
      'user_management',
      {
        target_users: userIds,
        action_data: data,
        reason: reason || null,
        success_count: result.success.length,
        failed_count: result.failed.length
      },
      {
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    );

    return NextResponse.json({
      success: true,
      message: `${result.success.length}件の操作が成功しました`,
      result
    });

  } catch (error) {
    console.error('Batch operation error:', error);
    return NextResponse.json({ 
      error: 'バッチ操作に失敗しました' 
    }, { status: 500 });
  }
}