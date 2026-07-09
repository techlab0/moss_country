// カレンダーの1項目。1日に複数の項目（営業＋イベント、複数イベント等）を持てる。
export interface CalendarItem {
  id?: string; // Supabase行のid。新規追加時は未指定、既存の更新・削除時に必須
  type: 'open' | 'event' | 'closed';
  title: string;
  location?: string;
  notes?: string;
}

// { 'YYYY-MM-DD': CalendarItem[] } 形式。各日は項目の配列。
export type CalendarData = { [date: string]: CalendarItem[] };
