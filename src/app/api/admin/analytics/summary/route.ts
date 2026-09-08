import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { verifyAdminSession } from '@/lib/auth';
import { getSiteAnalyticsSummary } from '@/lib/siteAnalytics';

// 管理画面ダッシュボード用: GA4とSearch Consoleのサマリーを返す。
// アクセス解析は公開してよい情報ではないため、必ず管理者セッションを確認する。

export async function GET(request: NextRequest) {
  const session = await verifyAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  // 結果は30分キャッシュしているため、GoogleやVercel側の設定を変えた直後は
  // 古い「未連携」の結果が返り続ける。?refresh=1 でキャッシュを破棄して取り直せるようにする。
  if (request.nextUrl.searchParams.get('refresh') === '1') {
    revalidateTag('site-analytics');
  }

  // 個々のサービスの失敗は summary の中で status として表現されるため、
  // ここまで例外が来るのは想定外の不具合だけ。
  try {
    const summary = await getSiteAnalyticsSummary();
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('アクセス解析サマリーの取得エラー:', error);
    return NextResponse.json({ error: 'アクセス解析の取得に失敗しました' }, { status: 500 });
  }
}
