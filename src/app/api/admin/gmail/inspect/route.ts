// メール調査モード。
//
// このAPIは「読むだけ」で、予約台帳（workshop_bookings）へは一切書き込まない。
// 目的は、activityboard.jpから届くメールの送信元・件名の種類・予約番号の形式を把握して、
// 自動取込みのルールを決められる状態にすること。取込みの実装はこの調査結果を見てから行う。
//
// 本文全体は取得しない（format: 'metadata'）。ヘッダーとGmailが返す短いスニペットだけを見る。

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { verifyAdminSession } from '@/lib/auth';
import { getAuthorizedGmailClient } from '@/lib/gmailOAuth';

/** 既定の検索条件。activityboard.jpからの予約通知メールを対象にする */
const DEFAULT_QUERY = 'from:activityboard.jp';
const DEFAULT_MAX = 20;
const HARD_MAX = 50;

function getHeader(headers: { name?: string | null; value?: string | null }[] | undefined, name: string): string {
  const hit = headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return hit?.value ?? '';
}

/**
 * 件名から「型」を取り出す。数字の並びや長い英数IDを記号に置き換えることで、
 * 「【仮予約】〜 #12345」と「【仮予約】〜 #67890」が同じ1種類として数えられる。
 */
function toSubjectPattern(subject: string): string {
  return subject
    .replace(/[0-9]{2,}/g, '＃')
    .replace(/\b[A-Za-z0-9]{8,}\b/g, '＊')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 予約番号らしい文字列の候補を拾う。形式が分からない段階なので、広めに拾って人間が判断する */
function findBookingNumberCandidates(text: string): string[] {
  const patterns = [
    /予約番号[：:]?\s*([A-Za-z0-9-]{4,})/g,
    /受付番号[：:]?\s*([A-Za-z0-9-]{4,})/g,
    /\b([A-Z]{2,}-?[0-9]{4,})\b/g,
    /\b([0-9]{6,})\b/g,
  ];
  const found = new Set<string>();
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      found.add(match[1]);
    }
  }
  return [...found];
}

function countBy(values: string[]): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const query = params.get('q')?.trim() || DEFAULT_QUERY;
    const requestedMax = Number(params.get('max'));
    const maxResults = Math.min(
      Number.isFinite(requestedMax) && requestedMax > 0 ? Math.floor(requestedMax) : DEFAULT_MAX,
      HARD_MAX
    );

    const auth = await getAuthorizedGmailClient();
    const gmail = google.gmail({ version: 'v1', auth });

    const list = await gmail.users.messages.list({ userId: 'me', q: query, maxResults });
    const ids = (list.data.messages ?? []).map((m) => m.id).filter((id): id is string => !!id);

    const messages = await Promise.all(
      ids.map(async (id) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date', 'To'],
        });
        const headers = detail.data.payload?.headers ?? undefined;
        const subject = getHeader(headers, 'Subject');
        const snippet = detail.data.snippet ?? '';
        return {
          id,
          from: getHeader(headers, 'From'),
          to: getHeader(headers, 'To'),
          subject,
          date: getHeader(headers, 'Date'),
          internalDate: detail.data.internalDate
            ? new Date(Number(detail.data.internalDate)).toISOString()
            : null,
          snippet,
          subjectPattern: toSubjectPattern(subject),
          bookingNumberCandidates: findBookingNumberCandidates(`${subject} ${snippet}`),
        };
      })
    );

    // 新しい順に並べる（Gmailの返却順に依存しないよう明示的にソートする）
    messages.sort((a, b) => (b.internalDate ?? '').localeCompare(a.internalDate ?? ''));

    return NextResponse.json({
      readOnly: true,
      query,
      fetched: messages.length,
      // Gmailが返す概算件数。正確な総数ではない
      totalEstimate: list.data.resultSizeEstimate ?? null,
      senders: countBy(messages.map((m) => m.from)),
      subjectPatterns: countBy(messages.map((m) => m.subjectPattern)),
      bookingNumberSamples: countBy(messages.flatMap((m) => m.bookingNumberCandidates)),
      messages,
    });
  } catch (error) {
    console.error('Gmail inspect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
