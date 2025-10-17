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
      console.log('❌ セッショントークンなし');
      return null;
    }

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

    return { userId: user.id, email: user.email };
  } catch (error) {
    console.log('❌ 認証エラー:', error);
    return null;
  }
}

// Sanityのスラッグ生成関数
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // 特殊文字を除去
    .replace(/\s+/g, '-') // スペースをハイフンに
    .replace(/-+/g, '-') // 連続するハイフンを一つに
    .trim();
}

// GET: 苔データの一覧取得
export async function GET(request: NextRequest) {
  try {
    const user = await checkAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const query = `*[_type == "mossSpecies"] | order(publishedAt desc) {
      _id,
      name,
      slug,
      category,
      characteristics,
      practicalAdvice,
      // 古いフィールドも互換性のために取得
      practicalInfo,
      featured,
      isVisible,
      publishedAt,
      _createdAt,
      _updatedAt,
      "imageCount": count(images)
    }`;

    const mossSpecies = await client.fetch(query);

    await logAuditEvent(
      user.userId,
      user.email,
      'admin.access',
      'moss_guide_list_viewed',
      { count: mossSpecies.length },
      { severity: 'low' }
    );

    return NextResponse.json(mossSpecies);
  } catch (error) {
    console.error('Error fetching moss species:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moss species' },
      { status: 500 }
    );
  }
}

// POST: 新しい苔データの作成
export async function POST(request: NextRequest) {
  try {
    const user = await checkAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // スラッグを生成（カスタムスラッグがある場合はそれを使用）
    const slug = data.slug ? data.slug.trim() : generateSlug(data.name);

    // 同じスラッグが存在するかチェック
    const existingSlug = await client.fetch(
      `*[_type == "mossSpecies" && slug.current == $slug][0]`,
      { slug }
    );

    let finalSlug = slug;
    if (existingSlug) {
      const timestamp = Date.now();
      finalSlug = `${slug}-${timestamp}`;
    }

    // Sanityに保存するデータを構築
    const mossDoc = {
      _type: 'mossSpecies',
      name: data.name,
      commonNames: data.commonNames || [],
      slug: {
        _type: 'slug',
        current: finalSlug
      },
      description: data.description,
      images: data.images || [], // フロントエンドからの画像データ
      characteristics: data.characteristics,
      basicInfo: data.basicInfo,
      supplementaryInfo: data.supplementaryInfo,
      practicalAdvice: data.practicalAdvice,
      category: data.category,
      tags: data.tags || [],
      featured: data.featured || false,
      publishedAt: new Date().toISOString(),
      isVisible: data.isVisible !== false
    };

    // Sanityに作成
    const result = await writeClient.create(mossDoc);

    await logAuditEvent(
      user.userId,
      user.email,
      'admin.access',
      'moss_species_created',
      {
        name: data.name,
        category: data.category,
        slug: finalSlug
      },
      {
        resourceId: result._id,
        severity: 'medium'
      }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating moss species:', error);
    return NextResponse.json(
      { error: 'Failed to create moss species' },
      { status: 500 }
    );
  }
}