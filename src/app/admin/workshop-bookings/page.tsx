'use client';

import { useState, useEffect, useCallback } from 'react';

interface Booking {
  id: string;
  bookingNumber: string;
  workshopPlanName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  partySize: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  total: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

const paymentMethodLabels: Record<string, string> = {
  credit_card: 'クレジット',
  on_site: '現地払い',
  paypay: 'PayPay',
};

const paymentStatusLabels: Record<string, string> = {
  pending: '未払い',
  paid: '支払い済み',
  refunded: '返金済み',
};

const statusConfig: Record<string, { label: string; color: string }> = {
  confirmed: { label: '確定', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'キャンセル', color: 'bg-red-100 text-red-800' },
};

export default function WorkshopBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
      const res = await fetch(`/api/admin/workshop-bookings${query}`);
      if (!res.ok) {
        throw new Error('予約一覧の取得に失敗しました');
      }
      const data = await res.json();
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予約一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancel = async (booking: Booking) => {
    if (
      !window.confirm(
        `予約「${booking.bookingNumber}」（${booking.date} ${booking.startTime}）をキャンセルしますか？\n` +
        `Googleカレンダーのイベントも削除され、枠が空きます。`
      )
    ) {
      return;
    }
    setCancellingId(booking.id);
    try {
      const res = await fetch(`/api/admin/workshop-bookings/${booking.id}`, { method: 'PATCH' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'キャンセルに失敗しました');
      }
      if (data.needsManualRefund) {
        alert(
          'キャンセルしました。\n' +
          'この予約はクレジットカードで決済済みのため、返金は手動で行ってください' +
          '（Squareダッシュボード、または注文の返金機能を使用）。'
        );
      } else {
        alert('キャンセルしました。');
      }
      await fetchBookings();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'キャンセルに失敗しました');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-900">ワークショップ予約</h1>
        <div className="flex items-center gap-2">
          {(['all', 'confirmed', 'cancelled'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md border ${
                statusFilter === f
                  ? 'bg-moss-green text-white border-moss-green'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'すべて' : f === 'confirmed' ? '確定' : 'キャンセル'}
            </button>
          ))}
          <button
            onClick={fetchBookings}
            className="px-3 py-1.5 text-sm font-medium rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            更新
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
      ) : bookings.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">予約はありません。</div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-3">日時</th>
                <th className="px-4 py-3">プラン</th>
                <th className="px-4 py-3">お客様</th>
                <th className="px-4 py-3 text-right">人数</th>
                <th className="px-4 py-3">支払い</th>
                <th className="px-4 py-3 text-right">金額</th>
                <th className="px-4 py-3">状態</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                    {b.date}<br />
                    <span className="text-gray-500">{b.startTime}〜{b.endTime}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{b.workshopPlanName || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {b.customerName || '—'}<br />
                    <span className="text-xs text-gray-400">{b.customerEmail}</span>
                    {b.customerPhone && <span className="text-xs text-gray-400"> / {b.customerPhone}</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{b.partySize}名</td>
                  <td className="px-4 py-3 text-gray-700">
                    {b.paymentMethod ? (paymentMethodLabels[b.paymentMethod] || b.paymentMethod) : '—'}
                    <br />
                    <span className="text-xs text-gray-400">
                      {paymentStatusLabels[b.paymentStatus] || b.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {b.total != null ? `¥${b.total.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${
                        (statusConfig[b.status] || statusConfig.confirmed).color
                      }`}
                    >
                      {(statusConfig[b.status] || { label: b.status }).label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {b.status === 'confirmed' && (
                      <button
                        onClick={() => handleCancel(b)}
                        disabled={cancellingId === b.id}
                        className="px-3 py-1.5 text-xs font-medium text-red-700 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
                      >
                        {cancellingId === b.id ? '処理中...' : 'キャンセル'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
