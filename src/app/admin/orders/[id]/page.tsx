"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface OrderDetail {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: {
    postalCode?: string;
    state?: string;
    city?: string;
    address1?: string;
    address2?: string;
  };
  total: number;
  subtotal: number;
  shippingCost: number;
  tax: number;
  status: string;
  shippingCarrier?: string | null;
  paymentMethod?: string;
  paymentStatus: string;
  squarePaymentId?: string | null;
  refundId?: string | null;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  items: OrderItem[];
}

interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
  variant?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "未処理", color: "bg-yellow-100 text-yellow-800" },
  paid: { label: "支払い済み", color: "bg-emerald-100 text-emerald-800" },
  processing: { label: "処理中", color: "bg-blue-100 text-blue-800" },
  shipped: { label: "発送済", color: "bg-green-100 text-green-800" },
  delivered: { label: "配達完了", color: "bg-gray-100 text-gray-800" },
  cancelled: { label: "キャンセル", color: "bg-red-100 text-red-800" },
  refunded: { label: "返金済み", color: "bg-orange-100 text-orange-800" },
};

const paymentStatusLabels: Record<string, string> = {
  pending: "未払い",
  paid: "支払い済み",
  failed: "失敗",
  refunded: "返金済み",
  partially_refunded: "一部返金",
};

const paymentMethodLabels: Record<string, string> = {
  credit_card: "クレジットカード",
  bank_transfer: "銀行振込",
  cash_on_delivery: "代金引換",
  paypay: "PayPay",
};

const carrierLabels: Record<string, string> = {
  yamato: "宅急便（ヤマト運輸）",
  yupack: "ゆうパック（日本郵便）",
};

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const router = useRouter();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  // 編集用フォーム状態
  const [statusInput, setStatusInput] = useState("pending");
  const [paymentStatusInput, setPaymentStatusInput] = useState("pending");
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [notesInput, setNotesInput] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      const { id } = await params;
      setOrderId(id);

      try {
        const response = await fetch(`/api/admin/orders/${id}`);
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        if (!response.ok) {
          throw new Error("注文詳細の取得に失敗しました");
        }
        const data = await response.json();
        const o = data.order;

        const mapped: OrderDetail = {
          id: o._id,
          orderNumber: o.orderNumber,
          customerName: `${o.customer?.firstName || ""} ${o.customer?.lastName || ""}`.trim() || "不明",
          customerEmail: o.customer?.email || "不明",
          customerPhone: o.customer?.phone,
          shippingAddress: {
            postalCode: o.shippingAddress?.postalCode,
            state: o.shippingAddress?.state,
            city: o.shippingAddress?.city,
            address1: o.shippingAddress?.address1,
            address2: o.shippingAddress?.address2,
          },
          total: o.total || 0,
          subtotal: o.subtotal || 0,
          shippingCost: o.shippingCost || 0,
          tax: o.tax || 0,
          status: o.status || "pending",
          shippingCarrier: o.shippingCarrier,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus || "pending",
          squarePaymentId: o.squarePaymentId,
          refundId: o.refundId,
          trackingNumber: o.trackingNumber,
          notes: o.notes,
          createdAt: o.createdAt || new Date().toISOString(),
          updatedAt: o.updatedAt,
          items: (o.items || []).map((item: { product?: { name?: string }; quantity: number; price: number; variant?: string }) => ({
            productName: item.product?.name || "商品名不明",
            quantity: item.quantity,
            price: item.price,
            variant: item.variant,
          })),
        };

        setOrder(mapped);
        setStatusInput(mapped.status);
        setPaymentStatusInput(mapped.paymentStatus);
        setTrackingNumberInput(mapped.trackingNumber || "");
        setNotesInput(mapped.notes || "");
      } catch (err) {
        console.error("Order fetch error:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [params]);

  const handleSave = async () => {
    if (!orderId || !order) return;
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusInput,
          paymentStatus: paymentStatusInput,
          trackingNumber: trackingNumberInput,
          notes: notesInput,
        }),
      });
      if (!response.ok) {
        throw new Error("注文の更新に失敗しました");
      }
      setOrder({
        ...order,
        status: statusInput,
        paymentStatus: paymentStatusInput,
        trackingNumber: trackingNumberInput,
        notes: notesInput,
        updatedAt: new Date().toISOString(),
      });
      alert("保存しました");
    } catch (err) {
      console.error("Order update error:", err);
      alert(err instanceof Error ? err.message : "注文の更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!orderId || !window.confirm("この注文をキャンセルしますか？在庫が確保・確定済みの場合は自動的に戻されます。")) {
      return;
    }
    setStatusInput("cancelled");
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!response.ok) {
        throw new Error("注文のキャンセルに失敗しました");
      }
      setOrder(prev => prev ? { ...prev, status: "cancelled" } : prev);
    } catch (err) {
      console.error("Order cancel error:", err);
      alert(err instanceof Error ? err.message : "注文のキャンセルに失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async () => {
    if (!orderId || !order) return;
    if (
      !window.confirm(
        `お客様のカードに ¥${order.total.toLocaleString()} を返金します。\n` +
        `この操作でSquare経由で実際に返金され、取り消せません。よろしいですか？`
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/refund`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "返金に失敗しました");
      }
      setOrder(prev => prev ? { ...prev, status: "refunded", paymentStatus: "refunded", refundId: data.refundId } : prev);
      setStatusInput("refunded");
      setPaymentStatusInput("refunded");
      alert(`返金が完了しました（¥${(data.amount ?? order.total).toLocaleString()}）`);
    } catch (err) {
      console.error("Order refund error:", err);
      alert(err instanceof Error ? err.message : "返金に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!orderId || !order) return;
    if (!window.confirm(`注文「${order.orderNumber}」を完全に削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("注文の削除に失敗しました");
      }
      router.push("/admin/orders");
    } catch (err) {
      console.error("Order delete error:", err);
      alert(err instanceof Error ? err.message : "注文の削除に失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-64"></div>
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">
          注文が見つかりません
        </h2>
        <Link
          href="/admin/orders"
          className="mt-4 text-moss-green hover:underline"
        >
          注文一覧に戻る
        </Link>
      </div>
    );
  }

  const isFinalStatus = order.status === "cancelled" || order.status === "refunded";
  // カード決済で支払い済み・未返金の注文だけ「カードへ返金」を出す。
  // Square Payment ID が無い注文（振込・代引など）はカード返金の対象外。
  const isRefundable =
    order.paymentStatus === "paid" &&
    !!order.squarePaymentId &&
    !order.refundId &&
    order.status !== "refunded";

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link
            href="/admin/orders"
            className="text-moss-green hover:underline text-sm font-medium"
          >
            ← 注文一覧に戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">
            {order.orderNumber}
          </h1>
          <p className="text-gray-600">
            {new Date(order.createdAt).toLocaleDateString("ja-JP")}{" "}
            {new Date(order.createdAt).toLocaleTimeString("ja-JP")}
            {order.updatedAt && (
              <span className="ml-3 text-sm text-gray-400">
                (更新: {new Date(order.updatedAt).toLocaleString("ja-JP")})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${(statusConfig[order.status] || statusConfig.pending).color}`}
          >
            {(statusConfig[order.status] || { label: order.status }).label}
          </span>
          {isRefundable ? (
            <button
              onClick={handleRefund}
              disabled={saving}
              className="px-3 py-1.5 text-sm font-medium text-white bg-orange-600 border border-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              カードへ返金する（¥{order.total.toLocaleString()}）
            </button>
          ) : !isFinalStatus ? (
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-3 py-1.5 text-sm font-medium text-red-700 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
            >
              注文をキャンセル
            </button>
          ) : null}
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            完全に削除
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-6">
          {/* 注文商品 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-medium">注文商品</h2>
            </div>
            <div className="divide-y">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="px-6 py-4 flex items-center space-x-4"
                >
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                    🌱
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.productName}</h3>
                    {item.variant && (
                      <p className="text-sm text-gray-500">バリエーション: {item.variant}</p>
                    )}
                    <p className="text-sm text-gray-600">
                      単価: ¥{item.price.toLocaleString()} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      ¥{(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">小計</span>
                  <span>¥{order.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">送料</span>
                  <span>¥{order.shippingCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">消費税</span>
                  <span>¥{order.tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>合計</span>
                  <span>¥{order.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 備考 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-medium">備考</h2>
            </div>
            <div className="px-6 py-4">
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-moss-green focus:border-moss-green text-sm"
                placeholder="管理者用のメモを入力"
              />
            </div>
          </div>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* ステータス更新 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-medium">ステータス編集</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">注文ステータス</label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-moss-green focus:border-moss-green"
                >
                  {Object.entries(statusConfig).map(([status, config]) => (
                    <option key={status} value={status}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">支払いステータス</label>
                <select
                  value={paymentStatusInput}
                  onChange={(e) => setPaymentStatusInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-moss-green focus:border-moss-green"
                >
                  {Object.entries(paymentStatusLabels).map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">追跡番号</label>
                <input
                  type="text"
                  value={trackingNumberInput}
                  onChange={(e) => setTrackingNumberInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-moss-green focus:border-moss-green"
                  placeholder="未設定"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-4 py-2 bg-moss-green text-white rounded-md hover:bg-moss-green/90 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>

          {/* 顧客情報 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-medium">顧客情報</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <p className="text-sm text-gray-600">氏名</p>
                <p className="font-medium">{order.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">メールアドレス</p>
                <p className="font-medium">{order.customerEmail}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">電話番号</p>
                <p className="font-medium">{order.customerPhone || "不明"}</p>
              </div>
            </div>
          </div>

          {/* 配送先情報 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-medium">配送先情報</h2>
            </div>
            <div className="px-6 py-4">
              <p className="font-medium">〒{order.shippingAddress.postalCode || "不明"}</p>
              <p className="font-medium">
                {order.shippingAddress.state}
                {order.shippingAddress.city}
              </p>
              <p className="font-medium">{order.shippingAddress.address1}</p>
              {order.shippingAddress.address2 && (
                <p className="font-medium">{order.shippingAddress.address2}</p>
              )}
              {order.shippingCarrier && (
                <p className="text-sm text-gray-600 mt-3">
                  配送業者: <span className="font-medium text-gray-900">{carrierLabels[order.shippingCarrier] || order.shippingCarrier}</span>
                </p>
              )}
            </div>
          </div>

          {/* 支払情報 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-medium">支払情報</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <p className="text-sm text-gray-600">支払方法</p>
                <p className="font-medium">
                  {order.paymentMethod ? (paymentMethodLabels[order.paymentMethod] || order.paymentMethod) : "不明"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">支払状況</p>
                <p className="font-medium">{paymentStatusLabels[order.paymentStatus] || order.paymentStatus}</p>
              </div>
              {order.refundId && (
                <div>
                  <p className="text-sm text-gray-600">返金</p>
                  <p className="font-medium text-orange-700">カードへ返金済み</p>
                  <p className="text-xs text-gray-400 break-all">Square返金ID: {order.refundId}</p>
                </div>
              )}
              {isRefundable && (
                <p className="text-xs text-gray-500 border-t pt-3">
                  この注文はカード決済済みです。返金する場合は上部の「カードへ返金する」ボタンから行ってください（お客様のカードに実際に返金されます）。
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
