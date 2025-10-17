import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    // まず初期データを直接挿入してテーブルの存在を確認・作成
    const initialFaqs = [
      {
        question: '駐車場はありますか？',
        answer: '専用駐車場はございませんが、近隣に複数のコインパーキングがございます。お車でお越しの際は事前にご確認ください。',
        display_order: 1,
        is_active: true
      },
      {
        question: '予約は必要ですか？',
        answer: '商品のご購入やご見学は予約不要です。ワークショップやオーダーメイドのご相談は事前予約をお勧めいたします。',
        display_order: 2,
        is_active: true
      },
      {
        question: 'クレジットカードは使えますか？',
        answer: 'VISA、MasterCard、JCB、American Express、各種電子マネー、QRコード決済に対応しております。',
        display_order: 3,
        is_active: true
      },
      {
        question: 'テラリウムの育て方を教えてもらえますか？',
        answer: 'もちろんです。購入時に詳しいお手入れ方法をご説明いたします。その後のご質問もお気軽にお電話ください。',
        display_order: 4,
        is_active: true
      }
    ];

    // 既存のFAQをチェック
    const { data: existingFaqs, error: selectError } = await supabaseAdmin
      .from('faqs')
      .select('question')
      .limit(1);

    // テーブルが存在しない場合のエラーかチェック
    if (selectError) {
      return NextResponse.json({ 
        success: false, 
        error: 'FAQテーブルが存在しません。Supabaseの管理画面でテーブルを作成してください。',
        details: selectError.message,
        sqlInstructions: `
Supabaseの管理画面で以下のSQLを実行してください:

CREATE TABLE IF NOT EXISTS faqs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_faqs_display_order ON faqs(display_order);
CREATE INDEX IF NOT EXISTS idx_faqs_is_active ON faqs(is_active);
        `
      }, { status: 500 });
    }

    // 初期データがない場合は挿入
    if (!existingFaqs || existingFaqs.length === 0) {
      console.log('初期FAQデータを挿入中...');
      
      const { data: insertedFaqs, error: insertError } = await supabaseAdmin
        .from('faqs')
        .insert(initialFaqs)
        .select();

      if (insertError) {
        throw insertError;
      }
      
      console.log('初期FAQデータを挿入しました:', insertedFaqs?.length);
    }

    // 最終的にFAQを取得
    const { data: faqs, error: finalSelectError } = await supabaseAdmin
      .from('faqs')
      .select('*')
      .order('display_order', { ascending: true });

    if (finalSelectError) {
      throw finalSelectError;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'FAQテーブルセットアップ完了',
      faqs: faqs || []
    });

  } catch (error) {
    console.error('FAQセットアップエラー:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'FAQテーブルセットアップに失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}