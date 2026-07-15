import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { generateProductSlug, resolveUniqueSlug } from '@/lib/slugUtils';

// slug未設定（空または「-」）の商品を一括修復する
export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const targets: { _id: string; name: string }[] = await writeClient.fetch(
      `*[_type == "product" && (!defined(slug.current) || slug.current in ["-", ""])]{_id, name}`
    );

    const repaired: { _id: string; name: string; slug: string }[] = [];

    // 同一実行内での衝突も避けるため直列で処理する
    for (const target of targets) {
      const baseSlug = generateProductSlug(String(target.name || ''));

      const isSlugTaken = async (candidate: string) => {
        const existingId = await writeClient.fetch(
          `*[_type == "product" && slug.current == $slug && _id != $id][0]._id`,
          { slug: candidate, id: target._id }
        );
        return Boolean(existingId);
      };
      const uniqueSlug = await resolveUniqueSlug(baseSlug, isSlugTaken);

      await writeClient
        .patch(target._id)
        .set({
          slug: { _type: 'slug', current: uniqueSlug },
          _updatedAt: new Date().toISOString(),
        })
        .commit();

      repaired.push({ _id: target._id, name: target.name, slug: uniqueSlug });
    }

    return NextResponse.json({ repaired, count: repaired.length });
  } catch (error) {
    console.error('スラッグ修復エラー:', error);
    return NextResponse.json(
      { error: 'スラッグの修復に失敗しました' },
      { status: 500 }
    );
  }
}
