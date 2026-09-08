'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import type { MetricChange, RankedRow } from '@/lib/analyticsSummary';
import type { SiteAnalyticsSummary as Summary } from '@/lib/siteAnalytics';

// ダッシュボードのアクセス解析サマリー。
// GA4とSearch Consoleは片方だけ連携済みという状態があり得るので、
// セクションごとに「未連携」「エラー」を出し分ける。

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('ja-JP');
}

function ChangeBadge({ change }: { change: MetricChange }) {
  if (change.changePercent === null) {
    // 前期間が0件だと変化率を定義できない。無理に「+100%」とは出さない。
    return <span className="text-xs text-gray-500">前期間はデータなし</span>;
  }

  const isUp = change.changePercent >= 0;
  return (
    <span className={`text-xs font-medium ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
      {isUp ? '▲' : '▼'} {Math.abs(change.changePercent).toFixed(1)}%
      <span className="text-gray-500 font-normal">（前期間 {formatNumber(change.previous)}）</span>
    </span>
  );
}

function MetricTile({ label, change, suffix }: { label: string; change: MetricChange; suffix?: string }) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">
        {formatNumber(change.current)}
        {suffix && <span className="text-base font-normal text-gray-600 ml-1">{suffix}</span>}
      </p>
      <div className="mt-1">
        <ChangeBadge change={change} />
      </div>
    </div>
  );
}

function RankedList({ title, rows, unit }: { title: string; rows: RankedRow[]; unit: string }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-2">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">データがありません</p>
      ) : (
        <ol className="space-y-1">
          {rows.map((row, i) => (
            <li key={`${row.label}-${i}`} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-gray-700 truncate" title={row.label}>
                {i + 1}. {row.label}
              </span>
              <span className="text-gray-900 font-medium shrink-0">
                {formatNumber(row.value)}
                {unit}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// 権限付与の画面に貼り付けるサービスアカウントのアドレスを、コピーしやすい形で出す。
// Vercelの環境変数を機密扱いにしていると値を読み出せないため、ここから確認できるようにしている。
function ServiceAccountHint({ email }: { email: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!email) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボードが使えない環境では、表示されている値を手で選択してもらう
      setCopied(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-amber-200">
      <p className="text-xs text-amber-800">権限を付与するサービスアカウント:</p>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <code className="text-xs bg-white border border-amber-300 rounded px-2 py-1 break-all text-gray-800">
          {email}
        </code>
        <button
          type="button"
          onClick={copy}
          className="text-xs px-2 py-1 border border-amber-400 rounded text-amber-900 hover:bg-amber-100"
        >
          {copied ? 'コピーしました' : 'コピー'}
        </button>
      </div>
    </div>
  );
}

function NotReady({
  message,
  steps,
  serviceAccountEmail,
}: {
  message: string | null;
  steps: string[];
  serviceAccountEmail: string | null;
}) {
  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
      <p className="text-sm text-amber-900 font-medium">{message ?? '未連携です'}</p>
      <p className="text-xs text-amber-800 mt-2">連携するには、次の設定が必要です:</p>
      <ol className="text-xs text-amber-800 mt-1 space-y-0.5 list-decimal list-inside">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <ServiceAccountHint email={serviceAccountEmail} />
    </div>
  );
}

export function SiteAnalyticsSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/analytics/summary');
        if (!res.ok) throw new Error('アクセス解析の取得に失敗しました');
        const data = await res.json();
        if (!cancelled) setSummary(data.summary);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '取得に失敗しました');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-moss-green" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card>
        <CardContent>
          <p className="py-6 text-sm text-gray-600">{error ?? 'アクセス解析を取得できませんでした'}</p>
        </CardContent>
      </Card>
    );
  }

  const { ga4, searchConsole, periodDays, range } = summary;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-gray-900">アクセス解析</h2>
        <p className="text-sm text-gray-600">
          過去{periodDays}日間（{range.startDate} 〜 {range.endDate}）・前の{periodDays}日間との比較
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">サイトへのアクセス（Google Analytics）</h3>
            <span className="text-2xl">📈</span>
          </div>
        </CardHeader>
        <CardContent>
          {ga4.status === 'ok' && ga4.data ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricTile label="ユーザー数" change={ga4.data.users} suffix="人" />
                <MetricTile label="セッション数" change={ga4.data.sessions} suffix="回" />
                <MetricTile label="ページビュー" change={ga4.data.pageViews} suffix="回" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RankedList title="よく見られたページ" rows={ga4.data.topPages} unit="回" />
                <RankedList title="流入元" rows={ga4.data.topChannels} unit="回" />
              </div>
            </div>
          ) : (
            <NotReady
              serviceAccountEmail={summary.serviceAccountEmail}
              message={ga4.message}
              steps={[
                'Google Cloudで「Google Analytics Data API」を有効化する（Admin APIとは別物です）',
                'GA4の「管理 > プロパティのアクセス管理」でサービスアカウントを閲覧者として追加する',
                'Vercelの環境変数 GA4_PROPERTY_ID にGA4のプロパティIDを設定する',
              ]}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">検索からの流入（Search Console）</h3>
            <span className="text-2xl">🔍</span>
          </div>
        </CardHeader>
        <CardContent>
          {searchConsole.status === 'ok' && searchConsole.data ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricTile label="クリック数" change={searchConsole.data.clicks} suffix="回" />
                <MetricTile label="表示回数" change={searchConsole.data.impressions} suffix="回" />
                <div className="p-4 border border-gray-200 rounded-lg bg-white">
                  <p className="text-sm text-gray-600">クリック率</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {searchConsole.data.ctr.toFixed(1)}
                    <span className="text-base font-normal text-gray-600 ml-1">%</span>
                  </p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg bg-white">
                  <p className="text-sm text-gray-600">平均掲載順位</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {searchConsole.data.position.toFixed(1)}
                    <span className="text-base font-normal text-gray-600 ml-1">位</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RankedList title="検索されたキーワード" rows={searchConsole.data.topQueries} unit="クリック" />
                <RankedList title="検索で表示されたページ" rows={searchConsole.data.topPages} unit="クリック" />
              </div>
              <p className="text-xs text-gray-500">
                Search Consoleのデータは反映まで2〜3日かかるため、直近の日付は少なめに出ます。
              </p>
            </div>
          ) : (
            <NotReady
              serviceAccountEmail={summary.serviceAccountEmail}
              message={searchConsole.message}
              steps={[
                'Google Cloudで「Google Search Console API」を有効化する',
                'Search Consoleの「設定 > ユーザーと権限」でサービスアカウントを制限付きで追加する',
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
