'use client';

import { useEffect, useRef, useState } from 'react';

// 商品編集/新規登録フォームで「この商品のEC購入を売上集計のどの項目に合算するか」を選ぶ
// 検索式コンボボックス。既存の売上項目一覧APIを使い、その場で新規項目も追加できる。

export interface SalesItem {
  _id: string;
  category: string;
  name: string;
  pricingType: 'fixed' | 'variable';
  unitPrice?: number;
  sortOrder: number;
  isActive: boolean;
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'moss', label: 'コケ' },
  { value: 'product', label: '商品' },
  { value: 'figure', label: 'フィギュア' },
  { value: 'workshop', label: 'ワークショップ' },
  { value: 'gacha', label: 'ガチャ' },
  { value: 'other', label: 'その他' },
];

function categoryLabel(value: string): string {
  return CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? value;
}

interface SalesItemPickerProps {
  salesItemId: string | null;
  onChange: (salesItemId: string | null) => void;
}

export function SalesItemPicker({ salesItemId, onChange }: SalesItemPickerProps) {
  const [items, setItems] = useState<SalesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCategory, setNewCategory] = useState('product');
  const [newName, setNewName] = useState('');
  const [newPricingType, setNewPricingType] = useState<'fixed' | 'variable'>('fixed');
  const [newUnitPrice, setNewUnitPrice] = useState('');
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/admin/sales-items')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('failed'))))
      .then((data) => {
        if (mounted) setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch((err) => console.error('売上項目の取得に失敗しました:', err))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = salesItemId ? items.find((i) => i._id === salesItemId) : undefined;

  const candidates = items
    .filter((item) => {
      if (!item.isActive) return false;
      if (!query.trim()) return true;
      const haystack = `${categoryLabel(item.category)} ${item.name}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    })
    .slice(0, 30);

  const handleSelect = (item: SalesItem) => {
    onChange(item._id);
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      alert('項目名を入力してください');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/sales-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newCategory,
          name: newName.trim(),
          pricingType: newPricingType,
          unitPrice: newPricingType === 'fixed' ? Number(newUnitPrice) || 0 : undefined,
          sortOrder: 0,
        }),
      });
      if (!res.ok) throw new Error('作成に失敗しました');
      const { item } = await res.json();
      setItems((prev) => [...prev, item]);
      onChange(item._id);
      setShowNewForm(false);
      setNewName('');
      setNewUnitPrice('');
      setOpen(false);
    } catch (err) {
      console.error(err);
      alert('売上項目の作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        売上明細の項目（集計での商品名）
      </label>
      <p className="text-xs text-gray-500 mb-2">
        この商品がEC購入されたとき、売上集計の「商品別明細」でどの項目に合算するかを指定します。未設定の場合は商品名でそのまま表示されます。
      </p>

      {selected ? (
        <div className="flex items-center justify-between border border-gray-300 rounded-md px-3 py-2 bg-gray-50">
          <span className="text-sm text-gray-900">
            {categoryLabel(selected.category)} / {selected.name}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ✕ クリア
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={loading ? '読み込み中...' : '項目名やカテゴリで検索'}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      {open && !selected && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {candidates.length > 0 ? (
            candidates.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-b last:border-0"
              >
                <span className="text-gray-500">{categoryLabel(item.category)}</span>
                {' / '}
                <span className="text-gray-900">{item.name}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-gray-500">該当する項目がありません</p>
          )}
        </div>
      )}

      <div className="mt-2">
        <button
          type="button"
          onClick={() => setShowNewForm((prev) => !prev)}
          className="text-sm text-moss-green hover:underline"
        >
          {showNewForm ? '− 新規項目の追加を閉じる' : '+ 新規項目を追加'}
        </button>
      </div>

      {showNewForm && (
        <div className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">カテゴリ</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">項目名</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                placeholder="例: ハイゴケ(大)"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">価格の入力方法</label>
              <select
                value={newPricingType}
                onChange={(e) => setNewPricingType(e.target.value as 'fixed' | 'variable')}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              >
                <option value="fixed">数量入力（単価×数量）</option>
                <option value="variable">金額を直接入力</option>
              </select>
            </div>
            {newPricingType === 'fixed' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">単価 (円)</label>
                <input
                  type="number"
                  min={0}
                  value={newUnitPrice}
                  onChange={(e) => setNewUnitPrice(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                  placeholder="0"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="px-3 py-1.5 bg-moss-green text-white rounded-md text-sm hover:opacity-90 disabled:opacity-50"
            >
              {creating ? '作成中...' : '作成して選択'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
