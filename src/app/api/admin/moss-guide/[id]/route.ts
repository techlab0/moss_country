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

// GET: 単一の苔データを取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const user = await checkAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const query = `*[_type == "mossSpecies" && _id == $id][0] {
      _id,
      name,
      commonNames,
      slug,
      description,
      images,
      characteristics,
      basicInfo,
      supplementaryInfo,
      practicalAdvice,
      // 古いフィールドも互換性のために取得
      terrariumSuitability,
      hokkaidoInfo,
      practicalInfo,
      category,
      tags,
      featured,
      publishedAt,
      isVisible,
      _createdAt,
      _updatedAt
    }`;

    const mossSpecies = await client.fetch(query, { id: resolvedParams.id });

    if (!mossSpecies) {
      return NextResponse.json({ error: 'Moss species not found' }, { status: 404 });
    }

    await logAuditEvent(
      user.userId,
      user.email,
      'admin.access',
      'moss_species_viewed',
      { id: resolvedParams.id, name: mossSpecies.name },
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

// PUT: 苔データを更新
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const user = await checkAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // 既存データを取得
    const existingData = await client.fetch(
      `*[_type == "mossSpecies" && _id == $id][0]`,
      { id: resolvedParams.id }
    );

    if (!existingData) {
      return NextResponse.json({ error: 'Moss species not found' }, { status: 404 });
    }

    // スラッグ更新処理
    let finalSlug = existingData.slug.current;
    
    // カスタムスラッグが提供されている場合はそれを使用、なければ名前から生成
    const newSlug = data.slug ? data.slug.trim() : data.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // 特殊文字を除去
      .replace(/\s+/g, '-') // スペースをハイフンに
      .replace(/-+/g, '-') // 連続するハイフンを一つに
      .trim();
    
    // スラッグが変更された場合のみ更新処理
    if (newSlug !== existingData.slug.current) {

      // 同じスラッグが存在するかチェック（自分自身を除く）
      const existingSlug = await client.fetch(
        `*[_type == "mossSpecies" && slug.current == $slug && _id != $id][0]`,
        { slug: newSlug, id: resolvedParams.id }
      );

      if (existingSlug) {
        const timestamp = Date.now();
        finalSlug = `${newSlug}-${timestamp}`;
      } else {
        finalSlug = newSlug;
      }
    }

    // 更新データを構築
    const updateData = {
      name: data.name,
      commonNames: data.commonNames || [],
      slug: {
        _type: 'slug',
        current: finalSlug
      },
      description: data.description,
      images: data.images || [],
      characteristics: data.characteristics,
      basicInfo: data.basicInfo,
      supplementaryInfo: data.supplementaryInfo,
      practicalAdvice: data.practicalAdvice,
      category: data.category,
      tags: data.tags || [],
      featured: data.featured || false,
      isVisible: data.isVisible !== false
    };

    // Sanityで更新
    const result = await writeClient
      .patch(resolvedParams.id)
      .set(updateData)
      .commit();

    await logAuditEvent(
      user.userId,
      user.email,
      'admin.access',
      'moss_species_updated',
      {
        id: resolvedParams.id,
        name: data.name,
        category: data.category,
        slug: finalSlug,
        changes: Object.keys(updateData)
      },
      {
        resourceId: resolvedParams.id,
        severity: 'medium'
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating moss species:', error);
    return NextResponse.json(
      { error: 'Failed to update moss species' },
      { status: 500 }
    );
  }
}

// DELETE: 苔データを削除
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const user = await checkAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 削除前にデータを取得（監査ログ用）
    const existingData = await client.fetch(
      `*[_type == "mossSpecies" && _id == $id][0] { name, category }`,
      { id: resolvedParams.id }
    );

    if (!existingData) {
      return NextResponse.json({ error: 'Moss species not found' }, { status: 404 });
    }

    // Sanityから削除
    await writeClient.delete(resolvedParams.id);

    await logAuditEvent(
      user.userId,
      user.email,
      'admin.access',
      'moss_species_deleted',
      {
        id: resolvedParams.id,
        name: existingData.name,
        category: existingData.category
      },
      {
        resourceId: resolvedParams.id,
        severity: 'high'
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting moss species:', error);
    return NextResponse.json(
      { error: 'Failed to delete moss species' },
      { status: 500 }
    );
  }
}