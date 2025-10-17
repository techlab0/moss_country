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

interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface UserActivity {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  timestamp: string;
}

interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<string, number>;
  recentActivity: number;
}

export default function AdvancedUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionsByCategory, setPermissionsByCategory] = useState<Record<string, Permission[]>>({});
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'activities' | 'batch'>('users');
  
  // バッチ操作用の状態
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchAction, setBatchAction] = useState<'status' | 'role'>('status');
  const [batchData, setBatchData] = useState<any>({});
  const [batchReason, setBatchReason] = useState('');
  
  // 役割作成用の状態
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });

  // 新規ユーザー作成用の状態
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'editor' as 'admin' | 'editor',
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'activities') {
      fetchActivities();
    }
  }, [activeTab]);

  const fetchData = async () => {
    try {
      // ユーザー一覧を取得
      const usersResponse = await fetch('/api/admin/users');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users);
      }

      // 権限・役割情報を取得
      const permissionsResponse = await fetch('/api/admin/permissions');
      if (permissionsResponse.ok) {
        const permissionsData = await permissionsResponse.json();
        setRoles(permissionsData.roles);
        setPermissions(permissionsData.permissions);
        setPermissionsByCategory(permissionsData.permissionsByCategory);
      }

      // 統計情報を取得
      const statsResponse = await fetch('/api/admin/user-activities?action=stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

    } catch (err) {
      setError('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/admin/user-activities?limit=100');
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities);
      }
    } catch (err) {
      console.error('アクティビティの取得に失敗:', err);
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        setSuccess('ユーザーが作成されました');
        setShowCreateModal(false);
        setNewUser({ email: '', password: '', role: 'editor' });
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'ユーザーの作成に失敗しました');
      }
    } catch (err) {
      setError('ユーザーの作成に失敗しました');
    }
  };

  const createRole = async () => {
    if (!newRole.name) {
      setError('役割名を入力してください');
      return;
    }

    try {
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'create_role',
          data: newRole
        }),
      });

      if (response.ok) {
        setSuccess('新しい役割が作成されました');
        setShowRoleModal(false);
        setNewRole({ name: '', description: '', permissions: [] });
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || '役割の作成に失敗しました');
      }
    } catch (err) {
      setError('役割の作成に失敗しました');
    }
  };

  const executeBatchOperation = async () => {
    if (selectedUsers.length === 0) {
      setError('ユーザーを選択してください');
      return;
    }

    try {
      const response = await fetch('/api/admin/users/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: batchAction === 'status' ? 'update_status' : 'update_role',
          userIds: selectedUsers,
          data: batchData,
          reason: batchReason
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`${result.result.success.length}件の操作が完了しました`);
        if (result.result.failed.length > 0) {
          setError(`${result.result.failed.length}件の操作が失敗しました`);
        }
        setShowBatchModal(false);
        setSelectedUsers([]);
        setBatchReason('');
        fetchData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'バッチ操作に失敗しました');
      }
    } catch (err) {
      setError('バッチ操作に失敗しました');
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : roleId === 'admin' ? '管理者' : '編集者';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">高度なユーザー管理</h1>
            <p className="text-gray-600 mt-2">権限管理・アクティビティ追跡・バッチ操作</p>
          </div>
        </div>

        {/* エラー・成功メッセージ */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
            <button onClick={() => setError('')} className="float-right">×</button>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {success}
            <button onClick={() => setSuccess('')} className="float-right">×</button>
          </div>
        )}

        {/* 統計情報 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">総ユーザー数</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-gray-600">アクティブ</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-yellow-600">{stats.recentActivity}</div>
              <div className="text-sm text-gray-600">24時間以内の活動</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">{roles.length}</div>
              <div className="text-sm text-gray-600">役割数</div>
            </div>
          </div>
        )}

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'users', label: 'ユーザー管理', icon: '👥' },
              { key: 'roles', label: '役割・権限', icon: '🔐' },
              { key: 'activities', label: 'アクティビティ', icon: '📊' },
              { key: 'batch', label: 'バッチ操作', icon: '⚡' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ユーザー管理タブ */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={selectAllUsers}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  {selectedUsers.length === users.length ? '全選択解除' : '全選択'}
                </button>
                {selectedUsers.length > 0 && (
                  <button
                    onClick={() => setShowBatchModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    バッチ操作 ({selectedUsers.length}件)
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                + 新規ユーザー作成
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-4 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === users.length}
                        onChange={selectAllUsers}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">メール</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">役割</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">2FA</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">最終ログイン</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">作成日</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {getRoleName(user.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {user.twoFactorEnabled ? (
                          <span className="text-green-600">✓ 有効</span>
                        ) : (
                          <span className="text-gray-400">無効</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString('ja-JP') : '未ログイン'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 役割・権限タブ */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div className="flex justify-between">
              <h2 className="text-xl font-semibold">役割管理</h2>
              <button
                onClick={() => setShowRoleModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                + 新規役割作成
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {roles.map((role) => (
                <div key={role.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{role.name}</h3>
                      <p className="text-gray-600 text-sm">{role.description}</p>
                      {role.isSystem && (
                        <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          システム定義
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">権限 ({role.permissions.length})</h4>
                    <div className="max-h-32 overflow-y-auto">
                      {role.permissions.map((permissionId) => {
                        const permission = permissions.find(p => p.id === permissionId);
                        return permission ? (
                          <div key={permissionId} className="text-xs text-gray-600 mb-1">
                            • {permission.name}
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* アクティビティタブ */}
        {activeTab === 'activities' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">ユーザーアクティビティ</h2>
            
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">時刻</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ユーザー</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">リソース</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">詳細</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(activity.timestamp).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{activity.userEmail}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{activity.action}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{activity.resource}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {Object.keys(activity.details).length > 0 && JSON.stringify(activity.details).substring(0, 50)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {activities.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-500">アクティビティが見つかりませんでした</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* バッチ操作タブ */}
        {activeTab === 'batch' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">バッチ操作</h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="text-yellow-600 mr-2">⚠️</div>
                <div>
                  <h3 className="text-sm font-semibold text-yellow-800">注意</h3>
                  <p className="text-sm text-yellow-700">
                    バッチ操作は複数のユーザーに対して一括で変更を行います。
                    実行前に対象ユーザーと操作内容を必ず確認してください。
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">
                ユーザータブで対象ユーザーを選択してから「バッチ操作」ボタンをクリックしてください。
                現在 {selectedUsers.length} 人のユーザーが選択されています。
              </p>
              
              {selectedUsers.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowBatchModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    バッチ操作を実行 ({selectedUsers.length}件)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 新規ユーザー作成モーダル */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">新規ユーザー作成</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">パスワード</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">役割</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="editor">編集者</option>
                    <option value="admin">管理者</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  キャンセル
                </button>
                <button
                  onClick={createUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  作成
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 新規役割作成モーダル */}
        {showRoleModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-3/4 max-w-2xl shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">新規役割作成</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">役割名</label>
                  <input
                    type="text"
                    value={newRole.name}
                    onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">説明</label>
                  <textarea
                    value={newRole.description}
                    onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">権限</label>
                  <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3">
                    {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                      <div key={category} className="mb-4">
                        <h4 className="font-medium text-gray-800 mb-2 capitalize">{category}</h4>
                        {categoryPermissions.map((permission) => (
                          <div key={permission.id} className="flex items-center mb-1">
                            <input
                              type="checkbox"
                              id={permission.id}
                              checked={newRole.permissions.includes(permission.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewRole({
                                    ...newRole,
                                    permissions: [...newRole.permissions, permission.id]
                                  });
                                } else {
                                  setNewRole({
                                    ...newRole,
                                    permissions: newRole.permissions.filter(p => p !== permission.id)
                                  });
                                }
                              }}
                              className="mr-2"
                            />
                            <label htmlFor={permission.id} className="text-sm">
                              {permission.name}
                              <span className="text-gray-500 ml-1">- {permission.description}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  キャンセル
                </button>
                <button
                  onClick={createRole}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  作成
                </button>
              </div>
            </div>
          </div>
        )}

        {/* バッチ操作モーダル */}
        {showBatchModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                バッチ操作 ({selectedUsers.length}件)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">操作タイプ</label>
                  <select
                    value={batchAction}
                    onChange={(e) => setBatchAction(e.target.value as any)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="status">ステータス変更</option>
                    <option value="role">役割変更</option>
                  </select>
                </div>
                
                {batchAction === 'status' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">新しいステータス</label>
                    <select
                      value={batchData.status || ''}
                      onChange={(e) => setBatchData({...batchData, status: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">選択してください</option>
                      <option value="active">アクティブ</option>
                      <option value="inactive">非アクティブ</option>
                      <option value="suspended">停止</option>
                    </select>
                  </div>
                )}
                
                {batchAction === 'role' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">新しい役割</label>
                    <select
                      value={batchData.roleId || ''}
                      onChange={(e) => setBatchData({...batchData, roleId: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">選択してください</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">理由（任意）</label>
                  <textarea
                    value={batchReason}
                    onChange={(e) => setBatchReason(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={2}
                    placeholder="操作の理由を記録します..."
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  キャンセル
                </button>
                <button
                  onClick={executeBatchOperation}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  実行
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}