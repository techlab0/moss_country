import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { logAuditEvent } from '@/lib/auditLog';
import { verifyJWT } from '@/lib/auth';
import { findUserById } from '@/lib/userManager';

// 認証チェック関数
async function checkAuth(request: NextRequest) {
  try {
    const token = request.cookies.get('admin-session')?.value;
    if (!token) {
      console.log('❌ セッショントークンなし');
      return null;
    }

    console.log('🔑 トークン検証中...');
    const payload = await verifyJWT(token);
    if (!payload) {
      console.log('❌ 無効なトークン');
      return null;
    }

    const user = await findUserById(payload.userId as string);
    if (!user) {
      console.log('❌ ユーザーが見つからない');
      return null;
    }

    console.log('✅ 認証成功:', user.email);
    return { userId: user.id, email: user.email };
  } catch (error) {
    console.log('❌ 認証エラー:', error);
    return null;
  }
}

// POST: 画像アップロード
export async function POST(request: NextRequest) {
  console.log('🖼️ 画像アップロード開始');
  
  try {
    const user = await checkAuth(request);
    if (!user) {
      console.log('❌ 認証失敗');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ 認証成功:', user.email);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caption = formData.get('caption') as string || '';

    console.log('📁 ファイル情報:', { 
      name: file?.name, 
      size: file?.size, 
      type: file?.type,
      caption 
    });

    if (!file) {
      console.log('❌ ファイルなし');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // ファイルサイズチェック (2MB制限に変更)
    if (file.size > 2 * 1024 * 1024) {
      console.log('❌ ファイルサイズ制限超過:', file.size);
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });
    }

    // ファイルタイプチェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      console.log('❌ 無効なファイルタイプ:', file.type);
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' },
        { status: 400 }
      );
    }

    console.log('✅ ファイル検証完了');

    // ファイルをBufferに変換
    console.log('🔄 Buffer変換中...');
    const buffer = await file.arrayBuffer();

    // Sanityに画像をアップロード
    console.log('🚀 Sanityアップロード開始...');
    
    // タイムアウト付きでアップロード
    const uploadPromise = writeClient.assets.upload('image', Buffer.from(buffer), {
      filename: file.name,
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000);
    });
    
    const imageAsset = await Promise.race([uploadPromise, timeoutPromise]);

    console.log('✅ Sanityアップロード完了:', imageAsset._id);

    await logAuditEvent(
      user.userId,
      user.email,
      'admin.access', // 既存のアクションタイプを使用
      'moss_image_upload',
      {
        filename: file.name,
        fileSize: file.size,
        fileType: file.type,
        assetId: imageAsset._id
      },
      {
        resourceId: imageAsset._id,
        severity: 'low'
      }
    );

    // 画像オブジェクトを返す（Sanityの形式に合わせる）
    const imageObject = {
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: imageAsset._id
      },
      caption: caption || undefined,
      alt: caption || file.name
    };

    return NextResponse.json({
      success: true,
      image: imageObject,
      asset: imageAsset
    });

  } catch (error) {
    console.error('❌ 画像アップロードエラー:', error);
    console.error('エラー詳細:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return NextResponse.json(
      { error: 'Failed to upload image', details: error.message },
      { status: 500 }
    );
  }
}