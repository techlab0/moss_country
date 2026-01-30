import { NextRequest, NextResponse } from 'next/server';
import { writeClient, urlFor } from '@/lib/sanity';
import { logAuditEvent } from '@/lib/auditLog';
import { verifyJWT } from '@/lib/auth';
import { findUserById } from '@/lib/userManager';

// 認証チェック関数
async function checkAuth(request: NextRequest) {
  try {
    const token = request.cookies.get('admin-session')?.value;
    if (!token) {
      return null;
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return null;
    }

    const user = await findUserById(payload.userId as string);
    if (!user) {
      return null;
    }

    return { userId: user.id, email: user.email };
  } catch (error) {
    return null;
  }
}

// POST: 画像アップロード
export async function POST(request: NextRequest) {
  try {
    const user = await checkAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // ファイルサイズチェック (5MB制限)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    // ファイルタイプチェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' },
        { status: 400 }
      );
    }

    // ファイルをBufferに変換
    const buffer = await file.arrayBuffer();

    // Sanityに画像をアップロード
    const uploadPromise = writeClient.assets.upload('image', Buffer.from(buffer), {
      filename: file.name,
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000);
    });
    
    const imageAsset = await Promise.race([uploadPromise, timeoutPromise]);

    await logAuditEvent(
      user.userId,
      user.email,
      'admin.access',
      'image_upload',
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

    // 画像オブジェクトを返す（Sanityの形式に合わせる。_key は配列用に必須）
    const _key = (imageAsset as { _id?: string })._id?.replace(/^image-/, '').slice(0, 8) || `img-${Date.now().toString(36)}`;
    const imageObject = {
      _type: 'image',
      _key,
      asset: {
        _type: 'reference',
        _ref: imageAsset._id
      }
    };

    // サムネイル表示用URL（150x150）
    const thumbnailUrl = urlFor({ _type: 'image', asset: { _ref: imageAsset._id } } as Parameters<typeof urlFor>[0])
      .width(150)
      .height(150)
      .url();

    return NextResponse.json({
      success: true,
      image: imageObject,
      asset: imageAsset,
      thumbnailUrl
    });

  } catch (error) {
    console.error('画像アップロードエラー:', error);
    return NextResponse.json(
      { error: 'Failed to upload image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
