import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/auditLog';
import { verifyAdminSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const priority = url.searchParams.get('priority') || '';
    const inquiryType = url.searchParams.get('inquiry_type') || '';

    const offset = (page - 1) * limit;

    let data = [];
    let count = 0;
    let dbConnected = true;

    try {
      // 5秒タイムアウトでSupabaseクエリを実行
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database timeout')), 5000);
      });

      let query = supabase
        .from('contact_inquiries')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // 検索フィルター
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,subject.ilike.%${search}%`);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (priority) {
        query = query.eq('priority', priority);
      }

      if (inquiryType) {
        query = query.eq('inquiry_type', inquiryType);
      }

      // ページネーション
      query = query.range(offset, offset + limit - 1);

      const result = await Promise.race([query, timeoutPromise]);
      
      if (result && typeof result === 'object' && 'data' in result) {
        if (result.error) {
          throw result.error;
        }
        data = result.data || [];
        count = result.count || 0;
      }

    } catch (dbError) {
      console.error('Supabase connection error:', dbError);
      dbConnected = false;
      
      // データベース接続失敗時はダミーデータを返す
      data = [];
      count = 0;
    }

    // 監査ログ記録（データベース接続成功時のみ）
    if (dbConnected) {
      try {
        await logAuditEvent({
          userId: session.userId,
          userEmail: session.email,
          action: 'CONTACTS_LIST_VIEW',
          category: 'contact_management',
          details: {
            page,
            limit,
            search: search || null,
            filters: { status, priority, inquiryType }
          },
          severity: 'low'
        });
      } catch (auditError) {
        console.error('Audit log error:', auditError);
        // 監査ログエラーは無視して続行
      }
    }

    return NextResponse.json({
      contacts: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      },
      dbConnected
    });

  } catch (error) {
    console.error('Contacts API error:', error);
    return NextResponse.json(
      { 
        contacts: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        },
        dbConnected: false,
        error: 'データベース接続エラーが発生しました'
      },
      { status: 200 } // 500ではなく200を返してフロントエンドでエラー処理
    );
  }
}