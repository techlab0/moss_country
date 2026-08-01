// Googleカレンダー連携（ワークショップ予約の空き制御用）。
// 認証はGoogleスプレッドシート連携（src/lib/googleSheets.ts の getSheetsClient）と同じ
// サービスアカウントJWTを使うが、scopeに https://www.googleapis.com/auth/calendar を使う点が異なる。
// 対象カレンダーは GOOGLE_CALENDAR_ID で指定し、サービスアカウントに編集権限で共有しておくこと。
//
// 重要（安全側の設計）: getBusyIntervals は失敗時に空配列を返さず、必ず例外を投げる。
// 「カレンダーを確認できないのに空いている扱いにする」のはダブルブッキングに直結するため、
// 呼び出し側（空き枠API・予約作成API）は必ずこの例外をキャッチして、予約不可（503等）として
// 扱うこと。空配列を返してしまうと fail-open（安全とは逆側）になってしまう。

const TIME_ZONE = 'Asia/Tokyo';

export interface BusyInterval {
  start: string;
  end: string;
}

export interface CreateBookingEventInput {
  /** 再送時にも同じGoogleイベントを指す決定的なID */
  eventId: string;
  idempotencyKey: string;
  summary: string;
  description?: string;
  /** RFC3339形式（例: 2026-08-01T10:00:00+09:00） */
  startISO: string;
  /** RFC3339形式（例: 2026-08-01T12:00:00+09:00） */
  endISO: string;
}

export function buildBookingEventRequest(input: CreateBookingEventInput) {
  return {
    id: input.eventId,
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.startISO, timeZone: TIME_ZONE },
    end: { dateTime: input.endISO, timeZone: TIME_ZONE },
    // 予約人数はSupabaseで管理する。予約自身をfreebusyへ含めると、
    // 1人目の予約だけで定員4名の枠全体が閉じてしまうため「予定なし」にする。
    transparency: 'transparent',
    visibility: 'private',
    extendedProperties: {
      private: {
        mossCountryType: 'workshopBooking',
        idempotencyKey: input.idempotencyKey,
      },
    },
  };
}

/**
 * カレンダー連携に必要な環境変数が揃っているかどうか。
 * サービスアカウントはGoogleスプレッドシート連携と共用のため、
 * ここではカレンダー固有の GOOGLE_CALENDAR_ID も含めて3つとも必須とする。
 */
export function isCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
    process.env.GOOGLE_CALENDAR_ID
  );
}

function requireCalendarId(): string {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) {
    throw new Error('GOOGLE_CALENDAR_ID が設定されていません');
  }
  return calendarId;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCalendarClient(): Promise<any> {
  const { google } = await import('googleapis');
  const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return google.calendar({ version: 'v3', auth });
}

/**
 * 指定期間（RFC3339のISO文字列）における対象カレンダーのbusy（予定あり）時間帯を取得する。
 *
 * 未設定・API呼び出し失敗のいずれの場合も、空配列を返さずに例外を投げる。
 * 呼び出し側で「空いていない可能性がある」として扱ってもらうための意図的な設計。
 */
export async function getBusyIntervals(startISO: string, endISO: string): Promise<BusyInterval[]> {
  if (!isCalendarConfigured()) {
    throw new Error(
      'Googleカレンダーが設定されていません（GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_CALENDAR_ID を確認してください）'
    );
  }

  const calendarId = requireCalendarId();

  try {
    const calendar = await getCalendarClient();
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startISO,
        timeMax: endISO,
        timeZone: TIME_ZONE,
        items: [{ id: calendarId }],
      },
    });

    const calendars = response.data?.calendars || {};
    const targetCalendar = calendars[calendarId];

    if (targetCalendar?.errors && targetCalendar.errors.length > 0) {
      throw new Error(
        `Googleカレンダーのfreebusy取得でエラーが返されました: ${JSON.stringify(targetCalendar.errors)}`
      );
    }

    const busy = targetCalendar?.busy || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return busy.map((b: any) => ({ start: b.start as string, end: b.end as string }));
  } catch (error) {
    console.error('Googleカレンダーのfreebusy取得に失敗しました:', error);
    throw error instanceof Error ? error : new Error('Googleカレンダーの空き状況取得に失敗しました');
  }
}

/**
 * ワークショップ予約のGoogleカレンダーイベントを作成する。
 * イベント作成に失敗した場合は例外を投げる（呼び出し側は予約を確定させないこと。
 * カレンダーに載らない予約はダブルブッキングの元になるため）。
 */
export async function createBookingEvent(
  input: CreateBookingEventInput
): Promise<{ eventId: string; created: boolean }> {
  if (!isCalendarConfigured()) {
    throw new Error(
      'Googleカレンダーが設定されていません（GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_CALENDAR_ID を確認してください）'
    );
  }

  const calendarId = requireCalendarId();

  try {
    const calendar = await getCalendarClient();
    const response = await calendar.events.insert({
      calendarId,
      requestBody: buildBookingEventRequest(input),
    });

    const eventId = response.data?.id;
    if (!eventId) {
      throw new Error('Googleカレンダーへのイベント作成でイベントIDが返却されませんでした');
    }
    return { eventId, created: true };
  } catch (error) {
    // 決定的なevent.idを使うため、再送時の409は既に同じイベントがある正常系。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.code ?? (error as any)?.response?.status;
    if (status === 409) {
      return { eventId: input.eventId, created: false };
    }
    console.error('Googleカレンダーへのイベント作成に失敗しました:', error);
    throw error instanceof Error ? error : new Error('Googleカレンダーへのイベント作成に失敗しました');
  }
}

/**
 * ワークショップ予約のGoogleカレンダーイベントを削除する（キャンセル用）。
 * 既に削除済み・存在しない（404/410）場合は握りつぶす。
 * それ以外の失敗は例外を投げる。呼び出し側がDBのgoogle_event_idを保持したまま
 * 再試行できるようにし、Google側だけに孤立イベントが残る状態を防ぐ。
 */
export async function deleteBookingEvent(eventId: string): Promise<void> {
  if (!isCalendarConfigured()) {
    throw new Error('Googleカレンダーが未設定のため、イベントを削除できません');
  }

  const calendarId = requireCalendarId();

  try {
    const calendar = await getCalendarClient();
    await calendar.events.delete({ calendarId, eventId });
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.code ?? (error as any)?.response?.status;
    if (status === 404 || status === 410) {
      return;
    }
    console.error('Googleカレンダーイベントの削除に失敗しました:', { eventId, error });
    throw error;
  }
}

/**
 * サービスアカウントが対象カレンダーに持つ権限を調べる。
 *
 * 空き枠の取得（getBusyIntervals）は読み取り権限だけでも成功するため、
 * 「空き表示は動くのに予約時のカレンダー書き込みだけ失敗する」状態を見逃しやすい。
 * 実際に書き込まずに権限だけを確認できるよう、calendarList から accessRole を読む。
 *
 * accessRole は 'owner' | 'writer' | 'reader' | 'freeBusyReader' のいずれか。
 * 予約イベントの作成・削除には writer 以上が必要。
 */
export async function getCalendarAccessRole(): Promise<{
  accessRole: string;
  canWrite: boolean;
  summary?: string;
}> {
  if (!isCalendarConfigured()) {
    throw new Error(
      'Googleカレンダーが設定されていません（GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_CALENDAR_ID を確認してください）'
    );
  }

  const calendar = await getCalendarClient();
  const response = await calendar.calendarList.get({ calendarId: requireCalendarId() });
  const accessRole: string = response.data?.accessRole ?? 'unknown';

  return {
    accessRole,
    canWrite: accessRole === 'owner' || accessRole === 'writer',
    summary: response.data?.summary,
  };
}
