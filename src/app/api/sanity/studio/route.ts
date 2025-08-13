import { NextRequest, NextResponse } from 'next/server'

// Sanity Studio用のAPIルート
export async function GET(request: NextRequest) {
  // Sanity Studioへのリダイレクト
  return NextResponse.redirect(new URL('/admin', request.url))
}

export async function POST(request: NextRequest) {
  // POSTリクエストの処理
  try {
    const body = await request.json()
    return NextResponse.json({ success: true, data: body })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}