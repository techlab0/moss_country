'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ActionRequiredCounts {
  inquiries: { pending: number | null };
  orders: { pending: number | null };
}

interface ActionItem {
  href: string;
  label: string;
  count: number;
}

export function ActionRequiredStrip() {
  const [counts, setCounts] = useState<ActionRequiredCounts | null>(null);
  const [requestFailed, setRequestFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    let requestInFlight = false;

    const fetchCounts = async () => {
      if (requestInFlight || document.visibilityState === 'hidden') return;
      requestInFlight = true;
      try {
        const response = await fetch('/api/admin/dashboard/action-required', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error('要対応件数の取得に失敗しました');
        }
        const data: ActionRequiredCounts = await response.json();
        if (mounted) {
          setCounts(data);
          setRequestFailed(false);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Action-required fetch error:', error);
        if (mounted) setRequestFailed(true);
      } finally {
        requestInFlight = false;
      }
    };

    fetchCounts();
    const interval = window.setInterval(fetchCounts, 30_000);
    const handleFocus = () => fetchCounts();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchCounts();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      controller.abort();
    };
  }, [retryToken]);

  const retry = () => setRetryToken((value) => value + 1);

  const items: ActionItem[] = [
    {
      href: '/admin/contacts',
      label: '未対応のお問い合わせ',
      count: counts?.inquiries?.pending ?? 0,
    },
    {
      href: '/admin/orders',
      label: '未発送の注文',
      count: counts?.orders?.pending ?? 0,
    },
  ].filter((item) => item.count > 0);

  const hasPartialFailure = counts !== null &&
    (counts.inquiries?.pending === null || counts.orders?.pending === null);
  const showFailure = requestFailed || hasPartialFailure;
  if (items.length === 0 && !showFailure) return null;

  return (
    <section
      aria-label="要対応の通知"
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-gray-200 bg-white px-2 py-2 text-xs"
    >
      <div className="flex items-center gap-2 font-semibold text-gray-700">
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span>要対応</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex items-center gap-1 font-medium text-red-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <span>{item.label}</span>
            <span className="font-bold text-red-700">
              {item.count}件
            </span>
          </Link>
        ))}
      </div>
      {showFailure && (
        <div className="flex items-center gap-2 text-gray-500" role="status">
          <span>件数を取得できませんでした</span>
          <button type="button" onClick={retry} className="underline hover:text-gray-700">
            再試行
          </button>
        </div>
      )}
    </section>
  );
}
