import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // 入力検証
    if (!password) {
      return NextResponse.json(
        { error: 'パスワードが必要です' },
        { status: 400 }
      );
    }

    // 設定ファイルからメンテナンスパスワードを取得
    const fs = require('fs');
    const path = require('path');
    
    let maintenancePassword = '';
    try {
      const settingsPath = path.join(process.cwd(), 'maintenance-settings.json');
      if (fs.existsSync(settingsPath)) {
        const data = fs.readFileSync(settingsPath, 'utf-8');
        const settings = JSON.parse(data);
        maintenancePassword = settings.password;
      }
    } catch (error) {
      console.error('Failed to read maintenance settings:', error);
    }
    
    if (!maintenancePassword) {
      return NextResponse.json(
        { error: 'メンテナンスパスワードが設定されていません' },
        { status: 500 }
      );
    }

    if (password !== maintenancePassword) {
      return NextResponse.json(
        { error: 'パスワードが正しくありません' },
        { status: 401 }
      );
    }

    // パスワードが正しい場合、認証クッキーを設定
    const response = NextResponse.json({ 
      success: true, 
      message: '認証に成功しました' 
    });

    // 24時間有効な認証クッキーを設定
    response.cookies.set('maintenance-access', 'allowed', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24時間
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Maintenance verification error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}