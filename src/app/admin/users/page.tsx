'use client';

import { useState, useEffect } from 'react';

interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'editor';
  twoFactorEnabled: boolean;
  twoFactorMethod: 'sms' | 'google' | 'device' | null;
  phoneNumber?: string;
  lastLogin?: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'editor' as 'admin' | 'editor',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch {
      setError('ユーザー情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }

    try {
      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewUser({ email: '', password: '', role: 'editor' });
        fetchUsers();
      } else {
        const data = await response.json();
        setError(data.error);
      }
    } catch {
      setError('ユーザーの作成に失敗しました');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('このユーザーを削除しますか？')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchUsers();
      } else {
        setError('ユーザーの削除に失敗しました');
      }
    } catch {
      setError('ユーザーの削除に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-lg font-semibold text-gray-800">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">ユーザー管理</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-moss-green text-white px-4 py-2 rounded-md hover:bg-moss-green/90 font-semibold text-base"
        >
          新しいユーザーを作成
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-base font-medium">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase">
                ユーザー
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase">
                役割
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase">
                2段階認証
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase">
                最終ログイン
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.email}
                    </div>
                    {user.phoneNumber && (
                      <div className="text-sm text-gray-500">
                        📱 {user.phoneNumber}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    user.role === 'admin' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role === 'admin' ? '管理者' : '編集者'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.twoFactorEnabled ? (
                    <span className="flex items-center text-green-600">
                      ✓ {user.twoFactorMethod === 'sms' ? 'SMS' : 
                           user.twoFactorMethod === 'device' ? '端末コード' : 
                           user.twoFactorMethod === 'google' ? 'Google' : '有効'}
                    </span>
                  ) : (
                    <span className="text-gray-400">無効</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.lastLogin 
                    ? new Date(user.lastLogin).toLocaleString('ja-JP')
                    : '未ログイン'
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">新しいユーザーを作成</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  役割
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'editor' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="editor">編集者</option>
                  <option value="admin">管理者</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={createUser}
                className="px-4 py-2 bg-moss-green text-white rounded-md hover:bg-moss-green/90"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}