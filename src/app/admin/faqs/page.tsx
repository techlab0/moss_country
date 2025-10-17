'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function FAQManagePage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFaq, setEditFaq] = useState<Partial<FAQ>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSetupLoading, setIsSetupLoading] = useState(false);

  // FAQ一覧を取得
  const fetchFaqs = async () => {
    try {
      const response = await fetch('/api/admin/faqs');
      if (response.ok) {
        const data = await response.json();
        setFaqs(data);
      } else {
        throw new Error('FAQ取得に失敗しました');
      }
    } catch (error) {
      console.error('FAQ取得エラー:', error);
      setMessage({ type: 'error', text: 'FAQの取得に失敗しました' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  // 新規作成モーダルを開く
  const openCreateModal = () => {
    setEditFaq({ question: '', answer: '', display_order: faqs.length + 1, is_active: true });
    setIsEditModalOpen(true);
  };

  // 編集モーダルを開く
  const openEditModal = (faq: FAQ) => {
    setEditFaq(faq);
    setIsEditModalOpen(true);
  };

  // モーダルを閉じる
  const closeModal = () => {
    setIsEditModalOpen(false);
    setEditFaq({});
  };

  // FAQを保存
  const saveFaq = async () => {
    try {
      const url = '/api/admin/faqs';
      const method = editFaq.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFaq),
      });

      if (response.ok) {
        await fetchFaqs();
        setMessage({ type: 'success', text: editFaq.id ? 'FAQを更新しました' : 'FAQを作成しました' });
        closeModal();
      } else {
        throw new Error('保存に失敗しました');
      }
    } catch (error) {
      setMessage({ type: 'error', text: '保存中にエラーが発生しました' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  // FAQを削除
  const deleteFaq = async (id: string) => {
    if (!confirm('このFAQを削除しますか？')) return;

    try {
      const response = await fetch('/api/admin/faqs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        await fetchFaqs();
        setMessage({ type: 'success', text: 'FAQを削除しました' });
      } else {
        throw new Error('削除に失敗しました');
      }
    } catch (error) {
      setMessage({ type: 'error', text: '削除中にエラーが発生しました' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  // FAQテーブルセットアップ
  const setupFaqTable = async () => {
    setIsSetupLoading(true);
    try {
      const response = await fetch('/api/admin/faqs/setup', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'FAQテーブルセットアップ完了' });
        await fetchFaqs();
      } else {
        setMessage({ type: 'error', text: data.error || 'セットアップに失敗しました' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'セットアップ中にエラーが発生しました' });
    } finally {
      setIsSetupLoading(false);
    }

    setTimeout(() => setMessage(null), 5000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-lg text-gray-600">FAQを読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            ダッシュボードに戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">FAQ管理</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={setupFaqTable} 
            disabled={isSetupLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSetupLoading ? 'セットアップ中...' : 'FAQテーブルセットアップ'}
          </Button>
          <Button onClick={openCreateModal} className="bg-moss-green hover:bg-moss-green/90">
            新しいFAQを作成
          </Button>
        </div>
      </div>

      {/* メッセージ */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 
          'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* FAQ一覧 */}
      <div className="space-y-4">
        {faqs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 mb-4">まだFAQがありません</p>
              <Button onClick={openCreateModal} className="bg-moss-green hover:bg-moss-green/90">
                最初のFAQを作成
              </Button>
            </CardContent>
          </Card>
        ) : (
          faqs.map((faq, index) => (
            <Card key={faq.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="bg-moss-green text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">
                        Q{index + 1}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">{faq.question}</h3>
                    </div>
                    <div className="flex items-start ml-11">
                      <span className="bg-light-green text-moss-green rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-1">
                        A
                      </span>
                      <p className="text-gray-700">{faq.answer}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(faq)}
                    >
                      編集
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteFaq(faq.id)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      削除
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* 編集・作成モーダル */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">
                  {editFaq.id ? 'FAQを編集' : '新しいFAQを作成'}
                </h3>
                <Button variant="ghost" onClick={closeModal} className="p-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">質問</label>
                  <input
                    type="text"
                    value={editFaq.question || ''}
                    onChange={(e) => setEditFaq(prev => ({ ...prev, question: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="よくある質問を入力してください"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">回答</label>
                  <textarea
                    value={editFaq.answer || ''}
                    onChange={(e) => setEditFaq(prev => ({ ...prev, answer: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg h-32"
                    placeholder="回答を入力してください"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">表示順序</label>
                  <input
                    type="number"
                    value={editFaq.display_order || 0}
                    onChange={(e) => setEditFaq(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    min="1"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={saveFaq} className="flex-1 bg-moss-green hover:bg-moss-green/90">
                    {editFaq.id ? '更新' : '作成'}
                  </Button>
                  <Button onClick={closeModal} variant="ghost">
                    キャンセル
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}