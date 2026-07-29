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
  replied_at?: string | null;
  reply_message?: string | null;
  replied_by?: string | null;
}

const STATUS_LABELS: Record<ContactInquiry["status"], string> = {
  pending: "未対応",
  replied: "返信済み",
  resolved: "解決済み",
};

const STATUS_STYLES: Record<ContactInquiry["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  replied: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
};


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
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyResult, setReplyResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

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

  // 返信メールを送る。送信に成功したときだけサーバー側で「返信済み」として記録される。
  const handleSendReply = async () => {
    if (!replyMessage.trim() || sendingReply) return;

    setSendingReply(true);
    setReplyResult(null);
    try {
      const response = await fetch(`/api/admin/contacts/${resolvedParams.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage }),
      });
      const data = await response.json();

      if (!response.ok) {
        setReplyResult({ ok: false, text: data.error || "返信の送信に失敗しました" });
        return;
      }

      setReplyResult({
        ok: true,
        text: data.recorded
          ? "返信を送信しました。控えが店舗のメールボックスにも届きます。"
          : data.message,
      });
      setReplyMessage("");
      await fetchContact();
    } catch {
      setReplyResult({ ok: false, text: "通信エラーが発生しました" });
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (status: ContactInquiry["status"]) => {
    if (updatingStatus) return;

    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/admin/contacts/${resolvedParams.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        await fetchContact();
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

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

          {/* 返信 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">返信</h3>
            </div>
            <div className="px-6 py-4">
              {contact.replied_at ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    {formatDate(contact.replied_at)} に送信
                    {contact.replied_by ? `（${contact.replied_by}）` : ""}
                  </p>
                  <div className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-md">
                    {contact.reply_message}
                  </div>
                  <p className="text-sm text-gray-500">
                    追加のやりとりは、店舗のメールボックスに届いている控えから続けてください。
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    {contact.email} 宛に返信を送ります。控えは店舗のメールボックスにも届きます。
                  </p>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={8}
                    maxLength={5000}
                    disabled={sendingReply}
                    placeholder="お問い合わせいただきありがとうございます。..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-moss-green focus:border-moss-green disabled:bg-gray-100"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {replyMessage.length}/5000文字
                    </span>
                    <button
                      onClick={handleSendReply}
                      disabled={sendingReply || replyMessage.trim().length === 0}
                      className="bg-moss-green text-white px-4 py-2 rounded-md text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {sendingReply ? "送信中..." : "返信を送信"}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">
                    宛名（「{contact.name} 様」）と署名、お問い合わせ内容の引用は自動で付きます。
                  </p>
                </div>
              )}

              {replyResult && (
                <div
                  className={`mt-4 p-3 rounded-md text-sm ${
                    replyResult.ok
                      ? "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {replyResult.text}
                </div>
              )}
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

          {/* ステータス */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">ステータス</h3>
            </div>
            <div className="px-6 py-4">
              <span
                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[contact.status]}`}
              >
                {STATUS_LABELS[contact.status]}
              </span>

              <div className="mt-4 space-y-2">
                {(Object.keys(STATUS_LABELS) as ContactInquiry["status"][]).map((value) => (
                  <button
                    key={value}
                    onClick={() => handleStatusChange(value)}
                    disabled={updatingStatus || contact.status === value}
                    className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {STATUS_LABELS[value]}にする
                  </button>
                ))}
              </div>
            </div>
          </div>

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

