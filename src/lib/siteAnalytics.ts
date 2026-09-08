// GA4（Google Analytics Data API）と Search Console からサイトの状況を取得する。
//
// 認証はGoogleカレンダー連携と同じサービスアカウントを使い回す。
// 新しくOAuthを組む必要はなく、GA4とSearch Consoleの各画面で
// サービスアカウントのメールアドレスに閲覧権限を付けるだけで動く。
//
// 権限や環境変数が未設定のあいだは例外にせず「未連携」として返し、
// 管理画面が設定手順を案内できるようにしている。

import { unstable_cache } from 'next/cache';
import {
  buildDateRanges,
  pickSearchConsoleSite,
  toMetricChange,
  toRankedRows,
  type Ga4Summary,
  type SearchConsoleSummary,
} from './analyticsSummary';

const SITE_DOMAIN = 'mosscountry.com';
const SUMMARY_DAYS = 28;

// ダッシュボードは何度も開かれるため、GoogleのAPIクォータとVercelの実行時間を
// 無駄にしないよう結果をキャッシュする。分析データは即時性が要らないので長めでよい。
const CACHE_SECONDS = 1800;

export type AnalyticsStatus = 'ok' | 'not_configured' | 'error';

export interface AnalyticsSection<T> {
  status: AnalyticsStatus;
  /** status が 'ok' のときだけ入る */
  data: T | null;
  /** 未連携・失敗の理由を管理画面に出すための説明 */
  message: string | null;
}

export interface SiteAnalyticsSummary {
  /**
   * 連携先のサービスアカウントのメールアドレス。
   * 秘密情報は秘密鍵のほうで、このアドレスはGA4やSearch Consoleの権限付与画面に
   * 貼り付けるためのもの。設定時にVercelの環境変数を見に行かなくて済むよう管理画面に出す。
   */
  serviceAccountEmail: string | null;
  periodDays: number;
  range: { startDate: string; endDate: string };
  ga4: AnalyticsSection<Ga4Summary>;
  searchConsole: AnalyticsSection<SearchConsoleSummary>;
}

function hasServiceAccount(): boolean {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
}

export function isGa4Configured(): boolean {
  return hasServiceAccount() && !!process.env.GA4_PROPERTY_ID;
}

export function isSearchConsoleConfigured(): boolean {
  return hasServiceAccount();
}

async function createAuth(scopes: string[]) {
  const { google } = await import('googleapis');
  const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes,
  });
}

// Googleのエラーは原因（権限不足かAPI無効か）で対処が全く違うため、
// 管理画面には次に何をすればよいかが分かる文言に変換して渡す。
function describeGoogleError(error: unknown, serviceLabel: string): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/API has not been used|is disabled|SERVICE_DISABLED/i.test(message)) {
    // 「Analytics Admin API」と間違えやすいため、必要なAPI名をそのまま出す
    const apiName = serviceLabel === 'Google Analytics' ? 'Google Analytics Data API' : 'Google Search Console API';
    return `${apiName} がGoogle Cloudで有効化されていません。`;
  }
  if (/permission|403|PERMISSION_DENIED|does not have sufficient/i.test(message)) {
    return `サービスアカウントに ${serviceLabel} の閲覧権限がありません。`;
  }
  if (/404|not found/i.test(message)) {
    return `${serviceLabel} で対象のプロパティが見つかりませんでした。`;
  }
  return `${serviceLabel} の取得に失敗しました: ${message}`;
}

async function fetchGa4(): Promise<AnalyticsSection<Ga4Summary>> {
  if (!isGa4Configured()) {
    return {
      status: 'not_configured',
      data: null,
      message: hasServiceAccount()
        ? '環境変数 GA4_PROPERTY_ID が未設定です。'
        : 'Googleサービスアカウントの環境変数が未設定です。',
    };
  }

  try {
    const { google } = await import('googleapis');
    const auth = await createAuth(['https://www.googleapis.com/auth/analytics.readonly']);
    const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });
    const property = `properties/${process.env.GA4_PROPERTY_ID}`;
    const ranges = buildDateRanges(SUMMARY_DAYS, new Date());

    // 合計値は当期間と前期間をまとめて1リクエストで取り、API呼び出し回数を抑える
    const [totals, pages, channels] = await Promise.all([
      analyticsdata.properties.runReport({
        property,
        requestBody: {
          dateRanges: [ranges.current, ranges.previous],
          metrics: [{ name: 'totalUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
        },
      }),
      analyticsdata.properties.runReport({
        property,
        requestBody: {
          dateRanges: [ranges.current],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: '5',
        },
      }),
      analyticsdata.properties.runReport({
        property,
        requestBody: {
          dateRanges: [ranges.current],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: '5',
        },
      }),
    ]);

    const totalRows = totals.data.rows ?? [];
    // dateRanges を2つ渡すと、行が期間ごとに分かれて返る
    const metricAt = (rowIndex: number, metricIndex: number): number =>
      Number(totalRows[rowIndex]?.metricValues?.[metricIndex]?.value ?? 0);

    return {
      status: 'ok',
      message: null,
      data: {
        users: toMetricChange(metricAt(0, 0), metricAt(1, 0)),
        sessions: toMetricChange(metricAt(0, 1), metricAt(1, 1)),
        pageViews: toMetricChange(metricAt(0, 2), metricAt(1, 2)),
        topPages: toRankedRows(pages.data.rows, 5),
        topChannels: toRankedRows(channels.data.rows, 5),
      },
    };
  } catch (error) {
    console.warn('GA4の取得に失敗しました:', error);
    return { status: 'error', data: null, message: describeGoogleError(error, 'Google Analytics') };
  }
}

async function fetchSearchConsole(): Promise<AnalyticsSection<SearchConsoleSummary>> {
  if (!isSearchConsoleConfigured()) {
    return {
      status: 'not_configured',
      data: null,
      message: 'Googleサービスアカウントの環境変数が未設定です。',
    };
  }

  try {
    const { google } = await import('googleapis');
    const auth = await createAuth(['https://www.googleapis.com/auth/webmasters.readonly']);
    const searchconsole = google.searchconsole({ version: 'v1', auth });
    const ranges = buildDateRanges(SUMMARY_DAYS, new Date());

    const sites = await searchconsole.sites.list({});
    const siteUrl = pickSearchConsoleSite(
      sites.data.siteEntry,
      SITE_DOMAIN,
      process.env.SEARCH_CONSOLE_SITE_URL
    );

    if (!siteUrl) {
      return {
        status: 'not_configured',
        data: null,
        message: `Search Consoleでサービスアカウントに ${SITE_DOMAIN} の閲覧権限が付与されていません。`,
      };
    }

    const query = (startDate: string, endDate: string, dimensions: string[], rowLimit: number) =>
      searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: { startDate, endDate, dimensions, rowLimit },
      });

    const [current, previous, queries, pages] = await Promise.all([
      query(ranges.current.startDate, ranges.current.endDate, [], 1),
      query(ranges.previous.startDate, ranges.previous.endDate, [], 1),
      query(ranges.current.startDate, ranges.current.endDate, ['query'], 5),
      query(ranges.current.startDate, ranges.current.endDate, ['page'], 5),
    ]);

    const currentTotals = current.data.rows?.[0];
    const previousTotals = previous.data.rows?.[0];

    // Search Consoleは合計行を返さないディメンションなしのクエリでも rows が空になり得る
    // （対象期間にデータが無い場合）。その場合は0として扱う。
    const clicks = Number(currentTotals?.clicks ?? 0);
    const impressions = Number(currentTotals?.impressions ?? 0);

    const toRows = (rows: typeof queries.data.rows, valueKey: 'clicks' | 'impressions') =>
      (rows ?? [])
        .map((row) => ({ label: row.keys?.[0] ?? '', value: Number(row[valueKey] ?? 0) }))
        .filter((row) => row.label !== '' && Number.isFinite(row.value));

    return {
      status: 'ok',
      message: null,
      data: {
        clicks: toMetricChange(clicks, Number(previousTotals?.clicks ?? 0)),
        impressions: toMetricChange(impressions, Number(previousTotals?.impressions ?? 0)),
        ctr: impressions === 0 ? 0 : (clicks / impressions) * 100,
        position: Number(currentTotals?.position ?? 0),
        topQueries: toRows(queries.data.rows, 'clicks'),
        topPages: toRows(pages.data.rows, 'clicks'),
      },
    };
  } catch (error) {
    console.warn('Search Consoleの取得に失敗しました:', error);
    return { status: 'error', data: null, message: describeGoogleError(error, 'Search Console') };
  }
}

async function loadSummary(): Promise<SiteAnalyticsSummary> {
  const ranges = buildDateRanges(SUMMARY_DAYS, new Date());
  const [ga4, searchConsole] = await Promise.all([fetchGa4(), fetchSearchConsole()]);

  return {
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? null,
    periodDays: SUMMARY_DAYS,
    range: ranges.current,
    ga4,
    searchConsole,
  };
}

export const getSiteAnalyticsSummary = unstable_cache(loadSummary, ['site-analytics-summary'], {
  revalidate: CACHE_SECONDS,
  tags: ['site-analytics'],
});
