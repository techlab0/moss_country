'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Charge {
  _id: string;
  amount: number;
  description?: string;
  status: 'pending' | 'paid' | 'cancelled';
  qrCodeDataUrl?: string;
  paymentUrl?: string;
}

export default function InStoreChargePage() {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [charge, setCharge] = useState<Charge | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleCreate = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      alert('金額を入力してください');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/admin/in-store-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: value, description }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '決済リンクの発行に失敗しました');
      }
      const data = await response.json();
      const newCharge: Charge = {
        _id: data.charge._id,
        amount: value,
        description,
        status: 'pending',
        qrCodeDataUrl: data.qrCodeDataUrl,
        paymentUrl: data.paymentUrl,
      };
      setCharge(newCharge);
      startPolling(newCharge._id);
    } catch (err) {
      alert(err instanceof Error ? err.message : '決済リンクの発行に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const startPolling = (id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/in-store-charge/${id}`);
        if (!response.ok) return;
        const data = await response.json();
        if (data.charge.status !== 'pending') {
          setCharge(prev => prev ? { ...prev, status: data.charge.status } : prev);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // ポーリング中の一時的なエラーは無視して次回に再試行する
      }
    }, 3000);
  };

  const handleReset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setCharge(null);
    setAmount('');
    setDescription('');
  };

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <Link href="/admin/sales" className="text-moss-green hover:underline text-sm font-medium">
          ← 売上管理に戻る
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">店頭QRコード決済</h1>
        <p className="text-gray-600 mt-1">
          金額を入力してQRコードを発行し、お客様のスマホで読み取ってお支払いいただきます。
        </p>
      </div>

      {!charge && (
        <div className="bg-white shadow rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">金額</label>
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-4 text-3xl text-right border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">備考（任意）</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: コケ玉 大"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-4 bg-moss-green text-white text-lg font-medium rounded-md hover:bg-moss-green/90 disabled:opacity-50"
          >
            {creating ? '発行中...' : 'QRコードを発行'}
          </button>
        </div>
      )}

      {charge && (
        <div className="bg-white shadow rounded-lg p-6 text-center space-y-4">
          <p className="text-3xl font-bold text-gray-900">¥{charge.amount.toLocaleString()}</p>
          {charge.description && <p className="text-gray-600">{charge.description}</p>}

          {charge.status === 'pending' && (
            <>
              {charge.qrCodeDataUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={charge.qrCodeDataUrl} alt="決済用QRコード" className="mx-auto w-64 h-64" />
              )}
              <p className="text-sm text-gray-500">お客様のスマホでQRコードを読み取ってお支払いください</p>
              <p className="text-sm text-moss-green animate-pulse">支払い待ち...</p>
            </>
          )}

          {charge.status === 'paid' && (
            <div className="space-y-2">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">✓</span>
              </div>
              <p className="text-emerald-600 font-medium">支払いが完了しました</p>
            </div>
          )}

          {charge.status === 'cancelled' && (
            <p className="text-red-600 font-medium">支払いがキャンセル・失敗しました</p>
          )}

          <button
            onClick={handleReset}
            className="w-full py-3 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {charge.status === 'pending' ? '取り消して新しく発行' : '新しい決済を発行'}
          </button>
        </div>
      )}
    </div>
  );
}
