'use client';

import { useState, useEffect } from 'react';

interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  inquiry_type: string;
  subject: string;
  message: string;
  status: 'pending' | 'replied' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

interface ContactsResponse {
  contacts: ContactInquiry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  dbConnected?: boolean;
  error?: string;
}

const STATUS_LABELS = {
  pending: '未対応',
  replied: '返信済み',
  resolved: '解決済み'
};

const PRIORITY_LABELS = {
  low: '低',
  medium: '中',
  high: '高'
};

const INQUIRY_TYPE_LABELS = {
  general: '一般的なお問い合わせ',
  workshop: 'ワークショップについて',
  product: '商品について',
  order: '注文について',
  support: 'サポート',
  other: 'その他'
};

function ContactsPage() {
  const [contacts, setContacts] = useState<ContactInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbConnected, setDbConnected] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // フィルター・検索状態
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    inquiry_type: ''
  });

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });

      const response = await fetch(`/api/admin/contacts?${params}`);
      
      if (!response.ok && response.status !== 200) {
        throw new Error('お問い合わせデータの取得に失敗しました');
      }

      const data: ContactsResponse = await response.json();
      
      // データベース接続状態を更新
      setDbConnected(data.dbConnected !== false);
      
      // データベース接続エラーの場合でも、空のデータで表示を続行
      setContacts(data.contacts || []);
      setPagination(data.pagination);
      
      // データベース接続エラーがある場合は警告を表示
      if (data.dbConnected === false || data.error) {
        setError('データベース接続エラー: お問い合わせデータを表示できません。管理者にお問い合わせください。');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setDbConnected(false);
      setContacts([]);
      setPagination({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [pagination.page, filters]);

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // フィルター変更時は1ページ目に戻る
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-red-100 text-red-800';
      case 'replied': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* エラー表示 */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                警告
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">お問い合わせ管理</h1>
        <p className="mt-2 text-sm text-gray-700">
          受信したお問い合わせの確認・管理を行います
          {!dbConnected && <span className="text-red-600 ml-2">(データベース接続エラー)</span>}
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">📧</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    総件数
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {pagination.total}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* フィルター・検索 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              検索
            </label>
            <input
              type="text"
              placeholder="名前、メール、件名で検索"
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-moss-green focus:border-moss-green"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              優先度
            </label>
            <select
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-moss-green focus:border-moss-green"
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <option value="">すべて</option>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              お問い合わせ種類
            </label>
            <select
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-moss-green focus:border-moss-green"
              value={filters.inquiry_type}
              onChange={(e) => handleFilterChange('inquiry_type', e.target.value)}
            >
              <option value="">すべて</option>
              {Object.entries(INQUIRY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* お問い合わせ一覧 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-moss-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              読み込み中...
            </div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {dbConnected ? 'お問い合わせがありません' : 'データベース接続エラーのため、お問い合わせを表示できません'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    お問い合わせ者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    件名・種類
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    優先度
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    受信日時
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {contact.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {contact.email}
                        </div>
                        {contact.phone && (
                          <div className="text-sm text-gray-500">
                            {contact.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {contact.subject}
                        </div>
                        <div className="text-sm text-gray-500">
                          {INQUIRY_TYPE_LABELS[contact.inquiry_type] || contact.inquiry_type}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeColor(contact.priority)}`}>
                        {PRIORITY_LABELS[contact.priority]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(contact.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a
                        href={`/admin/contacts/${contact.id}`}
                        className="text-moss-green hover:text-moss-green-dark"
                      >
                        詳細
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ページネーション */}
      {pagination.totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              前へ
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              次へ
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span>
                -
                <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span>
                / 全
                <span className="font-medium">{pagination.total}</span>
                件
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  前へ
                </button>
                {[...Array(pagination.totalPages)].map((_, index) => {
                  const page = index + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === pagination.page
                          ? 'z-10 bg-moss-green border-moss-green text-white'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  次へ
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContactsPage;