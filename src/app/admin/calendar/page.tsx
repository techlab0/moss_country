'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { CalendarItem, CalendarData } from '@/types/calendar';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDefaultTitle(type: CalendarItem['type']) {
  switch (type) {
    case 'open': return '営業日';
    case 'event': return 'イベント出店';
    case 'closed': return '休業日';
  }
}

// その日の項目群からセルの配色を決める（緑ベース＋イベント印の方針）。
function dayVisual(items: CalendarItem[] | undefined) {
  const hasOpen = items?.some((i) => i.type === 'open');
  const hasEvent = items?.some((i) => i.type === 'event');
  const hasClosed = items?.some((i) => i.type === 'closed');
  if (hasOpen) return { bg: 'bg-emerald-50 hover:bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', hasEvent };
  if (hasEvent) return { bg: 'bg-amber-50 hover:bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', hasEvent };
  if (hasClosed) return { bg: 'bg-red-50 hover:bg-red-100', text: 'text-red-700', border: 'border-red-200', hasEvent };
  return { bg: 'bg-gray-50 hover:bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', hasEvent };
}

// 種類ごとのチップ配色（セル内の複数項目表示用）
function itemChipClass(type: CalendarItem['type']) {
  switch (type) {
    case 'open': return 'bg-emerald-100 text-emerald-800';
    case 'event': return 'bg-amber-100 text-amber-800';
    case 'closed': return 'bg-red-100 text-red-800';
  }
}

export default function CalendarManagePage() {
  const [calendarEvents, setCalendarEvents] = useState<CalendarData>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // モーダル内で追加/編集中の1項目（id有=既存編集、id無=新規追加）
  const [editItem, setEditItem] = useState<CalendarItem>({ type: 'open', title: '営業日' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  const fetchCalendarData = useCallback(async (notify = false) => {
    try {
      const response = await fetch('/api/admin/calendar');
      if (response.ok) {
        const data: CalendarData = await response.json();
        setCalendarEvents(data);
        if (notify) {
          const count = Object.values(data).reduce((n, arr) => n + arr.length, 0);
          setMessage({ type: 'success', text: `データを取得しました（${count}件の項目）` });
        }
      } else if (notify) {
        setMessage({ type: 'error', text: `データ取得エラー: ${response.status}` });
      }
    } catch {
      if (notify) setMessage({ type: 'error', text: 'ネットワークエラーが発生しました' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const prevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 2, 1));
  const nextMonth = () => setCurrentDate(new Date(currentYear, currentMonth, 1));

  const openEditModal = (dateStr: string) => {
    setSelectedDate(dateStr);
    setEditItem({ type: 'open', title: '営業日' }); // 追加フォームは初期化
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedDate(null);
    setEditItem({ type: 'open', title: '営業日' });
  };

  const flash = (m: { type: 'success' | 'error'; text: string }) => {
    setMessage(m);
    setTimeout(() => setMessage(null), 3000);
  };

  // 項目の保存（editItem.id 有=更新、無=新規追加）
  const saveItem = async () => {
    if (!selectedDate) return;
    try {
      const response = await fetch('/api/admin/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, event: editItem }),
      });
      if (!response.ok) throw new Error();
      await fetchCalendarData();
      setEditItem({ type: 'open', title: '営業日' }); // 追加フォームをリセット（続けて追加できる）
      flash({ type: 'success', text: '項目を保存しました' });
    } catch {
      flash({ type: 'error', text: '保存中にエラーが発生しました' });
    }
  };

  const editExistingItem = (item: CalendarItem) => {
    setEditItem({ id: item.id, type: item.type, title: item.title, location: item.location, notes: item.notes });
  };

  const deleteItem = async (id?: string) => {
    if (!id) return;
    try {
      const response = await fetch('/api/admin/calendar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error();
      await fetchCalendarData();
      // 編集中の項目を消したらフォームを初期化
      setEditItem((prev) => (prev.id === id ? { type: 'open', title: '営業日' } : prev));
      flash({ type: 'success', text: '項目を削除しました' });
    } catch {
      flash({ type: 'error', text: '削除中にエラーが発生しました' });
    }
  };

  // 一括: 各日に open 項目が無ければ追加（既存イベントは消さない＝非破壊）
  const setAllBusinessDays = async () => {
    if (!confirm(`${currentYear}年${monthNames[currentMonth - 1]}の各日に営業日を設定しますか？（既存のイベントは残します）`)) return;
    try {
      const promises = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDate(currentYear, currentMonth, day);
        const alreadyOpen = calendarEvents[dateStr]?.some((i) => i.type === 'open');
        if (!alreadyOpen) {
          promises.push(
            fetch('/api/admin/calendar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ date: dateStr, event: { type: 'open', title: '営業日' } }),
            })
          );
        }
      }
      await Promise.all(promises);
      await fetchCalendarData();
      flash({ type: 'success', text: `${monthNames[currentMonth - 1]}の各日に営業日を設定しました` });
    } catch {
      flash({ type: 'error', text: '一括設定中にエラーが発生しました' });
    }
  };

  // 一括: 月内各日の全項目を削除
  const clearAllEvents = async () => {
    if (!confirm(`${currentYear}年${monthNames[currentMonth - 1]}のすべての項目を削除しますか？`)) return;
    try {
      const promises = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDate(currentYear, currentMonth, day);
        if (calendarEvents[dateStr]?.length) {
          promises.push(
            fetch('/api/admin/calendar', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ date: dateStr }),
            })
          );
        }
      }
      await Promise.all(promises);
      await fetchCalendarData();
      flash({ type: 'success', text: `${monthNames[currentMonth - 1]}のすべての項目を削除しました` });
    } catch {
      flash({ type: 'error', text: '一括削除中にエラーが発生しました' });
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 bg-gray-100 border border-gray-200 rounded-lg opacity-50"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(currentYear, currentMonth, day);
      const items = calendarEvents[dateStr];
      const today = new Date();
      const isToday = today.getFullYear() === currentYear && today.getMonth() + 1 === currentMonth && today.getDate() === day;

      const vis = dayVisual(items);
      const borderColor = isToday ? 'border-blue-500 border-2' : vis.border;

      days.push(
        <div
          key={day}
          className={`p-2 min-h-[80px] border ${borderColor} ${vis.bg} ${vis.text} text-sm rounded-lg cursor-pointer transition-all duration-200 overflow-hidden min-w-0`}
          onClick={() => openEditModal(dateStr)}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold">{day}</span>
            {vis.hasEvent && <span title="イベントあり">📍</span>}
          </div>
          {items && (
            <div className="space-y-0.5">
              {items.slice(0, 3).map((item, idx) => (
                <div key={item.id ?? idx} className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${itemChipClass(item.type)}`} title={item.title}>
                  {item.title}
                </div>
              ))}
              {items.length > 3 && <div className="text-[10px] text-gray-500">+{items.length - 3}</div>}
            </div>
          )}
        </div>
      );
    }
    return days;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-lg text-gray-600">カレンダーを読み込み中...</div>
        </div>
      </div>
    );
  }

  const selectedItems = selectedDate ? calendarEvents[selectedDate] ?? [] : [];
  const totalItems = Object.values(calendarEvents).reduce((n, arr) => n + arr.length, 0);

  return (
    <div className="space-y-6">
      {/* ヘッダー部分 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/admin/dashboard" className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            ダッシュボードに戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">カレンダー管理</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => fetchCalendarData(true)} className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            🔄 データ再読み込み
          </button>
          <Link href="/store" target="_blank" className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            ストアページで確認
          </Link>
        </div>
      </div>

      {/* 使い方ガイド */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-blue-800">使い方</h3>
        </div>
        <p className="text-sm text-blue-700">
          日付をクリックして項目を設定します。<b>1日に複数の項目を追加できます</b>（例: 「営業日」＋「イベント出店」）。変更は即座にストアページに反映されます。
        </p>
        <div className="mt-2 text-xs text-blue-600">現在登録済みの項目数: {totalItems}件</div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">{currentYear}年 {monthNames[currentMonth - 1]}</h2>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={prevMonth} className="p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </Button>
              <Button variant="ghost" onClick={nextMonth} className="p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Button>
            </div>
          </div>

          {/* 一括操作ボタン */}
          <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">一括操作:</span>
              <Button onClick={setAllBusinessDays} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2">🏢 全日営業日に設定</Button>
              <Button onClick={clearAllEvents} variant="ghost" className="border-red-300 text-red-600 hover:bg-red-50 text-sm px-4 py-2">🗑️ 全項目削除</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* カレンダー凡例 */}
          <div className="flex flex-wrap gap-4 mb-6 text-sm">
            <div className="flex items-center"><div className="w-4 h-4 bg-emerald-50 border border-emerald-200 rounded mr-2"></div><span className="text-gray-700">営業日</span></div>
            <div className="flex items-center"><div className="w-4 h-4 bg-amber-50 border border-amber-200 rounded mr-2"></div><span className="text-gray-700">イベント出店</span></div>
            <div className="flex items-center"><div className="w-4 h-4 bg-red-50 border border-red-200 rounded mr-2"></div><span className="text-gray-700">休業日</span></div>
            <div className="flex items-center"><span className="mr-1">📍</span><span className="text-gray-700">イベントあり（1日に複数設定可）</span></div>
          </div>

          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((dayName, index) => (
              <div key={dayName} className={`p-2 text-center font-semibold text-sm ${index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'}`}>{dayName}</div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div className="grid grid-cols-7 gap-1">{renderCalendarDays()}</div>
        </CardContent>
      </Card>

      {/* フッター情報 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600">
            最終更新: {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/admin/dashboard" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">ダッシュボード</Link>
            <Link href="/admin/users" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">ユーザー管理</Link>
            <Link href="/admin/audit-logs" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">監査ログ</Link>
          </div>
        </div>
      </div>

      {/* 編集モーダル（1日 = 項目リスト） */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 text-gray-900 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">{selectedDate} の編集</h3>
                <Button variant="ghost" onClick={closeEditModal} className="p-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-gray-900">
              {/* 既存項目リスト */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">この日の項目（{selectedItems.length}件）</label>
                {selectedItems.length === 0 ? (
                  <p className="text-sm text-gray-500">まだ項目がありません。下のフォームから追加してください。</p>
                ) : (
                  <ul className="space-y-2">
                    {selectedItems.map((item) => (
                      <li key={item.id} className={`flex items-center justify-between gap-2 p-2 rounded ${itemChipClass(item.type)}`}>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{getDefaultTitle(item.type)}: {item.title}</div>
                          {(item.location || item.notes) && (
                            <div className="text-xs opacity-80 truncate">{item.type === 'event' ? `📍 ${item.location || ''}` : (item.notes || '')}</div>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => editExistingItem(item)} className="text-xs px-2 py-1 bg-white/70 rounded hover:bg-white">編集</button>
                          <button onClick={() => deleteItem(item.id)} className="text-xs px-2 py-1 bg-white/70 rounded hover:bg-white text-red-600">削除</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 追加/編集フォーム */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">{editItem.id ? '項目を編集' : '項目を追加'}</h4>
                  {editItem.id && (
                    <button onClick={() => setEditItem({ type: 'open', title: '営業日' })} className="text-xs text-gray-600 underline">新規追加に切替</button>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">種類</label>
                  <select
                    value={editItem.type}
                    onChange={(e) => {
                      const newType = e.target.value as CalendarItem['type'];
                      setEditItem((prev) => ({ ...prev, type: newType, title: getDefaultTitle(newType) }));
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="open">営業日</option>
                    <option value="event">イベント出店</option>
                    <option value="closed">休業日</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">タイトル</label>
                  <input
                    type="text"
                    value={editItem.title}
                    onChange={(e) => setEditItem((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="イベント名や休業理由など"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">{editItem.type === 'event' ? '場所' : '補足事項'}</label>
                  <input
                    type="text"
                    value={editItem.type === 'event' ? (editItem.location || '') : (editItem.notes || '')}
                    onChange={(e) => {
                      if (editItem.type === 'event') setEditItem((prev) => ({ ...prev, location: e.target.value }));
                      else setEditItem((prev) => ({ ...prev, notes: e.target.value }));
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder={editItem.type === 'event' ? 'イベント開催場所' : editItem.type === 'closed' ? '休業理由など' : '備考・お知らせなど'}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={saveItem} className="flex-1">{editItem.id ? '更新' : '追加'}</Button>
                  <Button onClick={closeEditModal} variant="ghost">閉じる</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
