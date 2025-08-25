import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 400 });
    }

    // Square API呼び出しでトークンの権限を確認
    const response = await fetch('https://connect.squareupsandbox.com/v2/locations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-06-04',
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        error: 'Token validation failed',
        status: response.status,
        details: result,
      }, { status: response.status });
    }

    // Paymentsエンドポイントも試してみる
    const paymentsTest = await fetch('https://connect.squareupsandbox.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-06-04',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // 無効なリクエストを送信してエラー内容を確認
        source_id: 'test',
        idempotency_key: 'test',
        amount_money: { amount: 100, currency: 'JPY' },
      }),
    });

    const paymentsResult = await paymentsTest.json();

    return NextResponse.json({
      success: true,
      tokenValid: true,
      locations: result.locations?.length || 0,
      paymentsEndpointTest: {
        status: paymentsTest.status,
        error: paymentsResult.errors?.[0] || 'No error info',
      },
      tokenInfo: {
        environment: process.env.SQUARE_ENVIRONMENT,
        hasToken: !!accessToken,
        tokenPrefix: accessToken.substring(0, 10) + '...',
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}