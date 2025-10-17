import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: faqs, error } = await supabaseAdmin
      .from('faqs')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json(faqs || []);
  } catch (error) {
    console.error('FAQ取得エラー:', error);
    return NextResponse.json({ error: 'FAQ取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, answer, display_order = 0 } = body;

    if (!question || !answer) {
      return NextResponse.json({ error: '質問と回答は必須です' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('faqs')
      .insert([{ question, answer, display_order }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('FAQ作成エラー:', error);
    return NextResponse.json({ error: 'FAQ作成に失敗しました' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, question, answer, display_order, is_active = true } = body;

    if (!id) {
      return NextResponse.json({ error: 'IDは必須です' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('faqs')
      .update({ question, answer, display_order, is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('FAQ更新エラー:', error);
    return NextResponse.json({ error: 'FAQ更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'IDは必須です' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('faqs')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('FAQ削除エラー:', error);
    return NextResponse.json({ error: 'FAQ削除に失敗しました' }, { status: 500 });
  }
}