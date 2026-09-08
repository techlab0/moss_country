// GA4 と Search Console のレスポンスを、管理画面ダッシュボードで扱いやすい形に整える。
//
// このモジュールは googleapis に依存しない純粋な変換だけを持つ。
// APIの呼び出し（認証・ネットワーク）は siteAnalytics.ts 側の責務。

export interface MetricChange {
  current: number;
  previous: number;
  /** 前期間比の変化率(%)。前期間が0のときは算出できないため null */
  changePercent: number | null;
}

export interface RankedRow {
  label: string;
  value: number;
}

export interface Ga4Summary {
  users: MetricChange;
  sessions: MetricChange;
  pageViews: MetricChange;
  topPages: RankedRow[];
  topChannels: RankedRow[];
}

export interface SearchConsoleSummary {
  clicks: MetricChange;
  impressions: MetricChange;
  /** クリック率(%)。表示回数が0のときは0 */
  ctr: number;
  /** 平均掲載順位。1に近いほど上位 */
  position: number;
  topQueries: RankedRow[];
  topPages: RankedRow[];
}

/**
 * 前期間比の変化率を求める。
 *
 * 前期間が0のときは「何倍になったか」を定義できないため null を返し、
 * 呼び出し側で「－」と表示させる。0除算で Infinity を画面に出さないための措置。
 */
export function toMetricChange(current: number, previous: number): MetricChange {
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const safePrevious = Number.isFinite(previous) ? previous : 0;
  return {
    current: safeCurrent,
    previous: safePrevious,
    changePercent: safePrevious === 0 ? null : ((safeCurrent - safePrevious) / safePrevious) * 100,
  };
}

/**
 * GA4のレポート行から「ディメンション名 → 指標値」の上位一覧を作る。
 *
 * GA4は指標値を文字列で返すため、ここで数値化する。
 * 値が読めない行は0として扱わず除外する（順位表に意味のない行を混ぜないため）。
 */
export function toRankedRows(
  rows: Array<{ dimensionValues?: Array<{ value?: string | null }>; metricValues?: Array<{ value?: string | null }> }> | null | undefined,
  limit: number
): RankedRow[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const label = row.dimensionValues?.[0]?.value ?? '';
      const raw = row.metricValues?.[0]?.value;
      const value = Number(raw);
      return { label, value };
    })
    .filter((row) => row.label !== '' && Number.isFinite(row.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/**
 * 集計期間（当期間と、比較用の同じ長さの前期間）の日付範囲を求める。
 *
 * GA4もSearch Consoleも当日分は確定しないため、終端は「昨日」にする。
 * Search Consoleはさらに2〜3日遅れるが、期間をずらすと二つの数値の期間が
 * 食い違って読みにくくなるので、遅延は画面側の注記で伝える方針にしている。
 */
export function buildDateRanges(days: number, today: Date): {
  current: { startDate: string; endDate: string };
  previous: { startDate: string; endDate: string };
} {
  const iso = (d: Date): string => d.toISOString().slice(0, 10);
  const shift = (base: Date, amount: number): Date => {
    const d = new Date(base.getTime());
    d.setUTCDate(d.getUTCDate() + amount);
    return d;
  };

  const end = shift(today, -1);
  const start = shift(end, -(days - 1));
  const previousEnd = shift(start, -1);
  const previousStart = shift(previousEnd, -(days - 1));

  return {
    current: { startDate: iso(start), endDate: iso(end) },
    previous: { startDate: iso(previousStart), endDate: iso(previousEnd) },
  };
}

/**
 * Search Console のプロパティ一覧から、対象サイトのものを選ぶ。
 *
 * ドメインプロパティ(sc-domain:example.com)とURLプレフィックス(https://example.com/)の
 * どちらで登録されているかは運用者次第なので、両方を受け入れて自動で解決する。
 * 環境変数で明示された場合はそれを最優先する。
 */
export function pickSearchConsoleSite(
  siteEntries: Array<{ siteUrl?: string | null }> | null | undefined,
  domain: string,
  configuredSiteUrl?: string | null
): string | null {
  const configured = (configuredSiteUrl ?? '').trim();
  if (configured !== '') return configured;

  const urls = (siteEntries ?? [])
    .map((entry) => entry.siteUrl ?? '')
    .filter((url) => url !== '');

  const domainProperty = `sc-domain:${domain}`;
  if (urls.includes(domainProperty)) return domainProperty;

  const prefixMatch = urls.find((url) => {
    try {
      return new URL(url).hostname === domain;
    } catch {
      return false;
    }
  });

  return prefixMatch ?? null;
}
