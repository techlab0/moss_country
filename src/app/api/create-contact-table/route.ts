import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('Creating contact_inquiries table...');
    
    // Create table with all necessary fields
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS contact_inquiries (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          inquiry_type VARCHAR(50) NOT NULL,
          subject VARCHAR(200) NOT NULL,
          message TEXT CHECK (char_length(message) <= 1000) NOT NULL,
          ip_address VARCHAR(45),
          user_agent TEXT,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'resolved')),
          priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status ON contact_inquiries(status);
      CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON contact_inquiries(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_contact_inquiries_email ON contact_inquiries(email);
      
      -- Enable RLS
      ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;
      
      -- Create policies
      DROP POLICY IF EXISTS "Service role can access all contact inquiries" ON contact_inquiries;
      CREATE POLICY "Service role can access all contact inquiries" ON contact_inquiries
          FOR ALL USING (auth.role() = 'service_role');
      
      DROP POLICY IF EXISTS "Allow anonymous users to insert contact inquiries" ON contact_inquiries;
      CREATE POLICY "Allow anonymous users to insert contact inquiries" ON contact_inquiries
          FOR INSERT WITH CHECK (true);
      
      -- Create or replace trigger function
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      -- Drop existing trigger if any
      DROP TRIGGER IF EXISTS update_contact_inquiries_updated_at ON contact_inquiries;
      
      -- Create trigger
      CREATE TRIGGER update_contact_inquiries_updated_at 
          BEFORE UPDATE ON contact_inquiries 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    const { data, error } = await supabaseAdmin.rpc('exec_sql', { 
      sql: createTableQuery 
    });

    if (error) {
      console.error('Error creating table with RPC:', error);
      
      // Fallback: Try creating table without advanced features
      const simpleTableQuery = `
        CREATE TABLE IF NOT EXISTS contact_inquiries (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(20),
            inquiry_type VARCHAR(50) NOT NULL,
            subject VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            ip_address VARCHAR(45),
            user_agent TEXT,
            status VARCHAR(20) DEFAULT 'pending',
            priority VARCHAR(10) DEFAULT 'medium',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      // Try direct SQL execution
      const { error: simpleError } = await supabaseAdmin
        .from('contact_inquiries')
        .select('count(*)', { count: 'exact', head: true });
        
      if (simpleError && simpleError.code === '42P01') {
        // Table doesn't exist, this is expected
        return NextResponse.json({
          success: false,
          message: 'Table creation requires manual setup',
          sqlScript: createTableQuery,
          instructions: 'Please run the provided SQL script in Supabase SQL Editor'
        });
      }
    }

    // Test table access
    const { data: testData, error: testError } = await supabaseAdmin
      .from('contact_inquiries')
      .select('count(*)', { count: 'exact', head: true });

    if (testError) {
      return NextResponse.json({
        success: false,
        message: 'Table exists but access failed',
        error: testError.message,
        sqlScript: createTableQuery
      });
    }

    return NextResponse.json({
      success: true,
      message: 'contact_inquiries table is ready',
      tableAccess: true
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      success: false,
      message: 'Unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}