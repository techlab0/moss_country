'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

interface DayRow {
  date: string;
  storeTotal: number;
  ecTotal: number;
  total: number;
  cash: number;
  payPay: number;
  card: number;
  qr: number;
}

interface MonthlySummary {
  grandTotal: number;
  storeTotal: number;
  ecTotal: number;
  methodTotals: { cash: number; payPay: number; card: number; qr: number };
  categoryTotals: Record<string, number>;
  discountTotal: number;
  taxExcludedTotal: number;
  taxAmountTotal: number;
  visitorTotal: number;
  purchaseGroupTotal: number;
  avgPerGroup: number;
  businessDays: number;
}

interface MonthlyReport {
  month: string;
  days: DayRow[];
  summary: MonthlySummary;
  previousSummary: MonthlySummary | null;
}

const categoryLabels: Record<string, string> = {
  moss: 'コケ',
  product: '商品',
  figure: 'フィギュア',
  workshop: 'ワークショップ',
  gacha: 'ガチャ',
  other: 'その他',
};
const categoryOrder = ['moss', 'product', 'figure', 'workshop', 'gacha', 'other'];

const methodLabels: Record<string, string> = {
  cash: '現金',
  payPay: 'PayPay',
  card: 'クレジット(手動)',
  qr: 'クレジット(QR)',
};
const methodOrder = ['cash', 'payPay', 'card', 'qr'] as const;

function currentMonthJst(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 7);
}

function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split('-').map(Number);
  const d = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month: string): string {
  const [year, mon] = month.split('-');
  return `${year}年${Number(mon)}月`;
}

/** 前月比の変化率（%）。前月が0のときはnull（表示しない） */
function changeRate(current: number, previous: number | undefined): number | null {
  if (!previous || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function ChangeBadge({ rate }: { rate: number | null }) {
  if (rate === null) return null;
  const positive = rate >= 0;
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${positive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      {positive ? '↑' : '↓'} {Math.abs(rate)}%
    </span>
  );
}

function SummaryCard({
  label,
  value,
  rate,
  sub,
}: {
  label: string;
  value: string;
  rate?: number | null;
  sub?: string;
}) {
  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-500">{label}</p>
        {rate !== undefined && <ChangeBadge rate={rate} />}
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

/** 内訳を横棒で表示する共通コンポーネント */
function BreakdownBars({
  rows,
  colorClass,
}: {
  rows: Array<{ label: string; amount: number }>;
  colorClass: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return (
    <div className="space-y-3">
      {rows.map(row => {
        const percent = total > 0 ? Math.round((row.amount / total) * 1000) / 10 : 0;
        return (
          <div key={row.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">{row.label}</span>
              <span className="text-gray-900 font-medium">
                ¥{row.amount.toLocaleString()}
                <span className="text-xs text-gray-400 ml-1">({percent}%)</span>
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
      {total <= 0 && <p className="text-sm text-gray-400">データがありません</p>}
    </div>
  );
}

export default function MonthlySalesPage() {
  const [month, setMonth] = useState(currentMonthJst());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (targetMonth: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/sales/monthly?month=${targetMonth}`);
      if (!response.ok) throw new Error('取得に失敗しました');
      setReport(await response.json());
    } catch (err) {
      console.error('月次売上取得エラー:', err);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(month);
  }, [month, load]);

  const isCurrentMonth = month >= currentMonthJst();
  const summary = report?.summary;
  const prev = report?.previousSummary || undefined;

  const chartData = useMemo(() => {
    return (report?.days || []).map(day => ({
      ...day,
      label: String(Number(day.date.slice(8, 10))),
    }));
  }, [report]);

  const hasAnySales = (summary?.grandTotal || 0) !== 0 || (summary?.storeTotal || 0) > 0;

  return (
    <div className="space-y-4 max-w-4xl pb-8">
      <div>
        <Link href="/admin/sales" className="text-moss-green hover:underline text-sm font-medium">
          ← 売上管理に戻る
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">月次レポート</h1>
      </div>

      {/* 月ナビゲーション */}
      <div className="bg-white shadow rounded-lg p-3 flex items-center justify-between">
        <button
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
        >
          ← {monthLabel(shiftMonth(month, -1))}
        </button>
        <span className="text-lg font-bold text-gray-900">{monthLabel(month)}</span>
        <button
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={isCurrentMonth}
          className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-30"
        >
          {monthLabel(shiftMonth(month, 1))} →
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="animate-pulse h-32 bg-gray-200 rounded-lg"></div>
          <div className="animate-pulse h-64 bg-gray-200 rounded-lg"></div>
        </div>
      ) : !report || !summary ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          月次データの取得に失敗しました。再読み込みしてください。
        </div>
      ) : (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              label="総売上"
              value={`¥${summary.grandTotal.toLocaleString()}`}
              rate={changeRate(summary.grandTotal, prev?.grandTotal)}
              sub={`前月 ¥${(prev?.grandTotal || 0).toLocaleString()}`}
            />
            <SummaryCard
              label="店舗売上"
              value={`¥${summary.storeTotal.toLocaleString()}`}
              rate={changeRate(summary.storeTotal, prev?.storeTotal)}
            />
            <SummaryCard
              label="EC（オンライン）売上"
              value={`¥${summary.ecTotal.toLocaleString()}`}
              rate={changeRate(summary.ecTotal, prev?.ecTotal)}
            />
            <SummaryCard
              label="客単価（購入1組あたり）"
              value={`¥${summary.avgPerGroup.toLocaleString()}`}
              rate={changeRate(summary.avgPerGroup, prev?.avgPerGroup)}
            />
            <SummaryCard
              label="来店者数"
              value={`${summary.visitorTotal.toLocaleString()}名`}
              rate={changeRate(summary.visitorTotal, prev?.visitorTotal)}
            />
            <SummaryCard
              label="購入組数"
              value={`${summary.purchaseGroupTotal.toLocaleString()}組`}
              rate={changeRate(summary.purchaseGroupTotal, prev?.purchaseGroupTotal)}
            />
            <SummaryCard
              label="割引合計"
              value={`−¥${summary.discountTotal.toLocaleString()}`}
            />
            <SummaryCard
              label="営業日数（売上のあった日）"
              value={`${summary.businessDays}日`}
            />
          </div>

          {/* 税内訳 */}
          <div className="bg-white shadow rounded-lg p-4 flex flex-wrap gap-x-8 gap-y-1 text-sm">
            <span className="text-gray-500">（内訳）税抜金額: <span className="text-gray-900 font-medium">¥{summary.taxExcludedTotal.toLocaleString()}</span></span>
            <span className="text-gray-500">消費税（10%）: <span className="text-gray-900 font-medium">¥{summary.taxAmountTotal.toLocaleString()}</span></span>
          </div>

          {!hasAnySales ? (
            <div className="bg-white shadow rounded-lg p-8 text-center text-gray-400">
              この月の売上データはありません
            </div>
          ) : (
            <>
              {/* 日別売上グラフ */}
              <div className="bg-white shadow rounded-lg p-4">
                <h2 className="font-medium text-gray-900 mb-3">日別売上</h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={1} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `¥${v.toLocaleString()}`} width={70} />
                      <Tooltip
                        formatter={(value, name) => [`¥${Number(value).toLocaleString()}`, String(name)]}
                        labelFormatter={(label) => `${monthLabel(month)}${label}日`}
                      />
                      <Legend />
                      <Bar dataKey="storeTotal" name="店舗" stackId="a" fill="#3D5A2E" />
                      <Bar dataKey="ecTotal" name="EC" stackId="a" fill="#8DB580" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 支払い方法別内訳 */}
              <div className="bg-white shadow rounded-lg p-4">
                <h2 className="font-medium text-gray-900 mb-3">支払い方法別（店舗売上）</h2>
                <BreakdownBars
                  rows={methodOrder.map(method => ({
                    label: methodLabels[method],
                    amount: summary.methodTotals[method] || 0,
                  }))}
                  colorClass="bg-moss-green"
                />
              </div>

              {/* カテゴリー別内訳 */}
              <div className="bg-white shadow rounded-lg p-4">
                <h2 className="font-medium text-gray-900 mb-3">カテゴリー別（商品定価ベース）</h2>
                <BreakdownBars
                  rows={categoryOrder
                    .map(category => ({
                      label: categoryLabels[category] || category,
                      amount: summary.categoryTotals[category] || 0,
                    }))
                    .filter(row => row.amount > 0)}
                  colorClass="bg-emerald-500"
                />
                <p className="text-xs text-gray-400 mt-3">
                  ※カテゴリー別は割引前の定価ベースの内訳です。実際の受取額との差は「割引合計」をご参照ください。
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
