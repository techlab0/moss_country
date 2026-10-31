import type { CalendarItem } from '@/types/calendar';

export function normalizeBulkCalendarItem(item: CalendarItem): CalendarItem {
  return {
    type: item.type,
    title: item.title.trim(),
    location: item.type === 'event' ? item.location?.trim() || undefined : undefined,
    notes: item.type === 'event' ? undefined : item.notes?.trim() || undefined,
  };
}

export function isSameCalendarItem(existing: CalendarItem, candidate: CalendarItem) {
  return existing.type === candidate.type
    && existing.title.trim() === candidate.title.trim()
    && (existing.location ?? '').trim() === (candidate.location ?? '').trim()
    && (existing.notes ?? '').trim() === (candidate.notes ?? '').trim();
}
