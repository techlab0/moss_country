// メール1通の本文を読む（調査モードの詳細表示用）。
//
// 一覧（inspect）はスニペット（先頭200文字程度）しか返さないため、予約番号・予約日時・人数・
// お客様情報といった取込みに必要な項目がどの行にどう書かれているかが分からない。
// 取込みルールを決めるために、指定した1通だけ本文を取得する。
//
// このAPIも読み取り専用で、予約台帳へは一切書き込まない。

import { NextRequest, NextResponse } from 'next/server';
import { google, type gmail_v1 } from 'googleapis';
import { verifyAdminSession } from '@/lib/auth';
import { getAuthorizedGmailClient } from '@/lib/gmailOAuth';

/** 画面に出す上限。長大なHTMLメールでブラウザを固めないための保険 */
const MAX_BODY_LENGTH = 20000;

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

/** マルチパートを再帰的にたどって、指定のMIMEタイプの本文を探す */
function findPartBody(part: gmail_v1.Schema$MessagePart | undefined, mimeType: string): string | null {
  if (!part) return null;
  if (part.mimeType === mimeType && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  for (const sub of part.parts ?? []) {
    const found = findPartBody(sub, mimeType);
    if (found) return found;
  }
  return null;
}

/** HTMLしか無いメール向けの簡易テキスト化。整形の正確さより「項目が読めること」を優先する */
function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|table|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'メールIDが指定されていません' }, { status: 400 });
    }

    const auth = await getAuthorizedGmailClient();
    const gmail = google.gmail({ version: 'v1', auth });

    const detail = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
    const payload = detail.data.payload ?? undefined;
    const headers = payload?.headers ?? undefined;

    const plain = findPartBody(payload, 'text/plain');
    const html = plain ? null : findPartBody(payload, 'text/html');
    const body = plain ?? (html ? htmlToText(html) : '');

    return NextResponse.json({
      readOnly: true,
      id,
      from: getHeader(headers, 'From'),
      subject: getHeader(headers, 'Subject'),
      date: getHeader(headers, 'Date'),
      // 本文がHTMLしか無かった場合はタグを落として渡していることを画面に伝える
      format: plain ? 'text/plain' : html ? 'text/html（テキスト化）' : '不明',
      truncated: body.length > MAX_BODY_LENGTH,
      body: body.slice(0, MAX_BODY_LENGTH),
    });
  } catch (error) {
    console.error('Gmail message error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
