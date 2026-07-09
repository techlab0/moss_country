import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminSession } from '@/lib/auth';
import type { CalendarItem, CalendarData } from '@/types/calendar';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Calendar events fetch error:', error);
      return NextResponse.json(
        { error: 'カレンダーデータの取得に失敗しました', details: error },
        { status: 500 }
      );
    }

    // 1日に複数項目を持てるよう、date でグルーピングして配列にする
    const calendarData: CalendarData = {};
    events?.forEach((event) => {
      const item: CalendarItem = {
        id: event.id,
        type: event.type,
        title: event.title,
        location: event.location,
        notes: event.notes,
      };
      (calendarData[event.date] ||= []).push(item);
    });

    return NextResponse.json(calendarData);
  } catch (error) {
    console.error('Calendar GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'unknown' },
      { status: 500 }
    );
  }
}

// 項目の追加・更新。event.id があれば更新、無ければ新規追加（＝1日に複数項目を持てる）。
export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { date, event }: { date: string; event: CalendarItem } = await request.json();

    if (!date || !event || !event.type) {
      return NextResponse.json(
        { error: '日付と項目情報が必要です' },
        { status: 400 }
      );
    }

    const fields = {
      type: event.type,
      title: event.title,
      location: event.location ?? null,
      notes: event.notes ?? null,
    };

    let result;
    if (event.id) {
      // 既存項目を更新
      result = await supabase
        .from('calendar_events')
        .update({ ...fields, date, updated_at: new Date().toISOString() })
        .eq('id', event.id)
        .select()
        .single();
    } else {
      // 新規項目を追加
      result = await supabase
        .from('calendar_events')
        .insert({
          date,
          ...fields,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Calendar save error:', result.error);
      return NextResponse.json(
        { error: 'カレンダーデータの保存に失敗しました', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'カレンダーが更新されました',
      data: result.data,
    });
  } catch (error) {
    console.error('Calendar POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 項目削除。id 指定でその1件、date 指定（idなし）でその日の全項目を削除。
export async function DELETE(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id, date }: { id?: string; date?: string } = await request.json();

    if (!id && !date) {
      return NextResponse.json(
        { error: '削除対象（idまたはdate）が指定されていません' },
        { status: 400 }
      );
    }

    const query = supabase.from('calendar_events').delete();
    const { error } = id ? await query.eq('id', id) : await query.eq('date', date!);

    if (error) {
      console.error('Calendar delete error:', error);
      return NextResponse.json(
        { error: 'カレンダーデータの削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'カレンダー項目が削除されました',
    });
  } catch (error) {
    console.error('Calendar DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
