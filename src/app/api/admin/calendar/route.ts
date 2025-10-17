import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CalendarEvent {
  type: 'open' | 'event' | 'closed';
  title: string;
  location?: string;
  notes?: string;
}

export async function GET() {
  try {
    console.log('Calendar GET API called');
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service Role Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('date', { ascending: true });

    console.log('Supabase query result:', { data: events, error });

    if (error) {
      console.error('Calendar events fetch error:', error);
      return NextResponse.json(
        { error: 'カレンダーデータの取得に失敗しました', details: error },
        { status: 500 }
      );
    }

    // データを { date: event } の形式に変換
    const calendarData: { [key: string]: CalendarEvent } = {};
    events?.forEach(event => {
      calendarData[event.date] = {
        type: event.type,
        title: event.title,
        location: event.location,
        notes: event.notes
      };
    });

    console.log('Calendar data to return:', calendarData);
    console.log('Number of events:', events?.length);
    
    return NextResponse.json(calendarData);
  } catch (error) {
    console.error('Calendar GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { date, event }: { date: string; event: CalendarEvent } = await request.json();

    if (!date || !event) {
      return NextResponse.json(
        { error: '日付とイベント情報が必要です' },
        { status: 400 }
      );
    }

    // 既存のイベントがあるかチェック
    const { data: existing, error: checkError } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('date', date)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Calendar check error:', checkError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    let result;
    if (existing) {
      // 既存のイベントを更新
      const { data, error } = await supabase
        .from('calendar_events')
        .update({
          type: event.type,
          title: event.title,
          location: event.location,
          notes: event.notes,
          updated_at: new Date().toISOString()
        })
        .eq('date', date)
        .select()
        .single();

      result = { data, error };
    } else {
      // 新しいイベントを作成
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          date,
          type: event.type,
          title: event.title,
          location: event.location,
          notes: event.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      result = { data, error };
    }

    if (result.error) {
      console.error('Calendar save error:', result.error);
      return NextResponse.json(
        { error: 'カレンダーデータの保存に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'カレンダーが更新されました',
      data: result.data 
    });
  } catch (error) {
    console.error('Calendar POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { date }: { date: string } = await request.json();

    if (!date) {
      return NextResponse.json(
        { error: '削除する日付が指定されていません' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('date', date);

    if (error) {
      console.error('Calendar delete error:', error);
      return NextResponse.json(
        { error: 'カレンダーデータの削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'カレンダーイベントが削除されました' 
    });
  } catch (error) {
    console.error('Calendar DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}