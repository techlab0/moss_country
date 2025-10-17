import { NextRequest, NextResponse } from 'next/server';
import { 
  getPermissions,
  getPermissionsByCategory,
  getUserRoles,
  createUserRole,
  updateUserRole,
  getUserGroups,
  createUserGroup,
  updateUserGroup
} from '@/lib/advancedUserManager';
import { findUserById } from '@/lib/userManager';
import { verifyJWT } from '@/lib/auth';

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
    const type = searchParams.get('type');

    switch (type) {
      case 'permissions':
        return NextResponse.json({
          permissions: getPermissions(),
          permissionsByCategory: getPermissionsByCategory()
        });

      case 'roles':
        return NextResponse.json({
          roles: getUserRoles()
        });

      case 'groups':
        return NextResponse.json({
          groups: getUserGroups()
        });

      default:
        return NextResponse.json({
          permissions: getPermissions(),
          permissionsByCategory: getPermissionsByCategory(),
          roles: getUserRoles(),
          groups: getUserGroups()
        });
    }

  } catch (error) {
    console.error('Permissions fetch error:', error);
    return NextResponse.json({ error: '権限情報の取得に失敗しました' }, { status: 500 });
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

    const { type, data } = await request.json();

    switch (type) {
      case 'create_role':
        if (!data.name || !data.permissions) {
          return NextResponse.json({ 
            error: '役割名と権限が必要です' 
          }, { status: 400 });
        }
        
        const newRole = createUserRole({
          name: data.name,
          description: data.description || '',
          permissions: data.permissions,
          isSystem: false
        });
        
        return NextResponse.json({
          success: true,
          message: '新しい役割が作成されました',
          role: newRole
        });

      case 'create_group':
        if (!data.name) {
          return NextResponse.json({ 
            error: 'グループ名が必要です' 
          }, { status: 400 });
        }
        
        const newGroup = createUserGroup({
          name: data.name,
          description: data.description || '',
          userIds: data.userIds || [],
          permissions: data.permissions || []
        });
        
        return NextResponse.json({
          success: true,
          message: '新しいグループが作成されました',
          group: newGroup
        });

      default:
        return NextResponse.json({ error: '無効なタイプです' }, { status: 400 });
    }

  } catch (error) {
    console.error('Permission operation error:', error);
    return NextResponse.json({ error: '権限操作に失敗しました' }, { status: 500 });
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

    const { type, id, data } = await request.json();

    switch (type) {
      case 'update_role':
        const updatedRole = updateUserRole(id, data);
        if (!updatedRole) {
          return NextResponse.json({ 
            error: '役割が見つかりません' 
          }, { status: 404 });
        }
        
        return NextResponse.json({
          success: true,
          message: '役割が更新されました',
          role: updatedRole
        });

      case 'update_group':
        const updatedGroup = updateUserGroup(id, data);
        if (!updatedGroup) {
          return NextResponse.json({ 
            error: 'グループが見つかりません' 
          }, { status: 404 });
        }
        
        return NextResponse.json({
          success: true,
          message: 'グループが更新されました',
          group: updatedGroup
        });

      default:
        return NextResponse.json({ error: '無効なタイプです' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Permission update error:', error);
    
    if (error.message?.includes('システム定義')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: '権限更新に失敗しました' }, { status: 500 });
  }
}