import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/auditLog';
import { verifyAdminSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const { data, error } = await supabase
      .from('contact_inquiries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'お問い合わせが見つかりません' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    // 監査ログ記録
    await logAuditEvent({
      userId: session.userId,
      userEmail: session.email,
      action: 'CONTACT_DETAIL_VIEW',
      category: 'contact_management',
      details: {
        contactId: id,
        contactEmail: data.email,
        contactName: data.name
      },
      resourceId: id,
      severity: 'low'
    });

    return NextResponse.json({ contact: data });

  } catch (error) {
    console.error('Contact detail API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { status, priority } = body;

    // バリデーション
    const validStatuses = ['pending', 'replied', 'resolved'];
    const validPriorities = ['low', 'medium', 'high'];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: '無効なステータスです' },
        { status: 400 }
      );
    }

    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: '無効な優先度です' },
        { status: 400 }
      );
    }

    // 更新対象のフィールドを準備
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;

    const { data, error } = await supabase
      .from('contact_inquiries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'お問い合わせが見つかりません' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    // 監査ログ記録
    await logAuditEvent({
      userId: session.userId,
      userEmail: session.email,
      action: 'CONTACT_STATUS_UPDATE',
      category: 'contact_management',
      details: {
        contactId: id,
        contactEmail: data.email,
        contactName: data.name,
        changes: { status, priority },
        previousValues: {} // 必要に応じて更新前の値を記録
      },
      resourceId: id,
      severity: 'medium'
    });

    return NextResponse.json({
      message: 'お問い合わせが更新されました',
      contact: data
    });

  } catch (error) {
    console.error('Contact update API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}