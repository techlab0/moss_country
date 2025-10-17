import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/auditLog';
import { findUserById } from '@/lib/userManager';
import { verifyJWT } from '@/lib/auth';

// CSV生成関数
function generateCSV(logs: any[]): string {
  const headers = [
    'Timestamp',
    'User Email',
    'Action',
    'Resource',
    'Resource ID',
    'Severity',
    'IP Address',
    'User Agent',
    'Details'
  ];

  const csvRows = [
    headers.join(','),
    ...logs.map(log => [
      `"${new Date(log.created_at || log.timestamp).toISOString()}"`,
      `"${log.user_email || log.userEmail || ''}"`,
      `"${log.action || ''}"`,
      `"${log.category || log.resource || ''}"`,
      `"${log.resource_id || log.resourceId || ''}"`,
      `"${log.severity || ''}"`,
      `"${log.ip_address || log.ipAddress || ''}"`,
      `"${log.user_agent || log.userAgent || ''}"`,
      `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`
    ].join(','))
  ];

  return csvRows.join('\n');
}

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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const severity = searchParams.get('severity') || undefined;
    const action = searchParams.get('action') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const userEmail = searchParams.get('userEmail') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const ipAddress = searchParams.get('ipAddress') || undefined;
    const resource = searchParams.get('resource') || undefined;
    const searchText = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || 'timestamp';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const export_format = searchParams.get('export') || undefined;

    // エクスポート形式の場合は全件取得
    const effectiveLimit = export_format ? undefined : limit;
    const effectiveOffset = export_format ? 0 : offset;

    // 監査ログを取得
    const logs = await getAuditLogs({
      limit: effectiveLimit,
      offset: effectiveOffset,
      severity: severity as any,
      action: action as any,
      userId,
      userEmail,
      startDate,
      endDate,
      ipAddress,
      resource,
      searchText,
      sortBy: sortBy as any,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    // エクスポート形式の場合は適切な形式で返す
    if (export_format === 'csv') {
      const csv = generateCSV(logs);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    if (export_format === 'json') {
      return new NextResponse(JSON.stringify(logs, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }

    return NextResponse.json({
      logs,
      pagination: {
        limit,
        offset,
        hasMore: logs.length === limit,
        total: logs.length,
      }
    });

  } catch (error) {
    console.error('Audit logs fetch error:', error);
    return NextResponse.json({ error: '監査ログの取得に失敗しました' }, { status: 500 });
  }
}