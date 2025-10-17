import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log('Testing Supabase connection...');
    
    // テーブルの存在確認
    const { data: tableInfo, error: tableError } = await supabase
      .from('calendar_events')
      .select('count(*)', { count: 'exact' });
    
    console.log('Table info result:', { data: tableInfo, error: tableError });
    
    // 全データ取得テスト
    const { data: allData, error: dataError } = await supabase
      .from('calendar_events')
      .select('*');
      
    console.log('All data result:', { data: allData, error: dataError });
    
    return NextResponse.json({
      success: true,
      tableExists: !tableError,
      tableError,
      dataCount: allData?.length || 0,
      allData,
      dataError
    });
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error.message },
      { status: 500 }
    );
  }
}