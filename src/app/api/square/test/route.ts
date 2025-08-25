import { NextResponse } from 'next/server'
import { getLocations } from '@/lib/square'

export async function GET() {
  try {
    console.log('Square API Test - Fetching locations...')
    
    // Square API接続テスト
    const locations = await getLocations()
    
    console.log('Square API Test Success:', locations.length, 'locations found')
    
    return NextResponse.json({
      success: true,
      message: 'Square API connection successful',
      data: {
        locationCount: locations.length,
        locations: locations.map((loc: { id: string; name: string; status: string; country: string }) => ({
          id: loc.id,
          name: loc.name,
          status: loc.status,
          country: loc.country,
        })),
        environment: process.env.SQUARE_ENVIRONMENT,
      }
    })
    
  } catch (error) {
    console.error('Square API Test Failed:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Square API connection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        environment: process.env.SQUARE_ENVIRONMENT,
      },
      { status: 500 }
    )
  }
}