import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('contact_inquiries')
      .select('count(*)', { count: 'exact', head: true });
    
    if (connectionError) {
      console.error('Connection error:', connectionError);
      return NextResponse.json({
        success: false,
        message: 'Database connection failed',
        error: connectionError.message,
        details: connectionError
      }, { status: 500 });
    }
    
    // Test admin connection
    const { data: adminTest, error: adminError } = await supabaseAdmin
      .from('contact_inquiries')
      .select('count(*)', { count: 'exact', head: true });
    
    const testResults = {
      success: true,
      message: 'Supabase connection successful',
      tests: {
        clientConnection: !connectionError,
        adminConnection: !adminError,
        contactTableExists: !connectionError,
        contactCount: connectionTest || 0
      },
      errors: {
        connectionError: connectionError?.message || null,
        adminError: adminError?.message || null
      }
    };
    
    console.log('Test results:', testResults);
    
    return NextResponse.json(testResults);
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      success: false,
      message: 'Unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}