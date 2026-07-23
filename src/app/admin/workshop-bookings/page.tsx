'use client';

import { useState, useEffect, useCallback } from 'react';
import { WORKSHOP_SLOTS } from '@/lib/workshopBookingConfig';

// このファイルは「予約一覧」（既存）と「受付枠設定」（新規・カレンダー形式のON/OFF設定）の
// 2タブ構成。営業日カレンダー管理（/admin/calendar）とは別画面のまま混ぜない
// （休業日データは受付枠設定タブでグレーアウト表示に使うのみ）。

export default function WorkshopBookingsPage() {
  const [activeTab, setActiveTab] = useState<'bookings' | 'slots'>('bookings');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-900">ワークショップ予約</h1>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'bookings' as const, label: '予約一覧' },
            { key: 'slots' as const, label: '受付枠設定' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-moss-green text-moss-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'bookings' && <BookingsListTab />}
      {activeTab === 'slots' && <SlotSettingsTab />}
    </div>
  );
}

// ===================== 予約一覧タブ =====================

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

function BookingsListTab() {
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

// ===================== 受付枠設定タブ =====================

interface SlotInfo {
  start: string;
  end: string;
  isOpen: boolean;
}

interface DaySlots {
  date: string;
  closed: boolean;
  slots: SlotInfo[];
}

const SLOT_STARTS = WORKSHOP_SLOTS.map(s => s.start);

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function SlotSettingsTab() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [days, setDays] = useState<Map<string, DaySlots>>(new Map());
  // 未保存の変更（キー: `${date}|${startTime}` -> 変更後のisOpen）。「まとめて保存」を押すまでAPIには送らない
  const [pending, setPending] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const monthParam = `${year}-${String(month).padStart(2, '0')}`;

  const flash = (m: { type: 'success' | 'error'; text: string }) => {
    setMessage(m);
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchMonth = useCallback(async (monthStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/workshop-slots?month=${monthStr}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        flash({ type: 'error', text: data.error || '受付枠の取得に失敗しました' });
        setDays(new Map());
        return;
      }
      const map = new Map<string, DaySlots>();
      for (const d of (data.days || []) as DaySlots[]) {
        map.set(d.date, d);
      }
      setDays(map);
    } catch {
      flash({ type: 'error', text: 'ネットワークエラーが発生しました' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 月を切り替えたら未保存の変更は破棄する（別の月のデータに紐づく変更を持ち越さない）
    setPending(new Map());
    fetchMonth(monthParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthParam, fetchMonth]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 2, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month, 1));

  const effectiveIsOpen = (date: string, start: string): boolean => {
    const key = `${date}|${start}`;
    if (pending.has(key)) return pending.get(key)!;
    const slot = days.get(date)?.slots.find(s => s.start === start);
    return slot?.isOpen ?? true;
  };

  const toggleSlot = (date: string, start: string) => {
    const day = days.get(date);
    if (day?.closed) return; // 休業日は操作不可

    const key = `${date}|${start}`;
    const currentValue = effectiveIsOpen(date, start);
    const originalValue = day?.slots.find(s => s.start === start)?.isOpen ?? true;
    const newValue = !currentValue;

    setPending(prev => {
      const next = new Map(prev);
      if (newValue === originalValue) {
        next.delete(key); // 元の状態に戻したら差分から除外
      } else {
        next.set(key, newValue);
      }
      return next;
    });
  };

  const discardChanges = () => setPending(new Map());

  const saveChanges = async () => {
    if (pending.size === 0) return;
    setSaving(true);
    try {
      const changes = Array.from(pending.entries()).map(([key, isOpen]) => {
        const [date, startTime] = key.split('|');
        return { date, startTime, isOpen };
      });
      const res = await fetch('/api/admin/workshop-slots', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        flash({ type: 'error', text: data.error || '保存に失敗しました' });
        return;
      }
      const savedCount = changes.length;
      setPending(new Map());
      await fetchMonth(monthParam);
      flash({ type: 'success', text: `${savedCount}件の変更を保存しました` });
    } catch {
      flash({ type: 'error', text: 'ネットワークエラーが発生しました' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        各日のチップ（{SLOT_STARTS.join(' / ')}）をクリックしてON/OFFを切り替え、
        <b>「まとめて保存」</b>ボタンで確定します（クリック時点ではまだ保存されません）。
        休業日（カレンダー管理で設定済みの日）はグレーアウトされ操作できません。
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {year}年 {monthNames[month - 1]}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="px-3 py-1.5 text-sm font-medium rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              ← 前月
            </button>
            <button
              onClick={nextMonth}
              className="px-3 py-1.5 text-sm font-medium rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              翌月 →
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-600">
          <div className="flex items-center"><div className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded mr-1.5"></div>受付中（OFF切替可）</div>
          <div className="flex items-center"><div className="w-3 h-3 bg-gray-200 border border-gray-300 rounded mr-1.5"></div>停止中（ON切替可）</div>
          <div className="flex items-center"><div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded mr-1.5"></div>休業日（操作不可）</div>
          <div className="flex items-center"><div className="w-3 h-3 bg-white border-2 border-amber-400 rounded mr-1.5"></div>未保存の変更あり</div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((d, i) => (
            <div
              key={d}
              className={`p-2 text-center font-semibold text-sm ${
                i === 0 ? 'text-red-600' : i === 6 ? 'text-blue-600' : 'text-gray-700'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }, (_, i) => (
            <div
              key={`empty-${i}`}
              className="p-2 min-h-[92px] bg-gray-100 border border-gray-200 rounded-lg opacity-50"
            ></div>
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const dateStr = formatDate(year, month, day);
            const dayData = days.get(dateStr);
            const closed = dayData?.closed ?? false;

            return (
              <div
                key={dateStr}
                className={`p-2 min-h-[92px] border rounded-lg text-sm overflow-hidden min-w-0 ${
                  closed ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{day}</span>
                  {closed && <span className="text-[10px] px-1 py-0.5 bg-gray-200 rounded">休業</span>}
                </div>
                {!closed && (
                  <div className="space-y-1">
                    {SLOT_STARTS.map(start => {
                      const isOpen = effectiveIsOpen(dateStr, start);
                      const dirty = pending.has(`${dateStr}|${start}`);
                      return (
                        <button
                          key={start}
                          type="button"
                          onClick={() => toggleSlot(dateStr, start)}
                          title={isOpen ? `${start}: 受付中（クリックで停止）` : `${start}: 停止中（クリックで再開）`}
                          className={`w-full text-[11px] px-1.5 py-1 rounded transition-colors ${
                            isOpen
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-gray-200 text-gray-500 line-through hover:bg-gray-300'
                          } ${dirty ? 'ring-2 ring-amber-400' : ''}`}
                        >
                          {start}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={saveChanges}
          disabled={pending.size === 0 || saving}
          className="px-4 py-2 text-sm font-medium rounded-md bg-moss-green text-white hover:bg-moss-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '保存中...' : `まとめて保存${pending.size > 0 ? `（${pending.size}件）` : ''}`}
        </button>
        {pending.size > 0 && (
          <button
            onClick={discardChanges}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            変更を破棄
          </button>
        )}
      </div>
    </div>
  );
}
