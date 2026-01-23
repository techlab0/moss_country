import { NextRequest, NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
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

// GET: 背景画像設定を取得
export async function GET() {
  try {
    const settings = await client.fetch(`
      *[_type == "backgroundImageSettings"][0] {
        _id,
        main {
          image,
          imageMobile,
          alt
        },
        products {
          image,
          imageMobile,
          alt
        },
        workshop {
          image,
          imageMobile,
          alt
        },
        story {
          image,
          imageMobile,
          alt
        },
        store {
          image,
          imageMobile,
          alt
        },
        mossGuide {
          image,
          imageMobile,
          alt
        },
        blog {
          image,
          imageMobile,
          alt
        },
        contact {
          image,
          imageMobile,
          alt
        },
        updatedAt
      }
    `);

    return NextResponse.json(settings || null);
  } catch (error) {
    console.error('Failed to fetch background image settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch background image settings' },
      { status: 500 }
    );
  }
}

// PUT: 背景画像設定を更新
export async function PUT(request: NextRequest) {
  try {
    const user = await checkAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // 既存の設定を検索
    const existing = await client.fetch(`*[_type == "backgroundImageSettings"][0]._id`);

    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    let result;
    if (existing) {
      // 既存の設定を更新
      result = await writeClient
        .patch(existing)
        .set(updateData)
        .commit();
    } else {
      // 新しい設定を作成
      result = await writeClient.create({
        _type: 'backgroundImageSettings',
        ...updateData
      });
    }

    await logAuditEvent(
      user.userId,
      user.email,
      'admin.access',
      'background_image_settings_updated',
      {
        changes: Object.keys(data)
      },
      {
        resourceId: result._id,
        severity: 'low'
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to update background image settings:', error);
    return NextResponse.json(
      { error: 'Failed to update background image settings' },
      { status: 500 }
    );
  }
}
