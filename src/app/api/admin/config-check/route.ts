import { NextResponse } from 'next/server';
import { validateProductionConfig } from '@/lib/config';

export async function GET() {
  try {
    const configStatus = validateProductionConfig();
    
    return NextResponse.json(configStatus);
  } catch (error) {
    console.error('Config check error:', error);
    return NextResponse.json(
      { error: 'Failed to check configuration' },
      { status: 500 }
    );
  }
}