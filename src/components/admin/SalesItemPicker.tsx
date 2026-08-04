'use client';

import { useEffect, useState } from 'react';

// 商品編集/新規登録フォームで「この商品のEC購入を売上集計のどの項目に合算するか」を選ぶ
// ドロップダウン。既存の売上項目一覧APIを使い、一覧に無ければその場で新規項目も追加できる。
//
// 商品名の入力より先にここで項目を選ぶ運用にしている（フォームの先頭に配置）。
// 項目を選ぶと呼び出し側が商品名を自動入力するため、同じ商品を別名で二重登録するのを防げる。

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

// ドロップダウンで「新規項目を追加」を選んだことを表す番兵値（Sanityの_idと衝突しない値）
const NEW_ITEM_VALUE = '__new__';

function optionLabel(item: SalesItem): string {
  return item.pricingType === 'fixed' && item.unitPrice
    ? `${item.name}（¥${item.unitPrice.toLocaleString()}）`
    : item.name;
}

/**
 * 売上項目の一覧を1回だけ取得する。商品一覧の一括編集のように同じ選択肢を多数並べる画面で、
 * 行ごとにAPIを叩かないためにフックとして切り出している。
 */
export function useSalesItems(): { items: SalesItem[]; loading: boolean; addItem: (item: SalesItem) => void } {
  const [items, setItems] = useState<SalesItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  const addItem = (item: SalesItem) => setItems((prev) => [...prev, item]);

  return { items, loading, addItem };
}

interface SalesItemSelectProps {
  items: SalesItem[];
  loading?: boolean;
  value: string | null;
  onChange: (salesItemId: string | null, item?: SalesItem | null) => void;
  /** 「＋ 新規項目を追加...」を選べるようにする場合に渡す */
  onRequestCreate?: () => void;
  className?: string;
}

/** 売上項目のドロップダウン本体。カテゴリごとにグループ化して表示する */
export function SalesItemSelect({
  items,
  loading = false,
  value,
  onChange,
  onRequestCreate,
  className,
}: SalesItemSelectProps) {
  // 選択中の項目が無効化済みでも選択肢から消えないよう、有効な項目に加えて現在値も残す
  const selectableItems = items.filter((item) => item.isActive || item._id === value);

  const groups = CATEGORY_OPTIONS.map((category) => ({
    ...category,
    items: selectableItems
      .filter((item) => item.category === category.value)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, 'ja')),
  })).filter((group) => group.items.length > 0);

  return (
    <select
      value={value ?? ''}
      onChange={(e) => {
        if (e.target.value === NEW_ITEM_VALUE) {
          onRequestCreate?.();
          return;
        }
        if (!e.target.value) {
          onChange(null, null);
          return;
        }
        onChange(e.target.value, items.find((item) => item._id === e.target.value) ?? null);
      }}
      disabled={loading}
      className={
        className ??
        'w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100'
      }
    >
      <option value="">{loading ? '読み込み中...' : '未設定'}</option>
      {groups.map((group) => (
        <optgroup key={group.value} label={group.label}>
          {group.items.map((item) => (
            <option key={item._id} value={item._id}>
              {optionLabel(item)}
            </option>
          ))}
        </optgroup>
      ))}
      {onRequestCreate && <option value={NEW_ITEM_VALUE}>＋ 新規項目を追加...</option>}
    </select>
  );
}

interface SalesItemPickerProps {
  salesItemId: string | null;
  /** 選択された項目そのものも渡す（呼び出し側が商品名や価格を自動入力できるようにするため） */
  onChange: (salesItemId: string | null, item?: SalesItem | null) => void;
}

export function SalesItemPicker({ salesItemId, onChange }: SalesItemPickerProps) {
  const { items, loading, addItem } = useSalesItems();
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCategory, setNewCategory] = useState('product');
  const [newName, setNewName] = useState('');
  const [newPricingType, setNewPricingType] = useState<'fixed' | 'variable'>('fixed');
  const [newUnitPrice, setNewUnitPrice] = useState('');
  const [creating, setCreating] = useState(false);

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
      addItem(item);
      onChange(item._id, item);
      setShowNewForm(false);
      setNewName('');
      setNewUnitPrice('');
    } catch (err) {
      console.error(err);
      alert('売上項目の作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        売上明細の項目（集計での商品名）
      </label>
      <p className="text-xs text-gray-500 mb-2">
        この商品がEC購入されたとき、売上集計の「商品別明細」でどの項目に合算するかを指定します。先にここで項目を選ぶと、商品名が自動で入力されます。
      </p>

      <SalesItemSelect
        items={items}
        loading={loading}
        value={salesItemId}
        onChange={onChange}
        onRequestCreate={() => setShowNewForm(true)}
      />

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
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-100"
            >
              キャンセル
            </button>
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
