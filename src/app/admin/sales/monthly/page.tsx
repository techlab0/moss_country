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
  visitors: number;
  workshopTotal: number;
  note: string;
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
  avgPerVisitor: number;
  avgPerBusinessDay: number;
  purchaseRate: number;
  businessDays: number;
}

interface WeekdayRow {
  weekday: number;
  total: number;
  businessDays: number;
  avg: number;
  visitors: number;
  visitorDays: number;
  visitorAvg: number;
}

interface HourRow {
  hour: number;
  total: number;
  count: number;
}

interface ItemRow {
  name: string;
  quantity: number;
  amount: number;
}

interface MonthlyReport {
  month: string;
  days: DayRow[];
  summary: MonthlySummary;
  previousSummary: MonthlySummary | null;
  weekdays: WeekdayRow[];
  hours: HourRow[];
  hourCoveredTotal: number;
  items: ItemRow[];
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

const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];

/** その月の日数 */
function daysInMonthCount(month: string): number {
  const [year, mon] = month.split('-').map(Number);
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}

function todayJst(): { month: string; day: number } {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return { month: jst.toISOString().slice(0, 7), day: jst.getUTCDate() };
}

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

/** 前後の月ボタン用。表示中の月と同じ年なら年を省いて短くする */
function shortMonthLabel(month: string, baseMonth: string): string {
  const [year, mon] = month.split('-');
  return year === baseMonth.slice(0, 4) ? `${Number(mon)}月` : `${year}年${Number(mon)}月`;
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
      <p className="text-xs sm:text-sm text-gray-500 leading-snug">{label}</p>
      <div className="flex items-baseline flex-wrap gap-x-2 mt-1">
        <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
        {rate !== undefined && <ChangeBadge rate={rate} />}
      </div>
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

/** 数字を読んだあと何をすればいいか迷わないよう、その場に判断材料を添える */
function InsightNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-xs text-gray-500 leading-relaxed bg-gray-50 rounded-md p-3">
      {children}
    </p>
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

  // ワークショップが立つ日（イベント日）は売上の山になりやすいので、日別で並べて確かめられるようにする
  const workshopDays = useMemo(
    () => chartData.filter(day => day.workshopTotal > 0),
    [chartData]
  );

  const workshopMonthTotal = useMemo(
    () => chartData.reduce((sum, day) => sum + day.workshopTotal, 0),
    [chartData]
  );

  // 「前半は強かった」といった感触を数字で確かめられるようにする
  const halfComparison = useMemo(() => {
    if (chartData.length === 0) return null;
    const first = chartData.filter(day => Number(day.date.slice(8, 10)) <= 15);
    const second = chartData.filter(day => Number(day.date.slice(8, 10)) > 15);
    const sum = (rows: typeof chartData, key: 'total' | 'workshopTotal' | 'visitors') =>
      rows.reduce((acc, row) => acc + row[key], 0);
    return {
      firstTotal: sum(first, 'total'),
      secondTotal: sum(second, 'total'),
      firstWorkshop: sum(first, 'workshopTotal'),
      secondWorkshop: sum(second, 'workshopTotal'),
      firstVisitors: sum(first, 'visitors'),
      secondVisitors: sum(second, 'visitors'),
      firstDays: first.filter(row => row.total > 0).length,
      secondDays: second.filter(row => row.total > 0).length,
    };
  }, [chartData]);

  // 前半と後半の差が何で説明できるのかを、条件文ではなく実数から言い切る
  const halfInsight = useMemo(() => {
    if (!halfComparison) return null;
    const { firstTotal, secondTotal, firstWorkshop, secondWorkshop } = halfComparison;
    const totalDiff = firstTotal - secondTotal;
    const workshopDiff = firstWorkshop - secondWorkshop;
    const larger = Math.max(firstTotal, secondTotal);
    // 差が小さいうちは無理に理由づけしない
    if (larger <= 0 || Math.abs(totalDiff) < larger * 0.05) return { kind: 'even' as const };
    const strongHalf = totalDiff > 0 ? '前半' : '後半';
    const gap = Math.abs(totalDiff);
    // ワークショップが同じ向きに効いているか、逆に足を引っ張っているか
    const sameDirection = totalDiff > 0 === workshopDiff > 0 && workshopDiff !== 0;
    const share = sameDirection ? Math.round((Math.abs(workshopDiff) / gap) * 100) : 0;
    return { kind: 'gap' as const, strongHalf, gap, workshopGap: Math.abs(workshopDiff), share, sameDirection };
  }, [halfComparison]);

  const hasAnySales = (summary?.grandTotal || 0) !== 0 || (summary?.storeTotal || 0) > 0;

  const weekdayData = useMemo(
    () => (report?.weekdays || []).map(row => ({ ...row, label: weekdayLabels[row.weekday] })),
    [report]
  );

  // 時間帯は営業していない時間まで並べても読みにくいので、実績のある範囲だけを描く
  const hourData = useMemo(() => {
    const hours = report?.hours || [];
    if (hours.length === 0) return [];
    const min = hours[0].hour;
    const max = hours[hours.length - 1].hour;
    const byHour = new Map(hours.map(row => [row.hour, row]));
    const filled: Array<{ hour: number; label: string; total: number; count: number }> = [];
    for (let hour = min; hour <= max; hour++) {
      const row = byHour.get(hour);
      filled.push({ hour, label: `${hour}時`, total: row?.total || 0, count: row?.count || 0 });
    }
    return filled;
  }, [report]);

  const bestWeekday = useMemo(() => {
    const candidates = weekdayData.filter(row => row.businessDays > 0);
    if (candidates.length === 0) return null;
    return candidates.reduce((best, row) => (row.avg > best.avg ? row : best));
  }, [weekdayData]);

  const bestVisitorWeekday = useMemo(() => {
    const candidates = weekdayData.filter(row => row.visitorDays > 0);
    if (candidates.length === 0) return null;
    return candidates.reduce((best, row) => (row.visitorAvg > best.visitorAvg ? row : best));
  }, [weekdayData]);

  const bestHour = useMemo(() => {
    if (hourData.length === 0) return null;
    return hourData.reduce((best, row) => (row.total > best.total ? row : best));
  }, [hourData]);

  // 時間帯が分かる売上が店舗売上のどれくらいを占めるか。紙の記録の一括入力分は時刻が無いので除いている
  const hourCoverageRate = useMemo(() => {
    const storeTotal = summary?.storeTotal || 0;
    if (storeTotal <= 0) return 0;
    return Math.round(((report?.hourCoveredTotal || 0) / storeTotal) * 100);
  }, [report, summary]);

  // 当月は途中経過なので、暦日ベースの日平均から月末の着地を見込む
  const projection = useMemo(() => {
    if (!summary || !isCurrentMonth) return null;
    const { month: nowMonth, day } = todayJst();
    if (nowMonth !== month || day <= 0) return null;
    const totalDays = daysInMonthCount(month);
    if (day >= totalDays) return null;
    return {
      elapsedDays: day,
      totalDays,
      amount: Math.round((summary.grandTotal / day) * totalDays),
    };
  }, [summary, isCurrentMonth, month]);

  return (
    <div className="space-y-4 max-w-4xl pb-8">
      <div>
        <Link href="/admin/sales" className="text-moss-green hover:underline text-sm font-medium">
          ← 売上管理に戻る
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">月次レポート</h1>
      </div>

      {/* 月ナビゲーション */}
      <div className="bg-white shadow rounded-lg p-3 flex items-center justify-between gap-2">
        <button
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="px-2 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap border border-gray-300 rounded-md hover:bg-gray-50"
        >
          ← {shortMonthLabel(shiftMonth(month, -1), month)}
        </button>
        <span className="text-base sm:text-lg font-bold text-gray-900 whitespace-nowrap">{monthLabel(month)}</span>
        <button
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={isCurrentMonth}
          className="px-2 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-30"
        >
          {shortMonthLabel(shiftMonth(month, 1), month)} →
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
              label="来店1名あたり売上"
              value={`¥${summary.avgPerVisitor.toLocaleString()}`}
              rate={changeRate(summary.avgPerVisitor, prev?.avgPerVisitor)}
            />
            <SummaryCard
              label="購入率（組数÷来店者数）"
              value={`${summary.purchaseRate}%`}
              rate={changeRate(summary.purchaseRate, prev?.purchaseRate)}
              sub="1組が複数名のこともあるため目安"
            />
            <SummaryCard
              label="営業日1日あたり売上"
              value={`¥${summary.avgPerBusinessDay.toLocaleString()}`}
              rate={changeRate(summary.avgPerBusinessDay, prev?.avgPerBusinessDay)}
            />
            <SummaryCard
              label="割引合計"
              value={`−¥${summary.discountTotal.toLocaleString()}`}
            />
            <SummaryCard
              label="営業日数（売上のあった日）"
              value={`${summary.businessDays}日`}
            />
            {projection && (
              <SummaryCard
                label="今月の着地見込み"
                value={`¥${projection.amount.toLocaleString()}`}
                rate={changeRate(projection.amount, prev?.grandTotal)}
                sub={`${projection.elapsedDays}/${projection.totalDays}日経過の平均ペース`}
              />
            )}
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
                <InsightNote>
                  構成比が偏っているカテゴリーは、在庫と陳列を厚くする候補です。逆に比率が小さいカテゴリーは、
                  売り場での見せ方を変えるか、扱いを絞るかの判断材料になります。
                </InsightNote>
              </div>

              {/* 曜日別の平均売上 */}
              <div className="bg-white shadow rounded-lg p-4">
                <h2 className="font-medium text-gray-900 mb-1">曜日別の平均売上</h2>
                <p className="text-xs text-gray-500 mb-3">
                  売上のあった日だけで平均しています（定休日は平均に含めません）。
                </p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekdayData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `¥${v.toLocaleString()}`} width={70} />
                      <Tooltip
                        formatter={(value) => [`¥${Number(value).toLocaleString()}`, '平均売上']}
                        labelFormatter={(label) => {
                          const row = weekdayData.find(d => d.label === label);
                          return `${label}曜日（${row?.businessDays || 0}日分）`;
                        }}
                      />
                      <Bar dataKey="avg" name="平均売上" fill="#3D5A2E" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {bestWeekday && bestWeekday.avg > 0 && (
                  <InsightNote>
                    この月で最も強いのは<strong className="text-gray-700">{bestWeekday.label}曜日</strong>
                    （平均 ¥{bestWeekday.avg.toLocaleString()}）です。強い曜日はワークショップやイベントを重ねると
                    取りこぼしを減らせます。弱い曜日は、割引より「その日限定の体験」を置くほうが単価を落とさずに済みます。
                  </InsightNote>
                )}
              </div>

              {/* 曜日別の平均来客数 */}
              <div className="bg-white shadow rounded-lg p-4">
                <h2 className="font-medium text-gray-900 mb-1">曜日別の平均来客数</h2>
                <p className="text-xs text-gray-500 mb-3">
                  来店者数を記録した日だけで平均しています。未入力の日は平均に含めません。
                </p>
                {weekdayData.every(row => row.visitorDays === 0) ? (
                  <p className="text-sm text-gray-400">
                    来店者数の記録がありません。集計・履歴タブの「来店者数」を入力すると表示されます。
                  </p>
                ) : (
                  <>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weekdayData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}名`} width={50} />
                          <Tooltip
                            formatter={(value) => [`${Number(value)}名`, '平均来客数']}
                            labelFormatter={(label) => {
                              const row = weekdayData.find(d => d.label === label);
                              return `${label}曜日（${row?.visitorDays || 0}日分・のべ${row?.visitors || 0}名）`;
                            }}
                          />
                          <Bar dataKey="visitorAvg" name="平均来客数" fill="#6B8E5A" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {bestVisitorWeekday && bestWeekday && (
                      <InsightNote>
                        人が最も多いのは<strong className="text-gray-700">{bestVisitorWeekday.label}曜日</strong>
                        （平均 {bestVisitorWeekday.visitorAvg}名）です。
                        {bestVisitorWeekday.label !== bestWeekday.label ? (
                          <>
                            売上が最も高い{bestWeekday.label}曜日とはずれています。
                            人は来ているのに売上につながっていない曜日は、接客や導線、
                            持ち帰りやすい価格帯の品を置くことで伸ばせる余地があります。
                          </>
                        ) : (
                          <>
                            売上が最も高い曜日と一致しています。人を増やせばそのまま売上に効く曜日なので、
                            集客の告知はこの曜日に寄せるのが効率的です。
                          </>
                        )}
                      </InsightNote>
                    )}
                  </>
                )}
              </div>

              {/* ワークショップ（イベント日）の寄与 */}
              <div className="bg-white shadow rounded-lg p-4">
                <h2 className="font-medium text-gray-900 mb-1">ワークショップの日別売上</h2>
                <p className="text-xs text-gray-500 mb-3">
                  店頭の明細でワークショップに分類された金額です（割引前の定価ベース）。
                  イベントを開いた日に山ができます。
                </p>
                {workshopDays.length === 0 ? (
                  <p className="text-sm text-gray-400">この月はワークショップの明細がありません</p>
                ) : (
                  <>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={1} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `¥${v.toLocaleString()}`} width={70} />
                          <Tooltip
                            formatter={(value) => [`¥${Number(value).toLocaleString()}`, 'ワークショップ']}
                            labelFormatter={(label) => {
                              const row = chartData.find(d => d.label === label);
                              return row?.note
                                ? `${monthLabel(month)}${label}日 — ${row.note}`
                                : `${monthLabel(month)}${label}日`;
                            }}
                          />
                          <Bar dataKey="workshopTotal" name="ワークショップ" fill="#C08A2E" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      開催のあった日: {workshopDays.length}日 / 月間合計 ¥{workshopMonthTotal.toLocaleString()}
                      {summary.grandTotal > 0 && (
                        <>（総売上の {Math.round((workshopMonthTotal / summary.grandTotal) * 100)}%）</>
                      )}
                    </p>
                    <InsightNote>
                      山になっている日が、実際に売上を押し上げた日です。日付にメモを残しておくと、
                      グラフに触れたときイベント名まで確認できます。開催日を増やすか、
                      1回あたりの定員や単価を上げるかは、下の前半・後半の比較と合わせて判断してください。
                    </InsightNote>
                  </>
                )}
              </div>

              {/* 前半と後半の比較 */}
              {halfComparison && (
                <div className="bg-white shadow rounded-lg p-4">
                  <h2 className="font-medium text-gray-900 mb-1">前半（1〜15日）と後半（16日〜）の比較</h2>
                  <p className="text-xs text-gray-500 mb-3">
                    月の途中で勢いが変わっていないかを見ます。差が大きいときは、その期間に何をしたかを振り返る手がかりになります。
                  </p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-gray-500">
                          <th className="text-left font-medium py-2 pr-4"></th>
                          <th className="text-right font-medium py-2 px-2 whitespace-nowrap">前半</th>
                          <th className="text-right font-medium py-2 pl-2 whitespace-nowrap">後半</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">総売上</td>
                          <td className="py-2 px-2 text-right font-medium whitespace-nowrap">¥{halfComparison.firstTotal.toLocaleString()}</td>
                          <td className="py-2 pl-2 text-right font-medium whitespace-nowrap">¥{halfComparison.secondTotal.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">ワークショップ</td>
                          <td className="py-2 px-2 text-right whitespace-nowrap">¥{halfComparison.firstWorkshop.toLocaleString()}</td>
                          <td className="py-2 pl-2 text-right whitespace-nowrap">¥{halfComparison.secondWorkshop.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">来店者数</td>
                          <td className="py-2 px-2 text-right whitespace-nowrap">{halfComparison.firstVisitors.toLocaleString()}名</td>
                          <td className="py-2 pl-2 text-right whitespace-nowrap">{halfComparison.secondVisitors.toLocaleString()}名</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">営業日数</td>
                          <td className="py-2 px-2 text-right whitespace-nowrap">{halfComparison.firstDays}日</td>
                          <td className="py-2 pl-2 text-right whitespace-nowrap">{halfComparison.secondDays}日</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {halfInsight?.kind === 'even' && (
                    <InsightNote>
                      前半と後半で大きな差はありません。月を通して同じペースで売れています。
                    </InsightNote>
                  )}
                  {halfInsight?.kind === 'gap' && (
                    <InsightNote>
                      <strong className="text-gray-700">{halfInsight.strongHalf}</strong>のほうが
                      ¥{halfInsight.gap.toLocaleString()} 多く売れています。
                      {!halfInsight.sameDirection ? (
                        <>
                          ワークショップはこの差を説明しません。物販や来客数など、別の要因を確かめてください。
                        </>
                      ) : halfInsight.share >= 100 ? (
                        <>
                          ワークショップの差だけで ¥{halfInsight.workshopGap.toLocaleString()} あり、差の全額を上回ります。
                          つまり伸びの正体はイベントで、物販はむしろ落ちています。開催日を増やすのが最も確実な打ち手です。
                          同時に、イベントの無い日の売り方を別途てこ入れする余地があります。
                        </>
                      ) : halfInsight.share >= 50 ? (
                        <>
                          そのうち ¥{halfInsight.workshopGap.toLocaleString()}（差の {halfInsight.share}%）が
                          ワークショップによるものです。伸びの主因はイベントなので、開催日を増やすのが最も効きます。
                        </>
                      ) : halfInsight.share > 0 ? (
                        <>
                          ワークショップの寄与は ¥{halfInsight.workshopGap.toLocaleString()}（差の {halfInsight.share}%）で、
                          残りは物販や来客数の差です。イベントの当日に何が一緒に売れたかを、売れ筋ランキングで確かめてください。
                        </>
                      ) : (
                        <>
                          ワークショップの差はほとんどありません。物販や来客数の側に理由があります。
                        </>
                      )}
                    </InsightNote>
                  )}
                </div>
              )}

              {/* 時間帯別の売上 */}
              <div className="bg-white shadow rounded-lg p-4">
                <h2 className="font-medium text-gray-900 mb-1">時間帯別の売上（店頭）</h2>
                <p className="text-xs text-gray-500 mb-3">
                  レジで登録した時刻を会計時刻とみなしています。紙の記録をまとめて入力した分は時刻が残らないため除外しています。
                </p>
                {hourData.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    時刻の分かる取引がありません。店頭でその場に登録した会計が貯まると表示されます。
                  </p>
                ) : (
                  <>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `¥${v.toLocaleString()}`} width={70} />
                          <Tooltip
                            formatter={(value) => [`¥${Number(value).toLocaleString()}`, '売上']}
                            labelFormatter={(label) => {
                              const row = hourData.find(d => d.label === label);
                              return `${label}台（${row?.count || 0}件）`;
                            }}
                          />
                          <Bar dataKey="total" name="売上" fill="#8DB580" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      店舗売上のうち {hourCoverageRate}% を集計対象にしています。
                    </p>
                    {bestHour && (
                      <InsightNote>
                        山は<strong className="text-gray-700">{bestHour.label}台</strong>
                        （¥{bestHour.total.toLocaleString()}）です。人手を厚くする時間、SNSの投稿時間、
                        ワークショップの開始時刻を決めるときの根拠に使えます。売上がほとんど無い時間が続くなら、
                        営業時間の見直しも検討できます。
                      </InsightNote>
                    )}
                  </>
                )}
              </div>

              {/* 売れ筋ランキング */}
              <div className="bg-white shadow rounded-lg p-4">
                <h2 className="font-medium text-gray-900 mb-1">売れ筋ランキング（上位20件）</h2>
                <p className="text-xs text-gray-500 mb-3">
                  金額は割引前の定価ベースです。数量は明細に入力された個数の合計です。
                </p>
                {(report.items || []).length === 0 ? (
                  <p className="text-sm text-gray-400">明細のある取引がありません</p>
                ) : (
                  <ol className="divide-y">
                    {report.items.map((item, index) => {
                      const top = report.items[0].amount || 1;
                      const percent = Math.round((item.amount / top) * 100);
                      return (
                        <li key={item.name} className="py-2">
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <span className="text-gray-700 min-w-0 truncate">
                              <span className="text-gray-400 mr-2">{index + 1}</span>
                              {item.name}
                            </span>
                            <span className="text-gray-900 font-medium whitespace-nowrap">
                              ¥{item.amount.toLocaleString()}
                              <span className="text-xs text-gray-400 ml-1">/ {item.quantity}点</span>
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
                <InsightNote>
                  上位は切らさないことが最優先です。金額は小さいが数量が多い品は集客の入口、
                  数量は少ないが金額が大きい品は客単価の柱にあたります。役割が違うので、値上げや品切れの判断は分けて考えてください。
                </InsightNote>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
