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
    // 1人目の予約だけで定員いっぱいの枠全体が閉じてしまうため「予定なし」にする。
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

export interface CalendarEventSummary {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  /** 終日予定の場合は true。時刻は持たない */
  allDay: boolean;
  /** 終日予定は YYYY-MM-DD、時刻付きは RFC3339 */
  start: string;
  end: string;
}

/**
 * 指定期間のイベント一覧を取得する（管理画面の閲覧用）。
 *
 * freebusy（getBusyIntervals）は「予定あり」の時間帯しか返さず、
 * 予約自身は transparency: 'transparent' で登録しているため freebusy には現れない。
 * 実際の予定を見せるにはこちらのAPIを使う必要がある。
 *
 * 繰り返し予定は singleEvents で個々の予定に展開する（そのまま返すと
 * 繰り返しルールだけが1件返り、カレンダー上の見え方と食い違うため）。
 */
export async function listCalendarEvents(
  startISO: string,
  endISO: string,
  maxResults = 250
): Promise<CalendarEventSummary[]> {
  if (!isCalendarConfigured()) {
    throw new Error('Googleカレンダーが設定されていません');
  }

  const calendarId = requireCalendarId();
  const calendar = await getCalendarClient();

  const response = await calendar.events.list({
    calendarId,
    timeMin: startISO,
    timeMax: endISO,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults,
    timeZone: TIME_ZONE,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = response.data?.items ?? [];

  return items
    // キャンセル済みの予定はカレンダー上も表示されないので除外する
    .filter((item) => item.status !== 'cancelled')
    .map((item) => {
      const allDay = !!item.start?.date;
      return {
        id: String(item.id ?? ''),
        summary: item.summary ?? '(タイトルなし)',
        description: item.description ?? null,
        location: item.location ?? null,
        allDay,
        start: String(item.start?.dateTime ?? item.start?.date ?? ''),
        end: String(item.end?.dateTime ?? item.end?.date ?? ''),
      };
    })
    .filter((item) => item.id && item.start);
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
 * 既存イベントのタイトルと説明だけを差し替える（じゃらんの仮予約が確定したとき用）。
 *
 * 日時・人数は変わらないため patch で必要な項目だけを送る。
 * イベントが既に無い（404/410）場合は握りつぶす。カレンダーの表示は
 * 後から手動で直せる一方、ここで例外にすると予約側の確定処理まで巻き添えで
 * 失敗してしまうため。
 */
export async function updateBookingEventSummary(
  eventId: string,
  patch: { summary: string; description?: string }
): Promise<{ updated: boolean }> {
  if (!isCalendarConfigured()) {
    throw new Error('Googleカレンダーが未設定のため、イベントを更新できません');
  }

  const calendarId = requireCalendarId();

  try {
    const calendar = await getCalendarClient();
    await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: { summary: patch.summary, description: patch.description },
    });
    return { updated: true };
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.code ?? (error as any)?.response?.status;
    if (status === 404 || status === 410) {
      // イベントが消えている。呼び出し側が作り直せるよう、成功と区別して返す
      // （ここで例外にすると、台帳の更新まで巻き添えで失敗する）
      return { updated: false };
    }
    console.error('Googleカレンダーイベントの更新に失敗しました:', { eventId, error });
    throw error;
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
 * サービスアカウントが対象カレンダーに書き込めるかを実際に試す。
 *
 * 空き枠の取得（getBusyIntervals）は読み取り権限だけでも成功するため、
 * 「予定の閲覧権限」だけで共有されていると、空き表示は正常なのに
 * 予約時のカレンダー書き込みだけが失敗する。これを事前に検知するために使う。
 *
 * calendarList.get では判定できない。calendarList はサービスアカウント自身が
 * 一覧に追加したカレンダーしか返さず、共有されただけのカレンダーは
 * 権限があっても Not Found になるため。
 *
 * 実際に予定を作って即座に削除する。実運用の予約と衝突しないよう十分先の
 * 日時を使う。削除に失敗した場合はイベントIDを返し、手動で消せるようにする。
 */
export async function probeCalendarWriteAccess(): Promise<{
  canWrite: boolean;
  error?: string;
  leftoverEventId?: string;
}> {
  if (!isCalendarConfigured()) {
    return { canWrite: false, error: 'Googleカレンダーが設定されていません' };
  }

  const probeStart = new Date();
  probeStart.setFullYear(probeStart.getFullYear() + 10);
  probeStart.setHours(3, 0, 0, 0);
  const probeEnd = new Date(probeStart.getTime() + 60 * 1000);
  // GoogleカレンダーのイベントIDは base32hex（0-9 と a-v）しか使えない。
  // toString(36) は w-z を含み、'writeprobe' の w も範囲外で
  // 「Invalid resource id value.」になるため、radix 32 と a-v の文字だけで作る。
  const eventId = `probe${Date.now().toString(32)}${Math.random().toString(32).slice(2, 8)}`;

  let createdEventId: string;
  try {
    const result = await createBookingEvent({
      eventId,
      idempotencyKey: eventId,
      summary: '[書き込み確認] このイベントは自動で削除されます',
      description: '管理画面の診断機能が作成した一時的なイベントです。残っていた場合は削除して構いません。',
      startISO: probeStart.toISOString(),
      endISO: probeEnd.toISOString(),
    });
    createdEventId = result.eventId;
  } catch (error) {
    return {
      canWrite: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    await deleteBookingEvent(createdEventId);
    return { canWrite: true };
  } catch {
    // 作成できた時点で書き込み権限はある。削除だけ失敗した場合は手動削除用にIDを返す
    return { canWrite: true, leftoverEventId: createdEventId };
  }
}
