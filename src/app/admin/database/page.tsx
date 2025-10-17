"use client";

import { useState, useEffect } from "react";

interface DatabaseStats {
  tables: Array<{
    name: string;
    rowCount: number;
    sizeFormatted: string;
    sizeBytes: number;
    indexSize: string;
  }>;
  indexes: Array<{
    tableName: string;
    indexName: string;
    scans: number;
    tuplesRead: number;
    tuplesFetched: number;
    sizeFormatted: string;
  }>;
  performance: {
    slowQueries: number;
    avgQueryTime: number;
    cacheHitRatio: number;
    connectionCount: number;
  };
}

interface HealthCheck {
  status: "healthy" | "warning" | "critical";
  issues: string[];
  recommendations: string[];
}

interface Recommendation {
  priority: "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  action: string;
}

interface QueryAnalysis {
  query: string;
  executionTime: number;
  planCost: number;
  rowsReturned: number;
  indexesUsed: string[];
  recommendations: string[];
}

export default function DatabaseOptimizationPage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "performance" | "maintenance" | "query-analyzer"
  >("overview");

  // メンテナンス関連の状態
  const [maintenanceRunning, setMaintenanceRunning] = useState(false);
  const [maintenanceResult, setMaintenanceResult] = useState<string | null>(
    null,
  );

  // クエリ分析の状態
  const [queryToAnalyze, setQueryToAnalyze] = useState("");
  const [queryAnalysisResult, setQueryAnalysisResult] =
    useState<QueryAnalysis | null>(null);
  const [queryAnalyzing, setQueryAnalyzing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchDatabaseInfo();
  }, []);

  const fetchDatabaseInfo = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/database");

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setHealth(data.health);
        setRecommendations(data.recommendations || []);
      } else {
        setError("データベース情報の取得に失敗しました");
      }
    } catch (err) {
      setError("データベース情報の取得中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const runMaintenance = async () => {
    setMaintenanceRunning(true);
    setMaintenanceResult(null);
    try {
      const response = await fetch("/api/admin/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "maintenance" }),
      });

      const result = await response.json();
      if (result.success) {
        setSuccess("メンテナンスが正常に完了しました");
        setMaintenanceResult(result.details.join("\n"));
        fetchDatabaseInfo(); // 統計情報を更新
      } else {
        setError(result.message || "メンテナンスに失敗しました");
      }
    } catch (err) {
      setError("メンテナンス実行中にエラーが発生しました");
    } finally {
      setMaintenanceRunning(false);
    }
  };

  const analyzeQuery = async () => {
    if (!queryToAnalyze.trim()) {
      setError("分析するクエリを入力してください");
      return;
    }

    setQueryAnalyzing(true);
    setQueryAnalysisResult(null);
    try {
      const response = await fetch("/api/admin/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze-query",
          data: { query: queryToAnalyze },
        }),
      });

      const result = await response.json();
      if (result.success) {
        setQueryAnalysisResult(result.analysis);
        setSuccess("クエリ分析が完了しました");
      } else {
        setError(result.error || "クエリ分析に失敗しました");
      }
    } catch (err) {
      setError("クエリ分析中にエラーが発生しました");
    } finally {
      setQueryAnalyzing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-100";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "critical":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-lg">データベース情報を読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            データベース最適化
          </h1>
          <p className="text-gray-600 mt-2">
            パフォーマンス監視・メンテナンス・最適化
          </p>
        </div>
      </div>

      {/* エラー・成功メッセージ */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
          <button onClick={() => setError("")} className="float-right">
            ×
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
          <button onClick={() => setSuccess("")} className="float-right">
            ×
          </button>
        </div>
      )}

      {/* ヘルスステータス */}
      {health && (
        <div
          className={`p-4 rounded-lg border ${getStatusColor(health.status)}`}
        >
          <div className="flex items-center">
            <div className="text-xl mr-3">
              {health.status === "healthy"
                ? "✅"
                : health.status === "warning"
                  ? "⚠️"
                  : "❌"}
            </div>
            <div>
              <h3 className="font-semibold">
                データベース状態:{" "}
                {health.status === "healthy"
                  ? "正常"
                  : health.status === "warning"
                    ? "注意"
                    : "要対応"}
              </h3>
              {health.issues.length > 0 && (
                <p className="text-sm mt-1">
                  {health.issues.length}件の問題が検出されました
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: "overview", label: "概要", icon: "📊" },
            { key: "performance", label: "パフォーマンス", icon: "⚡" },
            { key: "maintenance", label: "メンテナンス", icon: "🔧" },
            { key: "query-analyzer", label: "クエリ分析", icon: "🔍" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 概要タブ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* 統計情報カード */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.tables.length}
                </div>
                <div className="text-sm text-gray-600">テーブル数</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-green-600">
                  {stats.indexes.length}
                </div>
                <div className="text-sm text-gray-600">インデックス数</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.performance.cacheHitRatio.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">キャッシュヒット率</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.performance.connectionCount}
                </div>
                <div className="text-sm text-gray-600">アクティブ接続数</div>
              </div>
            </div>
          )}

          {/* 推奨事項 */}
          {recommendations.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold">最適化推奨事項</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="border-l-4 border-blue-400 pl-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{rec.title}</h4>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(rec.priority)}`}
                            >
                              {rec.priority === "high"
                                ? "高"
                                : rec.priority === "medium"
                                  ? "中"
                                  : "低"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {rec.description}
                          </p>
                          <p className="text-sm text-blue-600 mt-2">
                            {rec.action}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* パフォーマンスタブ */}
      {activeTab === "performance" && stats && (
        <div className="space-y-6">
          {/* テーブル情報 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">テーブル統計</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      テーブル名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      行数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      サイズ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      インデックスサイズ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.tables.map((table) => (
                    <tr key={table.name}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {table.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {table.rowCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {table.sizeFormatted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {table.indexSize}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* インデックス情報 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">インデックス使用状況</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      インデックス名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      テーブル
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      スキャン回数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      サイズ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.indexes.slice(0, 10).map((index, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index.indexName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index.tableName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            index.scans === 0
                              ? "bg-red-100 text-red-800"
                              : index.scans < 100
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {index.scans.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index.sizeFormatted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* メンテナンスタブ */}
      {activeTab === "maintenance" && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              データベースメンテナンス
            </h3>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">
                  自動メンテナンス
                </h4>
                <p className="text-sm text-blue-700 mb-4">
                  統計情報の更新、古いログの削除、インデックスの健全性チェックを実行します。
                </p>
                <button
                  onClick={runMaintenance}
                  disabled={maintenanceRunning}
                  className={`px-4 py-2 rounded-md text-white font-medium ${
                    maintenanceRunning
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {maintenanceRunning
                    ? "メンテナンス実行中..."
                    : "メンテナンス実行"}
                </button>
              </div>

              {maintenanceResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">実行結果</h4>
                  <pre className="text-sm text-green-700 whitespace-pre-wrap">
                    {maintenanceResult}
                  </pre>
                </div>
              )}

              {health?.issues.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">
                    検出された問題
                  </h4>
                  <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                    {health.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* クエリ分析タブ */}
      {activeTab === "query-analyzer" && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">SQLクエリ分析</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分析対象クエリ
                </label>
                <textarea
                  value={queryToAnalyze}
                  onChange={(e) => setQueryToAnalyze(e.target.value)}
                  className="w-full h-32 p-3 border border-gray-300 rounded-md font-mono text-sm"
                  placeholder="SELECT * FROM admin_users WHERE role = 'admin';"
                />
              </div>
              <button
                onClick={analyzeQuery}
                disabled={queryAnalyzing}
                className={`px-4 py-2 rounded-md text-white font-medium ${
                  queryAnalyzing
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
              >
                {queryAnalyzing ? "分析中..." : "クエリを分析"}
              </button>
            </div>

            {queryAnalysisResult && (
              <div className="mt-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">分析結果</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">実行コスト</div>
                      <div className="text-lg font-semibold">
                        {queryAnalysisResult.planCost.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">返却行数</div>
                      <div className="text-lg font-semibold">
                        {queryAnalysisResult.rowsReturned}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">
                        使用インデックス
                      </div>
                      <div className="text-lg font-semibold">
                        {queryAnalysisResult.indexesUsed.length}
                      </div>
                    </div>
                  </div>
                </div>

                {queryAnalysisResult.recommendations.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-3">
                      最適化推奨事項
                    </h4>
                    <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                      {queryAnalysisResult.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

