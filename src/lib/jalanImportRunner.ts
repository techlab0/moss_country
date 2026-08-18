// じゃらん予約メールの取込みを実行する。
//
// 判断ロジックは jalanImport.ts（DBに触らない純粋関数・テスト済み）にあり、
// ここはGmailからの取得・DBへの反映・Googleカレンダーへの反映という副作用側だけを持つ。
//
// 必ず「試し実行（dryRun）」を用意している。過去メールが200件以上あり、
// いきなり台帳へ流し込むと取り返しがつかないため、まず何が起きるかを見せる。

import { google } from 'googleapis';
import { getAuthorizedGmailClient } from '@/lib/gmailOAuth';
import {
  parseJalanBookingMail,
  resolveJalanMailKind,
  JalanMailParseError,
  type JalanBooking,
} from '@/lib/jalanBookingMail';
import {
  planImportAction,
  applyActionToView,
  buildJalanBookingNumber,
  buildJalanIdempotencyKey,
  buildPlanName,
  buildNotes,
  type ImportAction,
  type ExistingBookingView,
} from '@/lib/jalanImport';
import {
  reserveBookingSlot,
  cancelBooking,
  getBookingByIdempotencyKey,
  updateBookingGoogleEvent,
  updateBookingPlanName,
  WorkshopSlotCapacityError,
} from '@/lib/workshopBookings';
import {
  WORKSHOP_SLOTS,
  CAPACITY_PER_SLOT,
  todayJstDateStr,
  jstDateTimeToIso,
} from '@/lib/workshopBookingConfig';
import { buildGoogleBookingEventId } from '@/lib/workshopBookingSafety';
import { createBookingEvent, deleteBookingEvent, isCalendarConfigured } from '@/lib/googleCalendar';

/** 取込み対象の3種類だけを取りに行く。他の通知（メッセージ受信・プラン延長等）は最初から除外する */
const IMPORT_QUERY =
  '(from:reservation@activityboard.jp OR from:reservation_request@activityboard.jp OR from:reservation_cancel@activityboard.jp)';

/** 既定で何日前までのメールを見るか。予約可能期間（ADVANCE_DAYS=60日）より広めに取る */
const DEFAULT_SINCE_DAYS = 90;
const DEFAULT_MAX_MESSAGES = 100;
const HARD_MAX_MESSAGES = 300;

export interface ImportItemResult {
  messageId: string;
  /** 解析できた場合のじゃらん予約番号 */
  bookingNumber: string | null;
  date: string | null;
  startTime: string | null;
  partySize: number | null;
  customerName: string | null;
  kind: JalanBooking['kind'] | null;
  /** 実行した（またはdryRunで実行予定の）操作 */
  action: ImportAction['type'];
  /** 台帳に登録する予約番号（JALAN-...） */
  ledgerBookingNumber: string | null;
  /** skipや失敗の理由。成功時は null */
  reason: string | null;
  /** dryRunでは常に false。実際に台帳を変更したかどうか */
  applied: boolean;
}

export interface ImportSummary {
  dryRun: boolean;
  query: string;
  scanned: number;
  created: number;
  confirmed: number;
  cancelled: number;
  skipped: number;
  failed: number;
  items: ImportItemResult[];
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function findPartBody(
  part: { mimeType?: string | null; body?: { data?: string | null } | null; parts?: unknown[] } | undefined,
  mimeType: string
): string | null {
  if (!part) return null;
  if (part.mimeType === mimeType && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  for (const sub of (part.parts ?? []) as typeof part[]) {
    const found = findPartBody(sub, mimeType);
    if (found) return found;
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|table|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function getHeader(
  headers: { name?: string | null; value?: string | null }[] | undefined,
  name: string
): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}

export interface RunImportOptions {
  dryRun: boolean;
  sinceDays?: number;
  maxMessages?: number;
}

/**
 * Gmailを読み、予約台帳へ反映する。
 *
 * 1通ごとに独立して処理し、1通の失敗で全体を止めない。失敗した通は理由付きで
 * 結果に含め、管理画面に表示して人が判断できるようにする。
 */
export async function runJalanImport(options: RunImportOptions): Promise<ImportSummary> {
  const sinceDays = Math.max(1, Math.min(options.sinceDays ?? DEFAULT_SINCE_DAYS, 365));
  const maxMessages = Math.max(1, Math.min(options.maxMessages ?? DEFAULT_MAX_MESSAGES, HARD_MAX_MESSAGES));
  const query = `${IMPORT_QUERY} newer_than:${sinceDays}d`;

  const auth = await getAuthorizedGmailClient();
  const gmail = google.gmail({ version: 'v1', auth });

  const list = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: maxMessages });
  const ids = (list.data.messages ?? []).map((m) => m.id).filter((id): id is string => !!id);

  // 仮予約→確定→キャンセルの順に処理しないと、確定を先に見て「登録済み」と誤判定する。
  // Gmailは新しい順に返すため、受信時刻の昇順へ並べ替えてから反映する。
  const fetched = await Promise.all(
    ids.map(async (id) => {
      const detail = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
      return {
        id,
        internalDate: Number(detail.data.internalDate ?? 0),
        from: getHeader(detail.data.payload?.headers ?? undefined, 'From'),
        payload: detail.data.payload ?? undefined,
      };
    })
  );
  fetched.sort((a, b) => a.internalDate - b.internalDate);

  const todayJst = todayJstDateStr();
  const slotConfig = { slots: WORKSHOP_SLOTS, capacityPerSlot: CAPACITY_PER_SLOT };
  const items: ImportItemResult[] = [];

  // 試し実行はDBに書かないため、この実行の中で行った操作を自分で覚えておく必要がある。
  // 1件の予約につき仮予約と確定の2通が届くので、これが無いと2通目も「台帳に無い」と
  // 判断され、同じ予約が「新規登録」2件として表示されてしまう。
  // 本番反映では実際にDBが更新されるため、毎回DBを引き直せば正しい状態が得られる。
  const dryRunView = new Map<string, ExistingBookingView | null>();

  for (const message of fetched) {
    // 対象外の送信元（検索条件をユーザーが変えた場合など）は結果にも載せず読み飛ばす
    if (!resolveJalanMailKind(message.from)) continue;

    const base: ImportItemResult = {
      messageId: message.id,
      bookingNumber: null,
      date: null,
      startTime: null,
      partySize: null,
      customerName: null,
      kind: null,
      action: 'skip',
      ledgerBookingNumber: null,
      reason: null,
      applied: false,
    };

    let mail: JalanBooking;
    try {
      const plain = findPartBody(message.payload, 'text/plain');
      const html = plain ? null : findPartBody(message.payload, 'text/html');
      const body = plain ?? (html ? stripHtml(html) : '');
      mail = parseJalanBookingMail(message.from, body);
    } catch (error) {
      items.push({
        ...base,
        reason:
          error instanceof JalanMailParseError
            ? `解析できませんでした: ${error.message}`
            : '解析中にエラーが発生しました',
      });
      continue;
    }

    const idempotencyKey = buildJalanIdempotencyKey(mail.bookingNumber);
    const ledgerBookingNumber = buildJalanBookingNumber(mail.bookingNumber);
    const detail: ImportItemResult = {
      ...base,
      bookingNumber: mail.bookingNumber,
      date: mail.date,
      startTime: mail.startTime,
      partySize: mail.partySize,
      customerName: mail.customerName,
      kind: mail.kind,
      ledgerBookingNumber,
    };

    try {
      // 試し実行でこの実行中に「登録した」ことになっている予約は、DBには存在しない。
      // 判断には仮の見え方（view）を使い、実際の更新には必ずDBから取った予約（stored）を使う。
      const useDryRunView = options.dryRun && dryRunView.has(idempotencyKey);
      const stored = useDryRunView ? null : await getBookingByIdempotencyKey(idempotencyKey);
      const existing: ExistingBookingView | null = useDryRunView
        ? dryRunView.get(idempotencyKey)!
        : stored;

      const action = planImportAction(mail, existing, todayJst, slotConfig);

      if (options.dryRun) {
        dryRunView.set(idempotencyKey, applyActionToView(existing, mail, action));
      }

      if (action.type === 'skip') {
        items.push({ ...detail, action: 'skip', reason: action.reason });
        continue;
      }

      if (options.dryRun) {
        items.push({ ...detail, action: action.type, applied: false });
        continue;
      }

      if (action.type === 'create') {
        const slot = WORKSHOP_SLOTS.find((s) => s.start === mail.startTime)!;
        const reservation = await reserveBookingSlot({
          bookingNumber: ledgerBookingNumber,
          workshopPlanName: buildPlanName(mail, action.tentative),
          date: mail.date,
          startTime: mail.startTime,
          endTime: slot.end,
          partySize: mail.partySize,
          customerName: mail.customerName || null,
          customerEmail: mail.customerEmail || null,
          customerPhone: mail.customerPhone || null,
          // 当日レジで受け取るため、予約側では売上に計上しない
          paymentMethod: 'on_site',
          paymentStatus: 'pending',
          total: mail.totalYen,
          notes: buildNotes(mail),
          idempotencyKey,
        });

        // カレンダーは店舗の予定確認用。失敗しても予約は成立させる（後から手動で追加できる）
        if (isCalendarConfigured()) {
          try {
            const event = await createBookingEvent({
              eventId: buildGoogleBookingEventId(idempotencyKey),
              idempotencyKey,
              summary: `WS予約(じゃらん${action.tentative ? '仮' : ''}): ${mail.customerName} / ${mail.partySize}名`,
              description: buildNotes(mail),
              startISO: jstDateTimeToIso(mail.date, slot.start),
              endISO: jstDateTimeToIso(mail.date, slot.end),
            });
            await updateBookingGoogleEvent(reservation.booking.id, event.eventId);
          } catch (calendarError) {
            console.error('じゃらん取込み: カレンダー登録に失敗（予約は登録済み）', {
              bookingNumber: ledgerBookingNumber,
              error: calendarError,
            });
          }
        }

        items.push({ ...detail, action: 'create', applied: true });
        continue;
      }

      if (action.type === 'confirm') {
        await updateBookingPlanName(stored!.id, buildPlanName(mail, false));
        items.push({ ...detail, action: 'confirm', applied: true });
        continue;
      }

      // action.type === 'cancel'
      if (stored!.googleEventId && isCalendarConfigured()) {
        try {
          await deleteBookingEvent(stored!.googleEventId);
        } catch (calendarError) {
          console.error('じゃらん取込み: カレンダー削除に失敗（予約はキャンセル済み）', {
            bookingNumber: ledgerBookingNumber,
            error: calendarError,
          });
        }
      }
      await cancelBooking(stored!.id, { googleEventId: null });
      items.push({ ...detail, action: 'cancel', applied: true });
    } catch (error) {
      // 枠が満杯で入らないケース。じゃらん側は自社サイトの空きを知らないので起こりうる。
      // 自動では解決できないため、理由を出して人に判断させる。
      const reason =
        error instanceof WorkshopSlotCapacityError
          ? 'この枠に空きがありません。手動での調整が必要です'
          : `取込みに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`;
      console.error('じゃらん取込みエラー:', { bookingNumber: mail.bookingNumber, error });
      items.push({ ...detail, action: 'skip', reason });
    }
  }

  const count = (type: ImportAction['type']) =>
    items.filter((item) => item.action === type && (options.dryRun || item.applied)).length;

  return {
    dryRun: options.dryRun,
    query,
    scanned: items.length,
    created: count('create'),
    confirmed: count('confirm'),
    cancelled: count('cancel'),
    skipped: items.filter((item) => item.action === 'skip' && item.bookingNumber !== null).length,
    failed: items.filter((item) => item.bookingNumber === null).length,
    items,
  };
}
