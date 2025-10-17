'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface CalendarEvent {
  type: 'open' | 'event' | 'closed';
  title: string;
  location?: string;
  notes?: string;
}

interface CalendarData {
  [key: string]: CalendarEvent;
}


function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarManagePage() {
  const [calendarEvents, setCalendarEvents] = useState<CalendarData>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent>({ type: 'open', title: '営業日' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // カレンダーデータを取得
  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        console.log('カレンダーデータを取得中...');
        const response = await fetch('/api/admin/calendar');
        console.log('APIレスポンス:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('取得したカレンダーデータ:', data);
          setCalendarEvents(data);
        } else {
          console.error('カレンダーデータの取得に失敗しました:', response.status);
          const errorText = await response.text();
          console.error('エラー詳細:', errorText);
        }
      } catch (error) {
        console.error('カレンダーデータの取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalendarData();
  }, []);

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  const prevMonth = () => {
    const prev = new Date(currentYear, currentMonth - 2, 1);
    setCurrentDate(prev);
  };

  const nextMonth = () => {
    const next = new Date(currentYear, currentMonth, 1);
    setCurrentDate(next);
  };

  const getDefaultTitle = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'open': return '営業日';
      case 'event': return 'イベント出店';
      case 'closed': return '休業日';
    }
  };

  const openEditModal = (dateStr: string) => {
    setSelectedDate(dateStr);
    const existingEvent = calendarEvents[dateStr];
    setEditEvent(existingEvent || { type: 'open', title: '営業日' });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedDate(null);
    setEditEvent({ type: 'open', title: '営業日' });
  };

  const fetchCalendarData = async () => {
    try {
      console.log('手動でカレンダーデータを取得開始');
      const response = await fetch('/api/admin/calendar');
      console.log('手動API呼び出しレスポンス:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('手動で取得したデータ:', data);
        setCalendarEvents(data);
        setMessage({ type: 'success', text: `データを取得しました。${Object.keys(data).length}件のイベント` });
      } else {
        const errorText = await response.text();
        console.error('手動API呼び出しエラー:', response.status, errorText);
        setMessage({ type: 'error', text: `データ取得エラー: ${response.status}` });
      }
    } catch (error) {
      console.error('手動カレンダーデータの取得エラー:', error);
      setMessage({ type: 'error', text: `ネットワークエラー: ${error.message}` });
    }
    
    setTimeout(() => setMessage(null), 5000);
  };

  const saveEvent = async () => {
    if (!selectedDate) return;

    try {
      // APIを呼び出してカレンダーイベントを保存
      const response = await fetch('/api/admin/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate,
          event: editEvent,
        }),
      });

      if (response.ok) {
        // データベースから最新データを再取得
        await fetchCalendarData();
        setMessage({ type: 'success', text: 'カレンダーを更新しました' });
        closeEditModal();
      } else {
        throw new Error('保存に失敗しました');
      }
    } catch (error) {
      setMessage({ type: 'error', text: '保存中にエラーが発生しました' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const deleteEvent = async () => {
    if (!selectedDate) return;

    try {
      const response = await fetch('/api/admin/calendar', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: selectedDate }),
      });

      if (response.ok) {
        // データベースから最新データを再取得
        await fetchCalendarData();
        setMessage({ type: 'success', text: 'イベントを削除しました' });
        closeEditModal();
      } else {
        throw new Error('削除に失敗しました');
      }
    } catch (error) {
      setMessage({ type: 'error', text: '削除中にエラーが発生しました' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  // 一括営業日設定機能
  const setAllBusinessDays = async () => {
    if (!confirm(`${currentYear}年${monthNames[currentMonth - 1]}のすべての日を営業日に設定しますか？`)) {
      return;
    }

    try {
      const promises = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDate(currentYear, currentMonth, day);
        promises.push(
          fetch('/api/admin/calendar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              date: dateStr,
              event: { type: 'open', title: '営業日' },
            }),
          })
        );
      }

      await Promise.all(promises);
      await fetchCalendarData();
      setMessage({ type: 'success', text: `${monthNames[currentMonth - 1]}をすべて営業日に設定しました` });
    } catch (error) {
      setMessage({ type: 'error', text: '一括設定中にエラーが発生しました' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  // 一括削除機能
  const clearAllEvents = async () => {
    if (!confirm(`${currentYear}年${monthNames[currentMonth - 1]}のすべてのイベントを削除しますか？`)) {
      return;
    }

    try {
      const promises = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDate(currentYear, currentMonth, day);
        if (calendarEvents[dateStr]) {
          promises.push(
            fetch('/api/admin/calendar', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ date: dateStr }),
            })
          );
        }
      }

      await Promise.all(promises);
      await fetchCalendarData();
      setMessage({ type: 'success', text: `${monthNames[currentMonth - 1]}のすべてのイベントを削除しました` });
    } catch (error) {
      setMessage({ type: 'error', text: '一括削除中にエラーが発生しました' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const renderCalendarDays = () => {
    const days = [];

    // 前月の空白日
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="p-2 bg-gray-100 border border-gray-200 rounded-lg opacity-50">
        </div>
      );
    }

    // 当月の日付
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(currentYear, currentMonth, day);
      const event = calendarEvents[dateStr];
      const today = new Date();
      const isToday = today.getFullYear() === currentYear && 
                     today.getMonth() + 1 === currentMonth && 
                     today.getDate() === day;

      let bgColor = 'bg-gray-50 hover:bg-gray-100';
      let textColor = 'text-gray-700';
      let borderColor = 'border-gray-200';

      if (event) {
        switch (event.type) {
          case 'open':
            bgColor = 'bg-emerald-50 hover:bg-emerald-100';
            textColor = 'text-emerald-700';
            borderColor = 'border-emerald-200';
            break;
          case 'event':
            bgColor = 'bg-amber-50 hover:bg-amber-100';
            textColor = 'text-amber-700';
            borderColor = 'border-amber-200';
            break;
          case 'closed':
            bgColor = 'bg-red-50 hover:bg-red-100';
            textColor = 'text-red-700';
            borderColor = 'border-red-200';
            break;
        }
      }

      if (isToday) {
        borderColor = 'border-blue-500 border-2';
      }

      days.push(
        <div
          key={day}
          className={`p-2 min-h-[80px] border ${borderColor} ${bgColor} ${textColor} text-sm rounded-lg cursor-pointer transition-all duration-200`}
          onClick={() => openEditModal(dateStr)}
        >
          <div className="font-semibold mb-1">{day}</div>
          {event && (
            <div className="text-xs leading-tight">
              <div className="font-medium">{event.title}</div>
              {event.location && (
                <div className="text-xs opacity-75 mt-1">
                  📍 {event.location}
                </div>
              )}
              {event.notes && (
                <div className="text-xs opacity-75 mt-1">
                  💭 {event.notes}
                </div>
              )}
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

  return (
    <div className="space-y-6">
      {/* ヘッダー部分 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            ダッシュボードに戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">カレンダー管理</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchCalendarData()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            🔄 データ再読み込み
          </button>
          <Link
            href="/api/admin/calendar/test"
            target="_blank"
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            🔧 API接続テスト
          </Link>
          <Link
            href="/store"
            target="_blank"
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
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
          カレンダーの日付をクリックして営業日・イベント出店・休業日を設定できます。変更は即座にストアページに反映されます。
        </p>
        <div className="mt-2 text-xs text-blue-600">
          現在登録済みイベント数: {Object.keys(calendarEvents).length}件
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 
          'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {currentYear}年 {monthNames[currentMonth - 1]}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={prevMonth}
                className="p-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
              <Button
                variant="outline"
                onClick={nextMonth}
                className="p-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          </div>
          
          {/* 一括操作ボタン */}
          <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">一括操作:</span>
              <Button
                onClick={setAllBusinessDays}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2"
              >
                🏢 全日営業日に設定
              </Button>
              <Button
                onClick={clearAllEvents}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 text-sm px-4 py-2"
              >
                🗑️ 全イベント削除
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* カレンダー凡例 */}
          <div className="flex flex-wrap gap-4 mb-6 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-emerald-50 border border-emerald-200 rounded mr-2"></div>
              <span className="text-gray-700">営業日</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-amber-50 border border-amber-200 rounded mr-2"></div>
              <span className="text-gray-700">イベント出店</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-50 border border-red-200 rounded mr-2"></div>
              <span className="text-gray-700">休業日</span>
            </div>
          </div>

          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((dayName, index) => (
              <div
                key={dayName}
                className={`p-2 text-center font-semibold text-sm ${
                  index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendarDays()}
          </div>
        </CardContent>
      </Card>

      {/* フッター情報 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600">
            最終更新: {new Date().toLocaleDateString('ja-JP', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              ダッシュボード
            </Link>
            <Link
              href="/admin/users"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              ユーザー管理
            </Link>
            <Link
              href="/admin/audit-logs"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              監査ログ
            </Link>
          </div>
        </div>
      </div>

      {/* 編集モーダル */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">
                  {selectedDate} の編集
                </h3>
                <Button
                  variant="ghost"
                  onClick={closeEditModal}
                  className="p-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">種類</label>
                  <select
                    value={editEvent.type}
                    onChange={(e) => {
                      const newType = e.target.value as CalendarEvent['type'];
                      setEditEvent(prev => ({ 
                        ...prev, 
                        type: newType,
                        title: getDefaultTitle(newType)
                      }));
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="open">営業日</option>
                    <option value="event">イベント出店</option>
                    <option value="closed">休業日</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">タイトル</label>
                  <input
                    type="text"
                    value={editEvent.title}
                    onChange={(e) => setEditEvent(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="イベント名や休業理由など"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {editEvent.type === 'event' ? '場所' : '補足事項'}
                  </label>
                  <input
                    type="text"
                    value={editEvent.type === 'event' ? (editEvent.location || '') : (editEvent.notes || '')}
                    onChange={(e) => {
                      if (editEvent.type === 'event') {
                        setEditEvent(prev => ({ ...prev, location: e.target.value }));
                      } else {
                        setEditEvent(prev => ({ ...prev, notes: e.target.value }));
                      }
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder={
                      editEvent.type === 'event' ? 'イベント開催場所' : 
                      editEvent.type === 'closed' ? '休業理由など' : 
                      '備考・お知らせなど'
                    }
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={saveEvent} className="flex-1">
                    保存
                  </Button>
                  <Button onClick={deleteEvent} variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                    削除
                  </Button>
                  <Button onClick={closeEditModal} variant="ghost">
                    キャンセル
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}