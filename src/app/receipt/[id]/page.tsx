'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';

interface ReceiptLineItem {
  name: string;
  quantity?: number;
  amount?: number;
}

interface Receipt {
  amount: number;
  subtotal?: number;
  discountAmount?: number;
  taxExcludedAmount?: number;
  taxAmount?: number;
  description?: string;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt?: string;
  paidAt?: string;
  lineItems?: ReceiptLineItem[];
}

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [notFound, setNotFound] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/receipt/${id}`);
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        if (!response.ok) return;
        const data = await response.json();
        setReceipt(data.charge);
        if (data.charge.status === 'pending') {
          startPolling();
        } else if (pollRef.current) {
          clearInterval(pollRef.current);
        }
      } catch {
        // 一時的な通信エラーは次のポーリングに任せる
      }
    };

    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(load, 3000);
    };

    load();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id]);

  if (notFound) {
    return (
      <div className="bg-stone-950 min-h-screen pt-20 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-4">レシートが見つかりません</h1>
          <Link href="/" className="text-emerald-400 hover:text-emerald-300">
            トップページに戻る
          </Link>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="bg-stone-950 min-h-screen pt-20 px-4">
        <div className="max-w-md mx-auto py-16 animate-pulse">
          <div className="h-8 bg-stone-800 rounded mb-4"></div>
          <div className="h-32 bg-stone-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stone-950 min-h-screen pt-20 px-4">
      <div className="max-w-md mx-auto py-10">
        {receipt.status === 'paid' && (
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">お支払いが完了しました</h1>
            <p className="text-stone-400 text-sm">ご利用ありがとうございます</p>
          </div>
        )}

        {receipt.status === 'pending' && (
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">お支払い処理中です</h1>
            <p className="text-emerald-400 text-sm animate-pulse">まもなく反映されます...</p>
          </div>
        )}

        {receipt.status === 'cancelled' && (
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">お支払いはキャンセルされました</h1>
          </div>
        )}

        <div className="bg-stone-900/50 backdrop-blur-sm border border-stone-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-stone-400 mb-3">MOSS COUNTRY レシート</h2>

          {receipt.description && (
            <p className="text-stone-300 text-sm mb-3">{receipt.description}</p>
          )}

          {receipt.lineItems && receipt.lineItems.length > 0 && (
            <ul className="divide-y divide-stone-800 mb-4">
              {receipt.lineItems.map((li, idx) => (
                <li key={idx} className="py-2 flex justify-between text-sm text-stone-300">
                  <span>{li.name}{li.quantity ? ` × ${li.quantity}` : ''}</span>
                  <span>¥{(li.amount || 0).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-stone-800 pt-4 space-y-1">
            {typeof receipt.subtotal === 'number' && (receipt.discountAmount || 0) > 0 && (
              <>
                <div className="flex justify-between text-sm text-stone-400">
                  <span>小計</span>
                  <span>¥{receipt.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-400">
                  <span>割引</span>
                  <span>−¥{(receipt.discountAmount || 0).toLocaleString()}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center pt-1">
              <span className="text-stone-300 font-medium">合計</span>
              <span className="text-2xl font-bold text-white">¥{receipt.amount.toLocaleString()}</span>
            </div>
            {typeof receipt.taxExcludedAmount === 'number' && (
              <>
                <div className="flex justify-between text-xs text-stone-500 pt-1">
                  <span>（内訳）税抜金額</span>
                  <span>¥{receipt.taxExcludedAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-500">
                  <span>消費税（10%）</span>
                  <span>¥{(receipt.taxAmount || 0).toLocaleString()}</span>
                </div>
              </>
            )}
          </div>

          {receipt.paidAt && (
            <p className="text-xs text-stone-500 mt-4 text-right">
              {new Date(receipt.paidAt).toLocaleString('ja-JP')}
            </p>
          )}
        </div>

        <div className="text-center mt-8">
          <Link href="/" className="text-emerald-400 hover:text-emerald-300 text-sm">
            トップページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
