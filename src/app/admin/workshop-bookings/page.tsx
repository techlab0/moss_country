'use client';

import { useState, useEffect, useCallback } from 'react';
import { WORKSHOP_SLOTS, CAPACITY_PER_SLOT } from '@/lib/workshopBookingConfig';

// このファイルは「予約一覧」（既存）と「受付枠設定」（新規・カレンダー形式のON/OFF設定）の
// 2タブ構成。営業日カレンダー管理（/admin/calendar）とは別画面のまま混ぜない
// （営業日データは受付枠の受付可否を決める前提条件として参照する）。

export default function WorkshopBookingsPage() {
  const [activeTab, setActiveTab] = useState<'bookings' | 'slots' | 'plans'>('bookings');

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
            { key: 'plans' as const, label: 'プラン設定' },
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
      {activeTab === 'plans' && <PlanSettingsTab />}
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
  external: '外部予約',
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
  const [refundingId, setRefundingId] = useState<string | null>(null);
  // じゃらん・電話・来店など、オンライン予約以外の予約を枠に載せるための手動登録
  const [showManualForm, setShowManualForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [manualForm, setManualForm] = useState({
    date: '',
    startTime: WORKSHOP_SLOTS[0].start,
    partySize: '1',
    customerName: '',
    customerPhone: '',
    planName: '',
    total: '',
    paymentMethod: 'external',
    notes: 'じゃらん経由',
  });
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

  const handleCreateManualBooking = async () => {
    if (!manualForm.date || !manualForm.customerName.trim()) {
      alert('日付とお名前は必須です');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/workshop-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: manualForm.date,
          startTime: manualForm.startTime,
          partySize: Number(manualForm.partySize),
          customerName: manualForm.customerName.trim(),
          customerPhone: manualForm.customerPhone.trim() || undefined,
          planName: manualForm.planName.trim() || undefined,
          total: manualForm.total === '' ? undefined : Number(manualForm.total),
          paymentMethod: manualForm.paymentMethod,
          notes: manualForm.notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || '予約の登録に失敗しました');
      }
      setShowManualForm(false);
      setManualForm((prev) => ({ ...prev, customerName: '', customerPhone: '', total: '', partySize: '1' }));
      await fetchBookings();
      alert('予約を登録しました');
    } catch (err) {
      alert(err instanceof Error ? err.message : '予約の登録に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  // 返金（Square/PayPay）。返金と同時に予約もキャンセルされ、枠とカレンダーが解放される。
  const handleRefund = async (booking: Booking) => {
    const methodLabel = booking.paymentMethod === 'paypay' ? 'PayPay' : 'クレジットカード';
    const amountLabel = (booking.total ?? 0).toLocaleString();
    if (
      !window.confirm(
        `予約「${booking.bookingNumber}」に ¥${amountLabel} を${methodLabel}へ返金します。
返金と同時に予約はキャンセルされ、Googleカレンダーのイベントも削除されます。
この操作は取り消せません。よろしいですか？`
      )
    ) {
      return;
    }
    setRefundingId(booking.id);
    try {
      const res = await fetch(`/api/admin/workshop-bookings/${booking.id}/refund`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || '返金に失敗しました');
      }
      alert(`返金しました（¥${(data.amount ?? booking.total ?? 0).toLocaleString()}）`);
      await fetchBookings();
    } catch (err) {
      alert(err instanceof Error ? err.message : '返金に失敗しました');
    } finally {
      setRefundingId(null);
    }
  };

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
      if (data.needsRefund) {
        alert(
          'キャンセルしました。\n' +
          'この予約は支払い済みです。返金する場合は「返金」ボタンから実行してください。'
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
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setShowManualForm((prev) => !prev);
              setManualForm((prev) => ({ ...prev, date: prev.date || new Date().toISOString().slice(0, 10) }));
            }}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-moss-green text-white hover:opacity-90"
          >
            {showManualForm ? '閉じる' : '＋ 予約を追加'}
          </button>
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

      {showManualForm && (
        <div className="bg-white shadow rounded-lg p-4 space-y-3">
          <div>
            <h3 className="font-medium text-gray-900">予約を追加</h3>
            <p className="text-xs text-gray-500 mt-1">
              じゃらん・電話・来店などオンライン以外の予約を登録します。オンライン予約と同じ枠を消費するため、
              ダブルブッキングを防げます。
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">日付 *</label>
              <input
                type="date"
                value={manualForm.date}
                onChange={(e) => setManualForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">時間枠 *</label>
              <select
                value={manualForm.startTime}
                onChange={(e) => setManualForm((prev) => ({ ...prev, startTime: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
              >
                {WORKSHOP_SLOTS.map((slot) => (
                  <option key={slot.start} value={slot.start}>
                    {slot.start}〜{slot.end}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">人数 *</label>
              <input
                type="number"
                min={1}
                max={CAPACITY_PER_SLOT}
                value={manualForm.partySize}
                onChange={(e) => setManualForm((prev) => ({ ...prev, partySize: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">お名前 *</label>
              <input
                type="text"
                value={manualForm.customerName}
                onChange={(e) => setManualForm((prev) => ({ ...prev, customerName: e.target.value }))}
                placeholder="山田 太郎"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">電話番号</label>
              <input
                type="tel"
                value={manualForm.customerPhone}
                onChange={(e) => setManualForm((prev) => ({ ...prev, customerPhone: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">プラン名</label>
              <input
                type="text"
                value={manualForm.planName}
                onChange={(e) => setManualForm((prev) => ({ ...prev, planName: e.target.value }))}
                placeholder="苔テラリウム作り体験"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">支払い方法 *</label>
              <select
                value={manualForm.paymentMethod}
                onChange={(e) => setManualForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
              >
                <option value="external">外部予約（決済済み・売上に計上）</option>
                <option value="on_site">現地払い（当日レジで会計）</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">金額（円）</label>
              <input
                type="number"
                min={0}
                value={manualForm.total}
                onChange={(e) => setManualForm((prev) => ({ ...prev, total: e.target.value }))}
                placeholder={manualForm.paymentMethod === 'external' ? '売上に計上する金額' : '任意'}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">備考</label>
              <input
                type="text"
                value={manualForm.notes}
                onChange={(e) => setManualForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            「外部予約」を選ぶと支払い済みとして日別売上に計上されます。当日レジで会計する場合は「現地払い」を選んでください
            （レジ側で計上されるため、二重計上になりません）。
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowManualForm(false)}
              disabled={creating}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleCreateManualBooking}
              disabled={creating}
              className="px-4 py-2 text-sm text-white bg-moss-green rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {creating ? '登録中...' : '登録する'}
            </button>
          </div>
        </div>
      )}

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
                    <div className="flex justify-end gap-2">
                      {/* オンラインで支払い済みの予約には返金（＝返金＋キャンセル）を出す。
                          現地払い・未入金はキャンセルのみ。 */}
                      {b.paymentStatus === 'paid' && b.paymentMethod !== 'on_site' && (
                        <button
                          onClick={() => handleRefund(b)}
                          disabled={refundingId === b.id || cancellingId === b.id}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-orange-600 border border-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
                        >
                          {refundingId === b.id ? '返金中...' : '返金'}
                        </button>
                      )}
                      {b.status === 'confirmed' && (
                        <button
                          onClick={() => handleCancel(b)}
                          disabled={cancellingId === b.id || refundingId === b.id}
                          className="px-3 py-1.5 text-xs font-medium text-red-700 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
                        >
                          {cancellingId === b.id ? '処理中...' : 'キャンセル'}
                        </button>
                      )}
                    </div>
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
  /** 予約済み人数（同一日・同一開始時刻の合計） */
  booked?: number;
  /** 1枠あたりの定員 */
  capacity?: number;
}

interface DaySlots {
  date: string;
  businessDay: boolean;
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

// ===================== プラン設定タブ =====================
// 予約画面（/workshop/booking）で選択できるプランの管理。実体はSanityの simpleWorkshop で、
// 予約時の請求額もこの price をサーバー側で参照して再計算する（クライアント申告値は使わない）。

interface WorkshopPlan {
  _id: string;
  title: string;
  description?: string;
  price?: number;
  duration?: string;
  upcomingBookingCount?: number;
}

interface PlanFormState {
  title: string;
  description: string;
  price: string;
  duration: string;
}

const emptyPlanForm: PlanFormState = { title: '', description: '', price: '', duration: '' };

function PlanSettingsTab() {
  const [plans, setPlans] = useState<WorkshopPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<PlanFormState>(emptyPlanForm);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/workshop-plans');
      if (!res.ok) throw new Error('プランの取得に失敗しました');
      const data = await res.json();
      setPlans(Array.isArray(data.plans) ? data.plans : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'プランの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setForm(emptyPlanForm);
  };

  const startEdit = (plan: WorkshopPlan) => {
    setCreating(false);
    setEditingId(plan._id);
    setForm({
      title: plan.title || '',
      description: plan.description || '',
      price: plan.price != null ? String(plan.price) : '',
      duration: plan.duration || '',
    });
  };

  const cancelEdit = () => {
    setCreating(false);
    setEditingId(null);
    setForm(emptyPlanForm);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const isNew = creating;
      const res = await fetch(isNew ? '/api/admin/workshop-plans' : `/api/admin/workshop-plans/${editingId}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          price: Number(form.price),
          duration: form.duration,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || '保存に失敗しました');
      }
      cancelEdit();
      await fetchPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan: WorkshopPlan) => {
    const upcoming = plan.upcomingBookingCount || 0;
    const warning =
      upcoming > 0
        ? `このプランには未開催の予約が${upcoming}件あります。既存の予約（プラン名・金額）はそのまま残りますが、今後このプランでの新規予約はできなくなります。`
        : '';
    if (!window.confirm(`${warning}プラン「${plan.title}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/workshop-plans/${plan._id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || '削除に失敗しました');
      }
      await fetchPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const isFormOpen = creating || editingId !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-600">
          予約画面で選べるプランを管理します。ここで設定した料金が、お客様の予約時の請求額になります。
        </p>
        <button
          type="button"
          onClick={startCreate}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-moss-green rounded-md hover:opacity-90 disabled:opacity-50"
        >
          プランを追加
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">{error}</div>
      )}

      {isFormOpen && (
        <div className="bg-white shadow rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-gray-900">{creating ? 'プランを追加' : 'プランを編集'}</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">プラン名 *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="苔テラリウム作り体験"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">料金（円・1名あたり） *</label>
              <input
                type="number"
                min={1}
                value={form.price}
                onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                placeholder="4000"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">所要時間</label>
              <input
                type="text"
                value={form.duration}
                onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
                placeholder="約90分"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">説明</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="予約画面に表示される説明文です"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-moss-green rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        {loading ? (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">読み込み中...</p>
        ) : plans.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">
            プランがありません。「プランを追加」から登録してください。
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left font-medium">プラン名</th>
                <th className="px-4 py-2 text-right font-medium">料金</th>
                <th className="px-4 py-2 text-left font-medium">所要時間</th>
                <th className="px-4 py-2 text-left font-medium">説明</th>
                <th className="px-4 py-2 text-right font-medium">未開催の予約</th>
                <th className="px-4 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plans.map((plan) => (
                <tr key={plan._id}>
                  <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{plan.title}</td>
                  <td className="px-4 py-3 text-right text-gray-900 whitespace-nowrap">
                    {plan.price != null ? `¥${plan.price.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{plan.duration || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-md">{plan.description || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{plan.upcomingBookingCount || 0}件</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(plan)}
                        disabled={saving}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(plan)}
                        disabled={saving}
                        className="px-3 py-1.5 text-xs font-medium text-red-700 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
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
  }, [monthParam, fetchMonth]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 2, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month, 1));

  const effectiveIsOpen = (date: string, start: string): boolean => {
    const key = `${date}|${start}`;
    if (pending.has(key)) return pending.get(key)!;
    const slot = days.get(date)?.slots.find(s => s.start === start);
    return slot?.isOpen ?? false;
  };

  // 枠のボタン。スマホのリスト表示とPCのカレンダー表示で同じ挙動・同じ配色を使う。
  const renderSlotButton = (dateStr: string, start: string, businessDay: boolean, layout: 'grid' | 'list') => {
    const isOpen = effectiveIsOpen(dateStr, start);
    const dirty = pending.has(`${dateStr}|${start}`);
    const vacancy = slotVacancy(dateStr, start);
    return (
      <button
        key={start}
        type="button"
        onClick={() => toggleSlot(dateStr, start)}
        disabled={!businessDay}
        title={
          (!businessDay
            ? `${start}: 営業日未登録のため停止中`
            : isOpen
              ? `${start}: 受付中（クリックで停止）`
              : `${start}: 停止中（クリックで再開）`) +
          (vacancy ? ` / 空き${vacancy.remaining}名（定員${vacancy.capacity}名）` : '')
        }
        className={`rounded transition-colors ${
          layout === 'grid'
            ? 'w-full text-[11px] px-1 py-1 leading-tight'
            : 'flex-1 text-sm px-3 py-2'
        } ${
          isOpen
            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
            : businessDay
              ? 'bg-gray-200 text-gray-500 line-through hover:bg-gray-300'
              : 'bg-gray-200 text-gray-400 line-through cursor-not-allowed'
        } ${dirty ? 'ring-2 ring-amber-400' : ''}`}
      >
        {/* 横幅が足りないグリッドでは時刻と空き状況を2段にして切れを防ぐ */}
        <span className={layout === 'grid' ? 'flex flex-col items-center' : 'flex items-center justify-center gap-2'}>
          <span className="whitespace-nowrap">{start}</span>
          {vacancy && (
            <span
              className={`whitespace-nowrap ${
                vacancy.remaining === 0
                  ? 'font-semibold text-red-600'
                  : vacancy.remaining < vacancy.capacity
                    ? 'font-semibold text-amber-700'
                    : 'opacity-70'
              }`}
            >
              {vacancy.remaining}/{vacancy.capacity}
            </span>
          )}
        </span>
      </button>
    );
  };

  // 残り枠（定員 − 予約済み人数）。データが無い日は null を返して表示しない。
  const slotVacancy = (dateStr: string, start: string): { remaining: number; capacity: number } | null => {
    const slot = days.get(dateStr)?.slots.find(s => s.start === start);
    if (!slot || slot.capacity == null) return null;
    return { remaining: Math.max(0, slot.capacity - (slot.booked || 0)), capacity: slot.capacity };
  };

  const toggleSlot = (date: string, start: string) => {
    const day = days.get(date);
    if (!day?.businessDay || day.closed) return; // 営業日未登録・休業日は操作不可

    const key = `${date}|${start}`;
    const currentValue = effectiveIsOpen(date, start);
    const originalValue = day.slots.find(s => s.start === start)?.isOpen ?? false;
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
        カレンダー管理で<b>営業日を登録した日だけ</b>受付できます。営業日未登録・休業日は
        停止中となり操作できません。
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
          <div className="flex items-center"><div className="w-3 h-3 bg-slate-100 border border-slate-300 rounded mr-1.5"></div>営業日未登録（停止・操作不可）</div>
          <div className="flex items-center"><div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded mr-1.5"></div>休業日（操作不可）</div>
          <div className="flex items-center"><div className="w-3 h-3 bg-white border-2 border-amber-400 rounded mr-1.5"></div>未保存の変更あり</div>
          <div className="flex items-center text-gray-500">枠内の数字は「空き人数／定員」</div>
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

        {/* スマホ: 日付ごとのリスト。7列グリッドだと1マスが狭すぎて時刻も空き人数も切れるため */}
        <div className="sm:hidden divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const dateStr = formatDate(year, month, day);
            const dayData = days.get(dateStr);
            const businessDay = dayData?.businessDay ?? false;
            const closed = dayData?.closed ?? false;
            const weekday = dayNames[new Date(`${dateStr}T00:00:00Z`).getUTCDay()];

            return (
              <div
                key={dateStr}
                className={`flex items-center gap-3 px-3 py-2 ${
                  closed ? 'bg-gray-50' : businessDay ? 'bg-white' : 'bg-slate-50'
                }`}
              >
                <div className="w-16 shrink-0">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-base font-semibold ${closed || !businessDay ? 'text-gray-400' : 'text-gray-900'}`}>
                      {day}
                    </span>
                    <span className="text-xs text-gray-500">{weekday}</span>
                  </div>
                  {closed && <span className="text-[10px] text-gray-500">休業</span>}
                  {!closed && !businessDay && <span className="text-[10px] text-gray-500">未登録</span>}
                </div>
                {closed ? (
                  <p className="flex-1 text-xs text-gray-400">休業日のため受付できません</p>
                ) : (
                  <div className="flex-1 flex gap-2">
                    {SLOT_STARTS.map(start => renderSlotButton(dateStr, start, businessDay, 'list'))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="hidden sm:grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }, (_, i) => (
            <div
              key={`empty-${i}`}
              className="p-2 min-h-[92px] bg-gray-100 border border-gray-200 rounded-lg opacity-50"
            ></div>
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const dateStr = formatDate(year, month, day);
            const dayData = days.get(dateStr);
            const businessDay = dayData?.businessDay ?? false;
            const closed = dayData?.closed ?? false;

            return (
              <div
                key={dateStr}
                className={`p-2 min-h-[92px] border rounded-lg text-sm overflow-hidden min-w-0 ${
                  closed
                    ? 'bg-gray-50 border-gray-200 text-gray-400'
                    : businessDay
                      ? 'bg-white border-gray-200'
                      : 'bg-slate-50 border-slate-200 text-gray-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{day}</span>
                  {closed && <span className="text-[10px] px-1 py-0.5 bg-gray-200 rounded">休業</span>}
                  {!closed && !businessDay && (
                    <span className="text-[10px] px-1 py-0.5 bg-slate-200 rounded">未登録</span>
                  )}
                </div>
                {!closed && (
                  <div className="space-y-1">
                    {SLOT_STARTS.map(start => renderSlotButton(dateStr, start, businessDay, 'grid'))}
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
