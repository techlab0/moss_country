'use client';

import { Fragment, useState, useEffect, useCallback } from 'react';
import { WORKSHOP_SLOTS, CAPACITY_PER_SLOT } from '@/lib/workshopBookingConfig';
import { shortenPlanName } from '@/lib/workshopPlanDisplay';

// このファイルは「予約一覧」（既存）と「受付枠設定」（新規・カレンダー形式のON/OFF設定）の
// 2タブ構成。営業日カレンダー管理（/admin/calendar）とは別画面のまま混ぜない
// （営業日データは受付枠の受付可否を決める前提条件として参照する）。
// これに加えて「Gmail連携」タブを持つ（予約通知メールの読み取り設定・調査用）。

type TabKey = 'bookings' | 'slots' | 'plans' | 'calendar' | 'gmail';

const TAB_KEYS: TabKey[] = ['bookings', 'slots', 'plans', 'calendar', 'gmail'];

// Gmail連携のOAuthコールバックは ?tab=gmail を付けて戻ってくるため、初期タブをURLから決める。
// useSearchParams はSuspense境界を要求するので、ここでは初期化時に一度だけlocationを読む。
function initialTab(): TabKey {
  if (typeof window === 'undefined') return 'bookings';
  const tab = new URLSearchParams(window.location.search).get('tab');
  return TAB_KEYS.includes(tab as TabKey) ? (tab as TabKey) : 'bookings';
}

export default function WorkshopBookingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

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
            { key: 'calendar' as const, label: 'Googleカレンダー' },
            { key: 'gmail' as const, label: 'Gmail連携' },
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
      {activeTab === 'calendar' && <GoogleCalendarTab />}
      {activeTab === 'gmail' && <GmailIntegrationTab />}
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
    const fullAmount = booking.total ?? 0;
    // キャンセルポリシーに沿ってキャンセル料を差し引く場合があるため、返金額を指定できるようにする
    const input = window.prompt(
      `予約「${booking.bookingNumber}」の返金額を入力してください（円）。
お支払い金額: ¥${fullAmount.toLocaleString()}
キャンセル料を差し引く場合は金額を変更してください。`,
      String(fullAmount)
    );
    if (input === null) return;
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount <= 0 || amount > fullAmount) {
      alert(`返金額は1〜${fullAmount.toLocaleString()}円で入力してください`);
      return;
    }
    if (
      !window.confirm(
        `予約「${booking.bookingNumber}」に ¥${amount.toLocaleString()} を${methodLabel}へ返金します。
返金と同時に予約はキャンセルされ、Googleカレンダーのイベントも削除されます。
この操作は取り消せません。よろしいですか？`
      )
    ) {
      return;
    }
    setRefundingId(booking.id);
    try {
      const res = await fetch(`/api/admin/workshop-bookings/${booking.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
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
                  <td className="px-4 py-3 text-gray-700">
                    {/* じゃらんのプラン名は販促文込みで100文字を超え、スマホでは1件で画面が埋まる。
                        経路（じゃらん）と（仮）は残したまま後ろを削り、全文はtitleで見られるようにする */}
                    <span title={b.workshopPlanName || undefined}>
                      {shortenPlanName(b.workshopPlanName) || '—'}
                    </span>
                  </td>
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

      <JalanCloseAlerts />

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

// ===================== Gmail連携タブ =====================

// 予約通知メール（activityboard.jp）をGmailから読み取るための連携設定と、
// 取込みルールを決めるための「メール調査モード」。
// 調査モードは読み取り専用で、予約台帳へは一切書き込まない。

const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

interface GmailStatus {
  configured: boolean;
  connected: boolean;
  expectedScope: string;
  connection?: {
    email: string | null;
    scope: string | null;
    connectedBy: string | null;
    connectedAt: string | null;
    updatedAt: string | null;
  } | null;
}

interface InspectMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  internalDate: string | null;
  snippet: string;
  subjectPattern: string;
  bookingNumberCandidates: string[];
}

interface ImportItem {
  messageId: string;
  bookingNumber: string | null;
  date: string | null;
  startTime: string | null;
  partySize: number | null;
  customerName: string | null;
  kind: 'tentative' | 'confirmed' | 'cancelled' | null;
  action: 'create' | 'confirm' | 'cancel' | 'skip';
  ledgerBookingNumber: string | null;
  reason: string | null;
  applied: boolean;
}

interface ImportSummary {
  dryRun: boolean;
  scanned: number;
  created: number;
  confirmed: number;
  cancelled: number;
  skipped: number;
  failed: number;
  calendarRenamed: number;
  calendarCreated: number;
  items: ImportItem[];
}

const IMPORT_ACTION_LABELS: Record<ImportItem['action'], string> = {
  create: '新規登録',
  confirm: '確定に変更',
  cancel: 'キャンセル',
  skip: '対象外',
};

interface MessageBody {
  format: string;
  truncated: boolean;
  body: string;
}

interface InspectResult {
  query: string;
  fetched: number;
  totalEstimate: number | null;
  senders: { value: string; count: number }[];
  subjectPatterns: { value: string; count: number }[];
  bookingNumberSamples: { value: string; count: number }[];
  messages: InspectMessage[];
}

// OAuthコールバックが付けてくる理由コードを、対処の分かる日本語にする
const GMAIL_ERROR_LABELS: Record<string, string> = {
  access_denied: 'Googleの許可画面で「許可」されませんでした。もう一度やり直してください。',
  missing_code: 'Googleから認証コードが返りませんでした。もう一度やり直してください。',
  state_mismatch:
    '連携の開始と戻りが一致しませんでした。管理画面から改めて「Gmailを連携する」を押してください。',
  exchange_failed: 'トークンの取得に失敗しました。',
};

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

function GmailIntegrationTab() {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const [query, setQuery] = useState('from:activityboard.jp');
  const [maxResults, setMaxResults] = useState(20);
  const [inspecting, setInspecting] = useState(false);
  const [result, setResult] = useState<InspectResult | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // 本文は明示的に押したときだけ取りに行く（一覧を開くだけで全文を読み込まない）
  const [bodies, setBodies] = useState<Record<string, MessageBody>>({});
  const [loadingBodyId, setLoadingBodyId] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportSummary | null>(null);

  // apply=false なら試し実行（何が起きるかを見せるだけで台帳は変えない）
  const runImport = async (apply: boolean) => {
    if (apply) {
      const ok = confirm(
        '試し実行の結果どおりに予約台帳へ反映します。\n' +
          '「新規登録」「確定に変更」「キャンセル」が実際に行われます。よろしいですか？'
      );
      if (!ok) return;
    }

    setImporting(true);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/gmail/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '取込みに失敗しました');
      setImportResult(data);
      setNotice({
        type: 'success',
        text: apply
          ? `取込みを実行しました（新規${data.created}件・確定${data.confirmed}件・キャンセル${data.cancelled}件）`
          : `試し実行が完了しました。台帳はまだ変更していません（新規${data.created}件・確定${data.confirmed}件・キャンセル${data.cancelled}件の予定）`,
      });
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : '取込みに失敗しました' });
    } finally {
      setImporting(false);
    }
  };

  const loadBody = async (id: string) => {
    setLoadingBodyId(id);
    try {
      const res = await fetch(`/api/admin/gmail/message?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '本文の取得に失敗しました');
      setBodies((prev) => ({ ...prev, [id]: data }));
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : '本文の取得に失敗しました' });
    } finally {
      setLoadingBodyId(null);
    }
  };

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/gmail/status');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '状態の取得に失敗しました');
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '状態の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // OAuthコールバックからの戻りをバナー表示し、URLからは結果パラメータを消す
  // （リロードで同じ結果が再表示されるのを防ぐ）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmail = params.get('gmail');
    if (!gmail) return;

    if (gmail === 'connected') {
      const email = params.get('email');
      setNotice({
        type: 'success',
        text: email ? `${email} と連携しました。` : 'Gmailと連携しました。',
      });
    } else {
      const reason = params.get('reason') ?? '';
      const detail = params.get('message');
      const label = GMAIL_ERROR_LABELS[reason] ?? `連携に失敗しました（${reason || '原因不明'}）`;
      setNotice({ type: 'error', text: detail ? `${label} ${detail}` : label });
    }

    for (const key of ['gmail', 'email', 'reason', 'message']) {
      params.delete(key);
    }
    params.set('tab', 'gmail');
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, []);

  const handleDisconnect = async () => {
    if (!confirm('Gmail連携を解除します。再開するには改めてGoogleの許可が必要です。よろしいですか？')) {
      return;
    }
    setDisconnecting(true);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/gmail/status', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '解除に失敗しました');
      setNotice({ type: 'success', text: 'Gmail連携を解除しました。' });
      setResult(null);
      await loadStatus();
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : '解除に失敗しました' });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleInspect = async () => {
    setInspecting(true);
    setNotice(null);
    try {
      const params = new URLSearchParams({ q: query, max: String(maxResults) });
      const res = await fetch(`/api/admin/gmail/inspect?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'メールの読み取りに失敗しました');
      setResult(data);
      if (data.fetched === 0) {
        setNotice({ type: 'error', text: '条件に一致するメールが見つかりませんでした。検索条件を見直してください。' });
      }
    } catch (err) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'メールの読み取りに失敗しました' });
    } finally {
      setInspecting(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-gray-500">読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
        <button onClick={() => void loadStatus()} className="ml-3 underline">
          再読み込み
        </button>
      </div>
    );
  }

  const connection = status?.connection ?? null;
  const scopeIsReadonlyOnly = !connection?.scope || connection.scope.trim() === GMAIL_READONLY_SCOPE;

  return (
    <div className="space-y-6">
      {notice && (
        <div
          className={`rounded-md border p-4 text-sm ${
            notice.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* 接続状態 */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-bold text-gray-800">接続状態</h2>

        {!status?.configured ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium">環境変数が設定されていません。</p>
            <p className="mt-2">
              Vercelの環境変数に <code className="font-mono">GMAIL_OAUTH_CLIENT_ID</code> /{' '}
              <code className="font-mono">GMAIL_OAUTH_CLIENT_SECRET</code> /{' '}
              <code className="font-mono">GMAIL_OAUTH_REDIRECT_URI</code> を設定して、再デプロイしてください。
            </p>
          </div>
        ) : status.connected ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                接続済み
              </span>
              <span className="text-sm text-gray-600">{connection?.email ?? 'アドレス未取得'}</span>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">連携した日時</dt>
                <dd className="text-gray-900">{formatDateTime(connection?.connectedAt ?? null)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">最終更新</dt>
                <dd className="text-gray-900">{formatDateTime(connection?.updatedAt ?? null)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">操作した管理者</dt>
                <dd className="text-gray-900">{connection?.connectedBy ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">許可された権限</dt>
                <dd className="break-all font-mono text-xs text-gray-900">{connection?.scope ?? '—'}</dd>
              </div>
            </dl>

            {!scopeIsReadonlyOnly && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                読み取り専用（gmail.readonly）以外の権限が含まれています。意図しない設定の可能性があるため、
                一度解除してGoogle Cloud側のスコープ設定を確認してください。
              </div>
            )}

            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {disconnecting ? '解除中...' : '連携を解除'}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
              未接続
            </span>
            <p className="text-sm text-gray-600">
              予約通知メールを受け取っているGoogleアカウントで許可してください。要求する権限は
              <span className="font-medium">メールの読み取りのみ</span>です（送信・削除・変更は要求しません）。
            </p>
            <a
              href="/api/admin/gmail/connect"
              className="inline-block rounded-md bg-moss-green px-4 py-2 text-sm font-medium text-white hover:bg-moss-dark"
            >
              Gmailを連携する
            </a>
          </div>
        )}
      </div>

      {/* 予約の取込み */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-bold text-gray-800">じゃらん予約の取込み</h2>
        <p className="mt-2 text-sm text-gray-600">
          じゃらんの仮予約・予約確定・キャンセル通知を読み取り、予約台帳へ反映します。
          仮予約の段階で枠を押さえ、プラン名の先頭に「（仮）」を付けます。確定通知が届くと「（仮）」が外れ、
          キャンセル通知が届くと枠を解放します。
        </p>
        <p className="mt-2 text-sm text-gray-600">
          売上には計上しません（当日レジで受け取った分だけが売上になります）。金額の内訳は各予約の備考に残します。
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => void runImport(false)}
            disabled={importing || !status?.connected}
            className="rounded-md border border-moss-green bg-white px-4 py-2 text-sm font-medium text-moss-green hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing ? '実行中...' : '試し実行（台帳は変更しない）'}
          </button>
          <button
            onClick={() => void runImport(true)}
            disabled={importing || !status?.connected || !importResult}
            className="rounded-md bg-moss-green px-4 py-2 text-sm font-medium text-white hover:bg-moss-dark disabled:cursor-not-allowed disabled:opacity-50"
            title={!importResult ? '先に試し実行して内容を確認してください' : undefined}
          >
            台帳へ反映する
          </button>
        </div>

        {!status?.connected && <p className="mt-3 text-sm text-gray-500">先にGmailを連携してください。</p>}
        {status?.connected && !importResult && (
          <p className="mt-3 text-sm text-gray-500">
            まず「試し実行」で何が起きるかを確認してください。確認するまで反映はできません。
          </p>
        )}

        {importResult && (
          <div className="mt-6 space-y-4">
            <div
              className={`rounded-md border p-3 text-sm ${
                importResult.dryRun
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-green-200 bg-green-50 text-green-800'
              }`}
            >
              {importResult.dryRun
                ? '試し実行の結果です。台帳はまだ変更していません。'
                : '台帳へ反映しました。'}
              {' '}
              対象 {importResult.scanned} 件／新規 {importResult.created}・確定 {importResult.confirmed}・
              キャンセル {importResult.cancelled}・対象外 {importResult.skipped}・解析失敗 {importResult.failed}
              {!importResult.dryRun && importResult.calendarCreated > 0 && (
                <span>／カレンダーに登録漏れがあった {importResult.calendarCreated} 件を作成しました</span>
              )}
              {!importResult.dryRun && importResult.calendarRenamed > 0 && (
                <span>／カレンダー名を {importResult.calendarRenamed} 件そろえ直しました</span>
              )}
            </div>

            <div className="overflow-x-auto rounded-md border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">操作</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">じゃらん予約番号</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">利用日時</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">人数</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">お客様</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">備考</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {importResult.items.map((item) => (
                    <tr key={item.messageId} className={item.action === 'skip' ? 'text-gray-500' : ''}>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.action === 'create'
                              ? 'bg-green-100 text-green-800'
                              : item.action === 'confirm'
                                ? 'bg-blue-100 text-blue-800'
                                : item.action === 'cancel'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {IMPORT_ACTION_LABELS[item.action]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                        {item.bookingNumber ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {item.date ? `${item.date} ${item.startTime ?? ''}` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {item.partySize ? `${item.partySize}名` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">{item.customerName || '—'}</td>
                      <td className="px-3 py-2">{item.reason ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* メール調査モード */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-bold text-gray-800">メール調査モード</h2>
        <p className="mt-2 text-sm text-gray-600">
          届いているメールの送信元・件名の種類・予約番号の形式を確認します。
          <span className="font-medium">読み取りのみで、予約台帳には一切書き込みません。</span>
          自動取込みは、ここで形式を確認してから実装します。
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[280px] flex-1">
            <label className="block text-sm font-medium text-gray-700">検索条件（Gmailの検索構文）</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-moss-green focus:outline-none"
              placeholder="from:activityboard.jp"
            />
          </div>
          <div className="w-28">
            <label className="block text-sm font-medium text-gray-700">件数</label>
            <input
              type="number"
              min={1}
              max={50}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-moss-green focus:outline-none"
            />
          </div>
          <button
            onClick={handleInspect}
            disabled={inspecting || !status?.connected}
            className="rounded-md bg-moss-green px-4 py-2 text-sm font-medium text-white hover:bg-moss-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {inspecting ? '読み取り中...' : '読み取る'}
          </button>
        </div>

        {!status?.connected && (
          <p className="mt-3 text-sm text-gray-500">先にGmailを連携してください。</p>
        )}

        {result && (
          <div className="mt-6 space-y-6">
            <p className="text-sm text-gray-600">
              取得 {result.fetched} 件
              {result.totalEstimate !== null && `（該当メールの概算総数: 約 ${result.totalEstimate} 件）`}
            </p>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <SummaryCard title="送信元" items={result.senders} />
              <SummaryCard
                title="件名の型"
                items={result.subjectPatterns}
                note="数字は ＃ / 長い英数IDは ＊ に置き換えて集計"
              />
              <SummaryCard title="予約番号の候補" items={result.bookingNumberSamples} />
            </div>

            <div className="overflow-hidden rounded-md border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">受信日時</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">送信元</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">件名</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {result.messages.map((message) => (
                    <Fragment key={message.id}>
                      <tr
                        onClick={() => setExpandedId(expandedId === message.id ? null : message.id)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap px-4 py-2 text-gray-600">
                          {formatDateTime(message.internalDate)}
                        </td>
                        <td className="px-4 py-2 text-gray-600">{message.from}</td>
                        <td className="px-4 py-2 text-gray-900">{message.subject || '(件名なし)'}</td>
                      </tr>
                      {expandedId === message.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={3} className="px-4 py-3 text-gray-700">
                            <p className="whitespace-pre-wrap">{message.snippet || '(本文プレビューなし)'}</p>
                            {message.bookingNumberCandidates.length > 0 && (
                              <p className="mt-2 text-xs text-gray-600">
                                予約番号の候補: {message.bookingNumberCandidates.join(' / ')}
                              </p>
                            )}

                            {bodies[message.id] ? (
                              <div className="mt-3">
                                <p className="text-xs text-gray-500">
                                  本文（{bodies[message.id].format}）
                                  {bodies[message.id].truncated && '／長いため途中まで表示しています'}
                                </p>
                                <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap rounded border border-gray-200 bg-white p-3 text-xs text-gray-800">
                                  {bodies[message.id].body || '(本文なし)'}
                                </pre>
                              </div>
                            ) : (
                              <button
                                onClick={() => void loadBody(message.id)}
                                disabled={loadingBodyId === message.id}
                                className="mt-3 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                {loadingBodyId === message.id ? '取得中...' : '本文を表示'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  items,
  note,
}: {
  title: string;
  items: { value: string; count: number }[];
  note?: string;
}) {
  return (
    <div className="rounded-md border border-gray-200 p-4">
      <h3 className="font-medium text-gray-800">{title}</h3>
      {note && <p className="mt-1 text-xs text-gray-500">{note}</p>}
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">該当なし</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {items.map((item) => (
            <li key={item.value} className="flex justify-between gap-2">
              <span className="break-all text-gray-700">{item.value}</span>
              <span className="shrink-0 text-gray-500">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


// ===================== じゃらん側で閉じるべき枠 =====================

// じゃらんの遊び・体験予約は在庫を外部から操作する手段が無く（サイトコントローラー非対応・
// 事業者向けAPIなし）、ACTIVITY BOARDの管理画面で手動で閉じるしかない。
// 自社サイト側で埋まった枠を閉じ忘れるとオーバーブッキングになるため、
// 対応が必要な枠をここに出して見逃さないようにする。

interface JalanSlotAlert {
  date: string;
  startTime: string;
  endTime: string;
  remaining: number;
  level: 'full' | 'closed' | 'low';
  reason?: string;
}

// 定員はコード側（画面表示・事前チェック）とDBトリガー（最終保証）の2か所にあり、
// 片方だけ変更されると「空きありと表示されるのに予約確定だけ失敗する」状態になる。
// 症状から原因にたどり着けないので、食い違ったときだけここに警告を出す。
interface CapacityCheck {
  ok: boolean;
  code: number;
  database: number | null;
  message: string;
}

const ACTIVITY_BOARD_URL = 'https://acb.jalan.net/gw/kanri/slogin.html';

function JalanCloseAlerts() {
  const [alerts, setAlerts] = useState<JalanSlotAlert[] | null>(null);
  const [fullyClosedDates, setFullyClosedDates] = useState<string[]>([]);
  const [registeredMonths, setRegisteredMonths] = useState<string[]>([]);
  const [capacityCheck, setCapacityCheck] = useState<CapacityCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/workshop-slots/jalan-alerts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '取得に失敗しました');
      setAlerts(data.alerts);
      setFullyClosedDates(data.fullyClosedDates ?? []);
      setRegisteredMonths(data.registeredMonths ?? []);
      setCapacityCheck(data.capacityCheck ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
        じゃらん側の対応要否を確認中...
      </div>
    );
  }

  // 空き枠が判定できないときに「対応不要」と見えると閉じ忘れにつながるため、
  // 失敗はそのまま見せる
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        じゃらん側の対応要否を判定できませんでした：{error}
        <button onClick={() => void load()} className="ml-3 underline">
          再試行
        </button>
      </div>
    );
  }

  const full = (alerts ?? []).filter((a) => a.level === 'full');
  const low = (alerts ?? []).filter((a) => a.level === 'low');
  // 終日閉じている日は日単位で見せ、片方の枠だけ閉じている場合は枠単位で見せる
  const closedDateSet = new Set(fullyClosedDates);
  const closedSlots = (alerts ?? []).filter(
    (a) => a.level === 'closed' && !closedDateSet.has(a.date)
  );

  return (
    <>
      {capacityCheck && !capacityCheck.ok && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-800">定員の設定に問題があります</p>
          <p className="mt-1 text-sm text-red-900">{capacityCheck.message}</p>
          <p className="mt-2 text-xs text-red-700">
            docs/sql/fix-workshop-slot-capacity.sql をSupabaseで実行すると直ります。
          </p>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-gray-800">じゃらん側で閉じるべき枠</h2>
        <button onClick={() => void load()} className="text-sm text-gray-500 underline">
          再読み込み
        </button>
      </div>
      <p className="mt-2 text-sm text-gray-600">
        じゃらんは在庫を自動で連携できないため、ここに出た枠は
        <a
          href={ACTIVITY_BOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-1 text-moss-green underline"
        >
          ACTIVITY BOARD
        </a>
        で手動で閉じてください。満席の枠と、定休日・イベント出店などで受け付けていない日を表示します。
        今後30日間のうち、営業日カレンダーを登録済みの月
        {registeredMonths.length > 0 ? `（${registeredMonths.join('・')}）` : ''}
        だけが対象です。未登録の月は予定が未定のため対象外にしています。
      </p>

      {full.length === 0 && low.length === 0 && closedSlots.length === 0 && fullyClosedDates.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          {registeredMonths.length === 0
            ? '今後30日間に営業日カレンダーの登録がありません。先に営業日を登録してください。'
            : '対応が必要な枠はありません。'}
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {full.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">
                満席（{full.length}件）— 閉じないとじゃらんから追加で予約が入ります
              </p>
              <ul className="mt-2 space-y-1 text-sm text-red-900">
                {full.map((a) => (
                  <li key={`${a.date}-${a.startTime}`}>
                    {a.date} {a.startTime}〜{a.endTime}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {fullyClosedDates.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">
                終日受け付けていない日（{fullyClosedDates.length}日）—
                定休日・イベント出店など。じゃらんが開いていると予約が入ります
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-red-900">
                {fullyClosedDates.map((date) => (
                  <li key={date}>{date}</li>
                ))}
              </ul>
            </div>
          )}

          {closedSlots.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">
                受け付けていない枠（{closedSlots.length}件）
              </p>
              <ul className="mt-2 space-y-1 text-sm text-red-900">
                {closedSlots.map((a) => (
                  <li key={`${a.date}-${a.startTime}`}>
                    {a.date} {a.startTime}〜{a.endTime}
                    {a.reason && <span className="ml-2 text-xs">（{a.reason}）</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {low.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">
                残りわずか（{low.length}件）— じゃらん側の在庫が残り人数を超えていないか確認してください
              </p>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {low.map((a) => (
                  <li key={`${a.date}-${a.startTime}`}>
                    {a.date} {a.startTime}〜{a.endTime}（残り {a.remaining} 名）
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
}


// ===================== Googleカレンダー閲覧タブ =====================

// 連携中のGoogleカレンダーを読み取り専用で表示する。追加・変更はGoogleカレンダー側で行う。
//
// 埋め込み（iframe）を使わないのは、埋め込みがカレンダーを公開設定にしないと表示されないため。
// 予定のタイトルにお客様の氏名が入っているので公開はできない。
// 既にサービスアカウントで読み取れるので、取得して自前で描画している。

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  allDay: boolean;
  start: string;
  end: string;
}

/** 予定の開始日時から、表示に使うJSTの暦日（YYYY-MM-DD）を求める */
function eventDateKey(event: GoogleCalendarEvent): string {
  if (event.allDay) return event.start.slice(0, 10);
  const d = new Date(event.start);
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function eventTimeLabel(event: GoogleCalendarEvent): string {
  if (event.allDay) return '終日';
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
    });
  return `${fmt(event.start)}〜${fmt(event.end)}`;
}

function monthStartString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function todayJstKey(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function GoogleCalendarTab() {
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const from = monthStartString(cursor);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 月初から31日分。31日に満たない月では翌月頭が数日入るだけで実害はない
      const res = await fetch(`/api/admin/google-calendar?from=${from}&days=31`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'カレンダーを取得できませんでした');
      setEvents(data.events ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'カレンダーを取得できませんでした');
    } finally {
      setLoading(false);
    }
  }, [from]);

  useEffect(() => {
    void load();
  }, [load]);

  const shiftMonth = (delta: number) => {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  // 日付ごとにまとめる。月グリッドより、予定の内容が読める一覧の方が実用的
  const grouped = new Map<string, GoogleCalendarEvent[]>();
  for (const event of events) {
    const key = eventDateKey(event);
    const list = grouped.get(key);
    if (list) {
      list.push(event);
    } else {
      grouped.set(key, [event]);
    }
  }
  const dates = [...grouped.keys()].sort();
  const todayKey = todayJstKey();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-800">
          {cursor.getFullYear()}年 {cursor.getMonth() + 1}月の予定
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => shiftMonth(-1)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            ← 前月
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            今月
          </button>
          <button
            onClick={() => shiftMonth(1)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            翌月 →
          </button>
        </div>
      </div>

      <p className="mt-2 text-sm text-gray-600">
        予約管理と連携しているGoogleカレンダーの予定です。ここでは閲覧のみで、追加・変更は
        Googleカレンダー側で行ってください。
      </p>

      {loading && <p className="mt-4 text-sm text-gray-500">読み込み中...</p>}

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button onClick={() => void load()} className="ml-3 underline">
            再試行
          </button>
        </div>
      )}

      {!loading && !error && dates.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">この期間に予定はありません。</p>
      )}

      {!loading && !error && dates.length > 0 && (
        <div className="mt-4 divide-y divide-gray-200 rounded-md border border-gray-200">
          {dates.map((date) => (
            <div key={date} className={date === todayKey ? 'bg-green-50' : ''}>
              <div className="flex items-baseline gap-2 px-4 py-2">
                <span className="font-medium text-gray-800">{date}</span>
                <span className="text-xs text-gray-500">
                  {new Date(`${date}T00:00:00+09:00`).toLocaleDateString('ja-JP', {
                    timeZone: 'Asia/Tokyo',
                    weekday: 'short',
                  })}
                </span>
                {date === todayKey && (
                  <span className="rounded-full bg-moss-green px-2 py-0.5 text-xs text-white">
                    今日
                  </span>
                )}
              </div>
              <ul className="space-y-2 px-4 pb-3">
                {(grouped.get(date) ?? []).map((event) => (
                  <li key={event.id} className="rounded-md border border-gray-200 bg-white p-3">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="whitespace-nowrap text-sm text-gray-600">
                        {eventTimeLabel(event)}
                      </span>
                      <span className="font-medium text-gray-900">{event.summary}</span>
                    </div>
                    {event.location && (
                      <p className="mt-1 text-xs text-gray-600">場所: {event.location}</p>
                    )}
                    {event.description && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-gray-500">
                          詳細を見る
                        </summary>
                        <pre className="mt-1 whitespace-pre-wrap text-xs text-gray-700">
                          {event.description}
                        </pre>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
