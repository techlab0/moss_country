'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SalesItem {
  _id: string;
  category: string;
  name: string;
  pricingType: 'fixed' | 'variable';
  unitPrice?: number;
  sortOrder: number;
  isActive: boolean;
}

const categoryLabels: Record<string, string> = {
  moss: 'コケ',
  product: '商品',
  figure: 'フィギュア',
  workshop: 'ワークショップ',
  gacha: 'ガチャ',
  other: 'その他',
};

const emptyForm = {
  category: 'moss',
  name: '',
  pricingType: 'fixed' as 'fixed' | 'variable',
  unitPrice: 0,
  sortOrder: 0,
};

export default function SalesItemsPage() {
  const [items, setItems] = useState<SalesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/sales-items');
      if (!response.ok) throw new Error('取得に失敗しました');
      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      alert('項目名を入力してください');
      return;
    }
    setCreating(true);
    try {
      const response = await fetch('/api/admin/sales-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error('作成に失敗しました');
      setForm(emptyForm);
      await fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : '作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<SalesItem>) => {
    const previous = items;
    setItems(items.map(item => item._id === id ? { ...item, ...updates } : item));
    try {
      const response = await fetch(`/api/admin/sales-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('更新に失敗しました');
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新に失敗しました');
      setItems(previous);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`「${name}」を完全に削除しますか？（過去の売上記録には影響しません）`)) return;
    try {
      const response = await fetch(`/api/admin/sales-items/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('削除に失敗しました');
      setItems(items.filter(item => item._id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const response = await fetch('/api/admin/sales-items/seed', { method: 'POST' });
      if (!response.ok) throw new Error('初期データの投入に失敗しました');
      const data = await response.json();
      alert(`${data.createdCount}件を追加しました（${data.skippedCount}件は既に存在したためスキップ）`);
      await fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : '初期データの投入に失敗しました');
    } finally {
      setSeeding(false);
    }
  };

  const grouped = items.reduce<Record<string, SalesItem[]>>((acc, item) => {
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {});

  if (loading) {
    return <div className="animate-pulse h-64 bg-gray-200 rounded"></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/admin/sales" className="text-moss-green hover:underline text-sm font-medium">
          ← 売上管理に戻る
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">売上項目カタログ</h1>
        <p className="text-gray-600 mt-1">日別売上入力で使う項目を管理します</p>
      </div>

      {items.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 mb-2">まだ項目が登録されていません。紙の集計表にある項目一式を初期投入できます。</p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {seeding ? '投入中...' : '初期データを投入'}
          </button>
        </div>
      )}

      {/* 新規追加フォーム */}
      <div className="bg-white shadow rounded-lg p-4 space-y-3">
        <h2 className="font-medium text-gray-900">新規項目を追加</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="col-span-2 sm:col-span-1 px-2 py-2 border border-gray-300 rounded-md text-sm"
          >
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="項目名"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="col-span-2 px-2 py-2 border border-gray-300 rounded-md text-sm"
          />
          <select
            value={form.pricingType}
            onChange={(e) => setForm({ ...form, pricingType: e.target.value as 'fixed' | 'variable' })}
            className="px-2 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="fixed">数量入力</option>
            <option value="variable">金額直接入力</option>
          </select>
          {form.pricingType === 'fixed' && (
            <input
              type="number"
              placeholder="単価"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
              className="px-2 py-2 border border-gray-300 rounded-md text-sm"
            />
          )}
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="px-4 py-2 bg-moss-green text-white rounded-md text-sm hover:bg-moss-green/90 disabled:opacity-50"
        >
          追加
        </button>
      </div>

      {/* カテゴリごとの一覧 */}
      {Object.entries(categoryLabels).map(([category, label]) => (
        <div key={category} className="bg-white shadow rounded-lg">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h2 className="font-medium text-gray-900">{label}</h2>
          </div>
          <ul className="divide-y">
            {(grouped[category] || []).map(item => (
              <li key={item._id} className="px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
                <div className={item.isActive ? '' : 'opacity-40'}>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.pricingType === 'fixed' ? `単価 ¥${(item.unitPrice || 0).toLocaleString()}` : '金額直接入力'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleUpdate(item._id, { isActive: !item.isActive })}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    {item.isActive ? '無効化' : '有効化'}
                  </button>
                  <button
                    onClick={() => handleDelete(item._id, item.name)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
            {(!grouped[category] || grouped[category].length === 0) && (
              <li className="px-4 py-3 text-sm text-gray-400">項目がありません</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
