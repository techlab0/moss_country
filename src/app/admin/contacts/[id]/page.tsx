"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  inquiry_type: string;
  subject: string;
  message: string;
  status: "pending" | "replied" | "resolved";
  priority: "low" | "medium" | "high";
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}


const INQUIRY_TYPE_LABELS = {
  general: "一般的なお問い合わせ",
  workshop: "ワークショップについて",
  product: "商品について",
  order: "注文について",
  support: "サポート",
  other: "その他",
};

function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [contact, setContact] = useState<ContactInquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContact = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/contacts/${resolvedParams.id}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("お問い合わせが見つかりません");
        }
        throw new Error("お問い合わせデータの取得に失敗しました");
      }

      const data = await response.json();
      setContact(data.contact);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchContact();
  }, [resolvedParams.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };


  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                エラーが発生しました
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.back()}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
                >
                  戻る
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex items-center">
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-moss-green"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          読み込み中...
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6 text-center text-gray-500">
        お問い合わせが見つかりません
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            ← 一覧に戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-900">お問い合わせ詳細</h1>
          <p className="mt-1 text-sm text-gray-600">
            受信日時: {formatDate(contact.created_at)}
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-6">
          {/* お問い合わせ内容 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                お問い合わせ内容
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">件名</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {contact.subject}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">
                  お問い合わせ種類
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {INQUIRY_TYPE_LABELS[contact.inquiry_type] ||
                    contact.inquiry_type}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">内容</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-md">
                  {contact.message}
                </dd>
              </div>
            </div>
          </div>

          {/* お問い合わせ者情報 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                お問い合わせ者情報
              </h3>
            </div>
            <div className="px-6 py-4">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">お名前</dt>
                  <dd className="mt-1 text-sm text-gray-900">{contact.name}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    メールアドレス
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {contact.email}
                  </dd>
                </div>

                {contact.phone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      電話番号
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {contact.phone}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* 技術情報 */}
          {(contact.ip_address || contact.user_agent) && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">技術情報</h3>
              </div>
              <div className="px-6 py-4">
                <dl className="space-y-4">
                  {contact.ip_address && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        IPアドレス
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">
                        {contact.ip_address}
                      </dd>
                    </div>
                  )}

                  {contact.user_agent && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        ユーザーエージェント
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono break-all">
                        {contact.user_agent}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* サイドバー */}
        <div className="space-y-6">

          {/* 更新履歴 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">更新履歴</h3>
            </div>
            <div className="px-6 py-4">
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    受信日時
                  </dt>
                  <dd className="text-sm text-gray-900">
                    {formatDate(contact.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    最終更新
                  </dt>
                  <dd className="text-sm text-gray-900">
                    {formatDate(contact.updated_at)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactDetailPage;

