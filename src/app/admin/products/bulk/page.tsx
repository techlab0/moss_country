'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getProductSlug } from '@/lib/adapters';
import { PRODUCT_CATEGORIES, resolveCategory } from '@/lib/productCategories';
import { compareByReading } from '@/lib/productSort';
import { useSalesItems, SalesItemSelect } from '@/components/admin/SalesItemPicker';
import { includesNormalized } from '@/lib/searchText';
import type { Product } from '@/types/sanity';

// 商品の一括編集。クイック編集と同じ項目（ふりがな・スラッグ・カテゴリ・売上項目・表示）を
// 全商品まとめて書き換えるための画面。変更した行だけをまとめて保存する。
// 商品名・価格・画像などの本格的な編集は個別の編集ページで行う。

interface EditableRow {
  _id: string;
  name: string;
  nameReading: string;
  slug: string;
  category: string;
  isVisible: boolean;
  salesItemId: string | null;
}

function toRow(product: Product): EditableRow {
  return {
    _id: product._id,
    name: product.name,
    nameReading: product.nameReading || '',
    slug: getProductSlug(product),
    category: resolveCategory(product.category),
    isVisible: product.isVisible !== false,
    salesItemId: product.salesItemId ?? null,
  };
}

function isChanged(row: EditableRow, original: EditableRow): boolean {
  return (
    row.nameReading !== original.nameReading ||
    row.slug !== original.slug ||
    row.category !== original.category ||
    row.isVisible !== original.isVisible ||
    row.salesItemId !== original.salesItemId
  );
}

export default function BulkEditProductsPage() {
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [originals, setOriginals] = useState<Map<string, EditableRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [nameQuery, setNameQuery] = useState('');
  const [onlyUnlinked, setOnlyUnlinked] = useState(false);
  const { items: salesItems, loading: salesItemsLoading } = useSalesItems();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products');
      if (!res.ok) throw new Error('商品の取得に失敗しました');
      const products: Product[] = await res.json();
      const mapped = products.map(toRow).sort(
        (a, b) =>
          a.category.localeCompare(b.category, 'ja') ||
          compareByReading(
            { name: a.name, nameReading: a.nameReading },
            { name: b.name, nameReading: b.nameReading }
          )
      );
      setRows(mapped);
      setOriginals(new Map(mapped.map((row) => [row._id, { ...row }])));
    } catch (error) {
      console.error('商品一覧の取得に失敗:', error);
      setMessage('商品一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateRow = (id: string, patch: Partial<EditableRow>) => {
    setRows((prev) => prev.map((row) => (row._id === id ? { ...row, ...patch } : row)));
  };

  const changedRows = useMemo(
    () => rows.filter((row) => {
      const original = originals.get(row._id);
      return original ? isChanged(row, original) : false;
    }),
    [rows, originals]
  );

  const visibleRows = useMemo(() => {
    // ひらがな入力でカタカナの商品名にも一致させる（ふりがな・スラッグも検索対象）
    const query = nameQuery.trim();
    return rows.filter((row) => {
      if (onlyUnlinked && row.salesItemId) return false;
      if (!query) return true;
      return includesNormalized(`${row.name} ${row.nameReading} ${row.slug}`, query);
    });
  }, [rows, nameQuery, onlyUnlinked]);

  const handleSave = async () => {
    if (changedRows.length === 0) return;

    const invalid = changedRows.find((row) => !row.slug.trim() || row.slug.trim() === '-');
    if (invalid) {
      setMessage(`「${invalid.name}」のスラッグが空です。入力してから保存してください。`);
      return;
    }

    setSaving(true);
    setMessage(null);
    const failed: string[] = [];

    // 件数が多いと同時リクエストでSanityのレート制限に当たるため、1件ずつ順番に保存する
    for (const row of changedRows) {
      try {
        const res = await fetch(`/api/admin/products/${row._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nameReading: row.nameReading,
            slug: { _type: 'slug', current: row.slug.trim() },
            category: row.category,
            isVisible: row.isVisible,
            salesItemId: row.salesItemId,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        setOriginals((prev) => new Map(prev).set(row._id, { ...row }));
      } catch (error) {
        console.error(`一括編集の保存に失敗しました (${row.name}):`, error);
        failed.push(row.name);
      }
    }

    setSaving(false);
    setMessage(
      failed.length === 0
        ? `${changedRows.length}件を保存しました`
        : `${changedRows.length - failed.length}件を保存しました。失敗: ${failed.join('、')}`
    );
  };

  const handleReset = () => {
    setRows((prev) => prev.map((row) => originals.get(row._id) ?? row));
    setMessage(null);
  };

  const unlinkedCount = rows.filter((row) => !row.salesItemId).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">商品の一括編集</h1>
          <p className="text-gray-600 mt-2">
            クイック編集と同じ項目をまとめて変更できます。商品名・価格・画像は個別の編集ページで変更してください。
          </p>
        </div>
        <Link href="/admin/products" className="text-sm text-moss-green hover:underline">
          ← 商品一覧に戻る
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="商品名・ふりがな・スラッグで絞り込み"
            className="flex-1 min-w-60 px-3 py-2 text-sm border border-gray-300 rounded-md"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={onlyUnlinked}
              onChange={(e) => setOnlyUnlinked(e.target.checked)}
              className="h-4 w-4 border-gray-300 rounded"
            />
            売上項目が未設定のものだけ（{unlinkedCount}件）
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            {loading ? '読み込み中...' : `${visibleRows.length} / ${rows.length}件を表示`}
            {changedRows.length > 0 && (
              <span className="ml-2 text-amber-700 font-medium">（未保存の変更 {changedRows.length}件）</span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving || changedRows.length === 0}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              変更を取り消す
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || changedRows.length === 0}
              className="px-4 py-2 text-sm bg-moss-green text-white rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {saving ? '保存中...' : `変更を保存（${changedRows.length}件）`}
            </button>
          </div>
        </div>

        {message && <p className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded px-3 py-2">{message}</p>}
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">商品名</th>
              <th className="px-3 py-2 text-left font-medium">売上明細の項目</th>
              <th className="px-3 py-2 text-left font-medium">ふりがな</th>
              <th className="px-3 py-2 text-left font-medium">スラッグ</th>
              <th className="px-3 py-2 text-left font-medium">カテゴリ</th>
              <th className="px-3 py-2 text-left font-medium">表示</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleRows.map((row) => {
              const original = originals.get(row._id);
              const changed = original ? isChanged(row, original) : false;
              return (
                <tr key={row._id} className={changed ? 'bg-amber-50' : undefined}>
                  {/* 商品名を折り返すとスマホで1行が3行分の高さになり一覧性が落ちるため、
                      折り返さずテーブルごと横スクロールさせる */}
                  <td className="px-3 py-2 align-middle whitespace-nowrap">
                    <Link
                      href={`/admin/products/${row._id}/edit`}
                      className="text-gray-900 hover:text-moss-green hover:underline"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 align-middle min-w-52">
                    <SalesItemSelect
                      items={salesItems}
                      loading={salesItemsLoading}
                      value={row.salesItemId}
                      onChange={(salesItemId) => updateRow(row._id, { salesItemId })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white disabled:bg-gray-100"
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      type="text"
                      value={row.nameReading}
                      onChange={(e) => updateRow(row._id, { nameReading: e.target.value })}
                      placeholder="こけだま"
                      className="w-36 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <input
                      type="text"
                      value={row.slug}
                      onChange={(e) => updateRow(row._id, { slug: e.target.value })}
                      className="w-48 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                    />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <select
                      value={row.category}
                      onChange={(e) => updateRow(row._id, { category: e.target.value })}
                      className="px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
                    >
                      {PRODUCT_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 align-middle text-center">
                    <input
                      type="checkbox"
                      checked={row.isVisible}
                      onChange={(e) => updateRow(row._id, { isVisible: e.target.checked })}
                      className="h-4 w-4 border-gray-300 rounded"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && visibleRows.length === 0 && (
          <p className="px-3 py-6 text-sm text-gray-500 text-center">該当する商品がありません</p>
        )}
      </div>
    </div>
  );
}
