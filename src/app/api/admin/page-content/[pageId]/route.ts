import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/lib/sanity';
import { verifyAdminSession } from '@/lib/auth';
import { pageContentRegistry } from '@/lib/pageContentRegistry';

// 管理画面用: ページ文言・画像の上書き値の取得・保存。
// レジストリ（pageContentRegistry）に定義されたページ・キーのみ受け付ける。

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { pageId } = await params;
    if (!pageContentRegistry[pageId]) {
      return NextResponse.json({ error: 'ページが見つかりません' }, { status: 404 });
    }

    const doc = await writeClient.fetch(
      `*[_type == "pageContent" && _id == $id][0]{ texts[]{ key, value }, images[]{ key, image, alt } }`,
      { id: `pageContent-${pageId}` }
    );

    return NextResponse.json({ content: doc || null });
  } catch (error) {
    console.error('ページ文言取得エラー:', error);
    return NextResponse.json({ error: 'ページ文言の取得に失敗しました' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { pageId } = await params;
    const page = pageContentRegistry[pageId];
    if (!page) {
      return NextResponse.json({ error: 'ページが見つかりません' }, { status: 404 });
    }
    const validKeys = new Set(page.fields.map(f => f.key));

    const body = await request.json();
    const textsInput: Array<{ key?: string; value?: string }> = Array.isArray(body.texts) ? body.texts : [];
    const imagesInput: Array<{ key?: string; image?: object; alt?: string }> = Array.isArray(body.images) ? body.images : [];

    const texts = textsInput
      .filter(t => t.key && validKeys.has(t.key) && typeof t.value === 'string')
      .map(t => ({ _type: 'textOverride', _key: t.key as string, key: t.key, value: t.value }));

    const images = imagesInput
      .filter(img => img.key && validKeys.has(img.key) && img.image)
      .map(img => ({ _type: 'imageOverride', _key: img.key as string, key: img.key, image: img.image, alt: img.alt || '' }));

    const saved = await writeClient.createOrReplace({
      _id: `pageContent-${pageId}`,
      _type: 'pageContent',
      pageId,
      texts,
      images,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ content: saved });
  } catch (error) {
    console.error('ページ文言保存エラー:', error);
    return NextResponse.json({ error: 'ページ文言の保存に失敗しました' }, { status: 500 });
  }
}
