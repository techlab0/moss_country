export const CONTACT_STATUSES = ['pending', 'replied', 'resolved'] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const ORDER_STATUSES = [
  'pending', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderListFilter = 'all' | 'unshipped' | OrderStatus;

export const UNSHIPPED_ORDER_STATUSES: readonly OrderStatus[] = [
  'pending', 'paid', 'confirmed', 'processing',
];

export function parseContactStatus(value: string | null): ContactStatus | '' {
  return CONTACT_STATUSES.includes(value as ContactStatus) ? value as ContactStatus : '';
}

export function parseOrderListFilter(value: string | null): OrderListFilter {
  if (value === 'unshipped' || ORDER_STATUSES.includes(value as OrderStatus)) {
    return value as OrderListFilter;
  }
  return 'all';
}

export function matchesOrderListFilter(status: string, filter: OrderListFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'unshipped') return UNSHIPPED_ORDER_STATUSES.includes(status as OrderStatus);
  return status === filter;
}

export function buildStatusHref(pathname: string, search: string, status: string, defaultStatus = ''): string {
  const params = new URLSearchParams(search);
  if (status === defaultStatus) params.delete('status');
  else params.set('status', status);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export async function saveAdminStatus(
  fetcher: typeof fetch,
  url: string,
  method: 'PUT' | 'PATCH',
  status: string,
): Promise<void> {
  const response = await fetcher(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('ステータスの更新に失敗しました');
}
