'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  SiteSettingsData,
  NavLink,
  maintenanceTargetPages,
  snsPlatformLabels,
} from '@/lib/siteSettingsDefaults';
import type { ShippingSettings, CarrierId } from '@/lib/shipping';

type MaintenanceSettings = {
  isEnabled: boolean;
  password: string;
  message?: string;
  purchaseLocked?: boolean;
  purchaseLockedMessage?: string;
};

// 購入ロック中、実際に決済しようとしたお客様にだけ表示される文言（事前バナーは出さない）。
const DEFAULT_PURCHASE_LOCKED_MESSAGE =
  '申し訳ございませんが、ただいまオンラインでのご注文を承ることができません。お手数ですが、お問い合わせよりご連絡ください。';

type Tab = 'maintenance' | 'navigation' | 'shipping';

type NavListKey = 'headerLinks' | 'footerSitemapLinks' | 'footerLegalLinks';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('maintenance');
  const [maintenanceSettings, setMaintenanceSettings] = useState<MaintenanceSettings>({
    isEnabled: false,
    password: '',
    message: '',
    purchaseLocked: false,
    purchaseLockedMessage: DEFAULT_PURCHASE_LOCKED_MESSAGE,
  });
  const [siteSettings, setSiteSettings] = useState<SiteSettingsData | null>(null);
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
  };

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [maintRes, siteRes, shipRes] = await Promise.all([
        fetch('/api/admin/maintenance/settings'),
        fetch('/api/admin/site-settings'),
        fetch('/api/admin/shipping-settings'),
      ]);
      if (maintRes.ok) {
        const data = await maintRes.json();
        setMaintenanceSettings(data.settings);
      }
      if (siteRes.ok) {
        const data = await siteRes.json();
        setSiteSettings(data.settings);
      }
      if (shipRes.ok) {
        const data = await shipRes.json();
        setShippingSettings(data.settings);
      }
    } catch (error) {
      console.error('設定の取得に失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSaveMaintenance = async () => {
    if (!maintenanceSettings.password.trim()) {
      showMessage('メンテナンスパスワードを入力してください', 'error');
      return;
    }
    setIsSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/maintenance/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenanceSettings),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '設定の保存に失敗しました');
      }
      showMessage('設定を保存しました', 'success');
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '設定の保存に失敗しました', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSiteSettings = async () => {
    if (!siteSettings) return;
    setIsSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteSettings),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '設定の保存に失敗しました');
      }
      const data = await response.json();
      setSiteSettings(data.settings);
      showMessage('設定を保存しました（サイトに即時反映されます）', 'success');
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '設定の保存に失敗しました', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveShipping = async () => {
    if (!shippingSettings) return;
    setIsSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/shipping-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: shippingSettings }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '設定の保存に失敗しました');
      }
      const data = await response.json();
      setShippingSettings(data.settings);
      showMessage('送料設定を保存しました（サイトに即時反映されます）', 'success');
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '設定の保存に失敗しました', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ----- ナビリンク編集ヘルパー -----

  const updateNavLink = (listKey: NavListKey, index: number, patch: Partial<NavLink>) => {
    setSiteSettings(prev => {
      if (!prev) return prev;
      const list = prev[listKey].map((link, i) => (i === index ? { ...link, ...patch } : link));
      return { ...prev, [listKey]: list };
    });
  };

  const moveNavLink = (listKey: NavListKey, index: number, delta: number) => {
    setSiteSettings(prev => {
      if (!prev) return prev;
      const list = [...prev[listKey]];
      const target = index + delta;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...prev, [listKey]: list };
    });
  };

  const addNavLink = (listKey: NavListKey) => {
    setSiteSettings(prev => {
      if (!prev) return prev;
      return { ...prev, [listKey]: [...prev[listKey], { label: '', href: '/', isVisible: true }] };
    });
  };

  const removeNavLink = (listKey: NavListKey, index: number) => {
    setSiteSettings(prev => {
      if (!prev) return prev;
      return { ...prev, [listKey]: prev[listKey].filter((_, i) => i !== index) };
    });
  };

  const toggleMaintenancePage = (path: string) => {
    setSiteSettings(prev => {
      if (!prev) return prev;
      const pages = prev.maintenancePages.includes(path)
        ? prev.maintenancePages.filter(p => p !== path)
        : [...prev.maintenancePages, path];
      return { ...prev, maintenancePages: pages };
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-moss-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">サイト設定</h1>
        <p className="text-gray-600 mt-2">サイトの基本設定を管理します</p>
      </div>

      {/* タブ */}
      <div className="flex rounded-lg overflow-hidden border border-gray-300">
        <button
          onClick={() => setTab('maintenance')}
          className={`flex-1 py-3 font-medium ${tab === 'maintenance' ? 'bg-moss-green text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          メンテナンス
        </button>
        <button
          onClick={() => setTab('navigation')}
          className={`flex-1 py-3 font-medium ${tab === 'navigation' ? 'bg-moss-green text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          ヘッダー・フッター
        </button>
        <button
          onClick={() => setTab('shipping')}
          className={`flex-1 py-3 font-medium ${tab === 'shipping' ? 'bg-moss-green text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          送料
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${
          messageType === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {tab === 'maintenance' && (
        <>
          {/* サイト全体のメンテナンスモード */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">サイト全体のメンテナンスモード</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                <div>
                  <h3 className="font-medium text-gray-900">メンテナンスモード</h3>
                  <p className="text-sm text-gray-600">
                    有効にすると、パスワードを入力したユーザーのみサイトにアクセスできます
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={maintenanceSettings.isEnabled}
                    onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, isEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-moss-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-moss-green"></div>
                </label>
              </div>

              <div>
                <label htmlFor="maintenance-password" className="block text-sm font-medium text-gray-700 mb-2">
                  メンテナンスパスワード
                </label>
                <input
                  type="password"
                  id="maintenance-password"
                  value={maintenanceSettings.password}
                  onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-moss-green focus:border-transparent"
                  placeholder="メンテナンスパスワードを入力"
                />
                <p className="mt-1 text-xs text-gray-500">
                  保存先は保護されたSupabase（管理者のみアクセス可能）です。公開データセットには保存されません。
                </p>
              </div>

              <div>
                <label htmlFor="maintenance-message" className="block text-sm font-medium text-gray-700 mb-2">
                  メンテナンスメッセージ
                </label>
                <textarea
                  id="maintenance-message"
                  value={maintenanceSettings.message || ''}
                  onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, message: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-moss-green focus:border-transparent"
                  placeholder="メンテナンス中に表示するメッセージ"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <div className={`w-3 h-3 rounded-full ${maintenanceSettings.isEnabled ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                <span className="text-sm text-gray-700">
                  現在: {maintenanceSettings.isEnabled ? 'メンテナンス中（一般ユーザーはアクセス不可）' : '公開中'}
                </span>
              </div>
            </div>

            {/* 購入ロック（閲覧・カート追加は可、注文/決済の確定のみ停止） */}
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">購入ロック</h3>
                <p className="text-sm text-gray-600 mt-1">
                  サイトの閲覧・カートへの追加はそのままでき、注文/決済の確定だけを止めます。
                  公開中や決済手段の審査中など、実際の注文・決済事故を防ぎたいときに使用してください。
                </p>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                <div>
                  <h4 className="font-medium text-gray-900">購入をロック</h4>
                  <p className="text-sm text-gray-600">
                    有効にすると、注文/決済の確定APIが停止されます（閲覧・カート追加には影響しません）
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                  <input
                    type="checkbox"
                    checked={maintenanceSettings.purchaseLocked ?? false}
                    onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, purchaseLocked: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-moss-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-moss-green"></div>
                </label>
              </div>

              <div>
                <label htmlFor="purchase-locked-message" className="block text-sm font-medium text-gray-700 mb-2">
                  購入ロック時の表示メッセージ
                </label>
                <textarea
                  id="purchase-locked-message"
                  value={maintenanceSettings.purchaseLockedMessage ?? ''}
                  onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, purchaseLockedMessage: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-moss-green focus:border-transparent"
                  placeholder={DEFAULT_PURCHASE_LOCKED_MESSAGE}
                />
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${maintenanceSettings.purchaseLocked ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                <span className="text-sm text-gray-700">
                  現在: {maintenanceSettings.purchaseLocked ? '購入ロック中（閲覧・カート追加は可、注文/決済は停止）' : '購入可能'}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleSaveMaintenance}
                disabled={isSaving}
                className="bg-moss-green hover:bg-moss-green/90 text-white px-6 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '全体メンテナンス設定を保存'}
              </button>
            </div>
          </div>

          {/* ページ別の準備中設定 */}
          {siteSettings && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">ページ別の準備中設定</h2>
              <p className="text-sm text-gray-600 mb-4">
                チェックしたページは「このページは現在準備中です」と表示され、一般ユーザーは閲覧できなくなります（管理者ログイン中は閲覧可能）。
              </p>
              <ul className="divide-y border rounded-md">
                {maintenanceTargetPages.map(page => (
                  <li key={page.path} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{page.label}</p>
                      <p className="text-xs text-gray-500">{page.path}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={siteSettings.maintenancePages.includes(page.path)}
                        onChange={() => toggleMaintenancePage(page.path)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <button
                  onClick={handleSaveSiteSettings}
                  disabled={isSaving}
                  className="bg-moss-green hover:bg-moss-green/90 text-white px-6 py-2 rounded-md transition-colors disabled:opacity-50"
                >
                  {isSaving ? '保存中...' : 'ページ別設定を保存'}
                </button>
              </div>
            </div>
          )}

          {/* 検索エンジン設定 */}
          {siteSettings && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">検索エンジン設定</h2>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                <div>
                  <h3 className="font-medium text-gray-900">検索エンジンのインデックスを許可する</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    オフ: robots.txtで全ページのクロールを拒否します（公開前はオフ推奨）。<br />
                    オン: クロールを許可し、sitemap.xmlを公開します。
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                  <input
                    type="checkbox"
                    checked={siteSettings.allowIndexing}
                    onChange={(e) => setSiteSettings(prev => (prev ? { ...prev, allowIndexing: e.target.checked } : prev))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-moss-green"></div>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <div className={`w-3 h-3 rounded-full ${siteSettings.allowIndexing ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-sm text-gray-700">
                  現在: {siteSettings.allowIndexing ? '検索エンジンにインデックス許可中' : 'インデックス拒否中（非公開）'}
                </span>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveSiteSettings}
                  disabled={isSaving}
                  className="bg-moss-green hover:bg-moss-green/90 text-white px-6 py-2 rounded-md transition-colors disabled:opacity-50"
                >
                  {isSaving ? '保存中...' : '検索エンジン設定を保存'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'navigation' && siteSettings && (
        <>
          <NavLinkListEditor
            title="ヘッダー・ハンバーガーのリンク"
            description="サイト上部とスマホのハンバーガーメニューに表示されるリンクです（並び順=表示順）"
            links={siteSettings.headerLinks}
            onUpdate={(i, patch) => updateNavLink('headerLinks', i, patch)}
            onMove={(i, d) => moveNavLink('headerLinks', i, d)}
            onAdd={() => addNavLink('headerLinks')}
            onRemove={(i) => removeNavLink('headerLinks', i)}
          />
          <NavLinkListEditor
            title="フッター サイトマップ"
            description="フッターの「サイトマップ」欄に表示されるリンクです"
            links={siteSettings.footerSitemapLinks}
            onUpdate={(i, patch) => updateNavLink('footerSitemapLinks', i, patch)}
            onMove={(i, d) => moveNavLink('footerSitemapLinks', i, d)}
            onAdd={() => addNavLink('footerSitemapLinks')}
            onRemove={(i) => removeNavLink('footerSitemapLinks', i)}
          />
          <NavLinkListEditor
            title="フッター 規約関連リンク"
            description="フッター最下部の規約関連リンクです"
            links={siteSettings.footerLegalLinks}
            onUpdate={(i, patch) => updateNavLink('footerLegalLinks', i, patch)}
            onMove={(i, d) => moveNavLink('footerLegalLinks', i, d)}
            onAdd={() => addNavLink('footerLegalLinks')}
            onRemove={(i) => removeNavLink('footerLegalLinks', i)}
          />

          {/* SNSリンク */}
          <div className="bg-white shadow-sm rounded-lg p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">SNSリンク</h2>
            <ul className="space-y-2">
              {siteSettings.snsLinks.map((sns, index) => (
                <li key={sns.platform} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-sm text-gray-700">{snsPlatformLabels[sns.platform]}</span>
                  <input
                    type="text"
                    value={sns.url}
                    onChange={(e) => setSiteSettings(prev => {
                      if (!prev) return prev;
                      const snsLinks = prev.snsLinks.map((s, i) => (i === index ? { ...s, url: e.target.value } : s));
                      return { ...prev, snsLinks };
                    })}
                    placeholder="URL"
                    className="flex-1 min-w-0 px-2 py-2 text-sm border border-gray-300 rounded-md"
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={sns.isVisible !== false}
                      onChange={(e) => setSiteSettings(prev => {
                        if (!prev) return prev;
                        const snsLinks = prev.snsLinks.map((s, i) => (i === index ? { ...s, isVisible: e.target.checked } : s));
                        return { ...prev, snsLinks };
                      })}
                    />
                    表示
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {/* フッター文言 */}
          <div className="bg-white shadow-sm rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">フッターの文言</h2>
            <div>
              <label className="block text-sm text-gray-600 mb-1">紹介文</label>
              <textarea
                value={siteSettings.footerTagline}
                onChange={(e) => setSiteSettings(prev => (prev ? { ...prev, footerTagline: e.target.value } : prev))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">営業時間</label>
                <input
                  type="text"
                  value={siteSettings.businessHours}
                  onChange={(e) => setSiteSettings(prev => (prev ? { ...prev, businessHours: e.target.value } : prev))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">営業日</label>
                <input
                  type="text"
                  value={siteSettings.businessDays}
                  onChange={(e) => setSiteSettings(prev => (prev ? { ...prev, businessDays: e.target.value } : prev))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">コピーライト表記</label>
              <input
                type="text"
                value={siteSettings.copyrightText}
                onChange={(e) => setSiteSettings(prev => (prev ? { ...prev, copyrightText: e.target.value } : prev))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleSaveSiteSettings}
            disabled={isSaving}
            className="w-full py-3 bg-moss-green text-white font-medium rounded-md hover:bg-moss-green/90 disabled:opacity-50"
          >
            {isSaving ? '保存中...' : 'ヘッダー・フッター設定を保存'}
          </button>
        </>
      )}

      {tab === 'shipping' && shippingSettings && (
        <ShippingSettingsEditor
          settings={shippingSettings}
          onChange={setShippingSettings}
          onSave={handleSaveShipping}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

function ShippingSettingsEditor({
  settings,
  onChange,
  onSave,
  isSaving,
}: {
  settings: ShippingSettings;
  onChange: (next: ShippingSettings) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const carrier = settings.carrier;
  const table = settings.carriers[carrier];
  const zones = settings.zones;
  const sizes = [...table.sizeTiers].sort((a, b) => a.size - b.size);

  const priceOf = (zoneId: string, size: number) =>
    table.rates.find((r) => r.zoneId === zoneId && r.size === size)?.price ?? 0;

  const setCarrier = (c: CarrierId) => onChange({ ...settings, carrier: c });

  const setRate = (zoneId: string, size: number, price: number) => {
    const rates = [...table.rates];
    const idx = rates.findIndex((r) => r.zoneId === zoneId && r.size === size);
    if (idx >= 0) rates[idx] = { ...rates[idx], price };
    else rates.push({ zoneId, size, price });
    onChange({ ...settings, carriers: { ...settings.carriers, [carrier]: { ...table, rates } } });
  };

  const setScalar = (key: keyof ShippingSettings, value: number) =>
    onChange({ ...settings, [key]: value });

  const scalarFields: { key: keyof ShippingSettings; label: string; suffix: string }[] = [
    { key: 'freeShippingThreshold', label: '送料割引の対象となる小計', suffix: '円以上' },
    { key: 'shippingDiscount', label: '送料割引額', suffix: '円' },
    { key: 'expressSurcharge', label: '速達加算', suffix: '円' },
    { key: 'fragileSurcharge', label: '割れ物加算', suffix: '円' },
    { key: 'packagingBufferCm', label: '梱包時の各辺の余裕', suffix: 'cm' },
    { key: 'packagingWeightG', label: '梱包材の重量', suffix: 'g' },
  ];

  return (
    <div className="space-y-6">
      {/* 送料無料モード */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">サイト全体を送料無料にする</h2>
            <p className="text-sm text-gray-600 mt-1">
              有効にすると、商品価格に送料を含める運用（全商品送料込み）になり、下の料金表に関わらず送料は0円になります。
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
            <input
              type="checkbox"
              checked={settings.freeShippingMode}
              onChange={(e) => onChange({ ...settings, freeShippingMode: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-moss-green"></div>
          </label>
        </div>
      </div>

      <div className={settings.freeShippingMode ? 'opacity-50 pointer-events-none space-y-6' : 'space-y-6'}>
      {/* 業者選択 */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">利用する配送業者</h2>
        <p className="text-sm text-gray-600 mb-4">
          お客様の送料計算に使う配送業者と料金表を選びます。料金は下の表で編集できます。
        </p>
        <div className="flex gap-3">
          {(Object.keys(settings.carriers) as CarrierId[]).map((c) => (
            <label
              key={c}
              className={`flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer ${
                carrier === c ? 'border-moss-green bg-moss-green/10' : 'border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="carrier"
                checked={carrier === c}
                onChange={() => setCarrier(c)}
              />
              <span className="text-sm text-gray-800">{settings.carriers[c].label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 料金表（ゾーン × サイズ） */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          料金表（{settings.carriers[carrier].label}）
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          行がサイズ区分、列が地域ゾーンです。金額（円・税込）を直接編集してください。
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700 border">
                  サイズ
                </th>
                {zones.map((z) => (
                  <th key={z.id} className="px-2 py-2 font-medium text-gray-700 border whitespace-nowrap">
                    {z.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizes.map((tier) => (
                <tr key={tier.size}>
                  <td className="sticky left-0 bg-white px-3 py-2 font-medium text-gray-700 border whitespace-nowrap">
                    {tier.size}
                    <span className="block text-[10px] text-gray-400">
                      〜{tier.maxDimensionSum}cm / 〜{(tier.maxWeight / 1000).toFixed(0)}kg
                    </span>
                  </td>
                  {zones.map((z) => (
                    <td key={z.id} className="px-1 py-1 border">
                      <input
                        type="number"
                        min={0}
                        value={priceOf(z.id, tier.size)}
                        onChange={(e) => setRate(z.id, tier.size, Number(e.target.value))}
                        className="w-20 px-2 py-1 text-right border border-gray-200 rounded"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 割引・加算・梱包設定 */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">割引・加算・梱包の設定</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {scalarFields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm text-gray-600 mb-1">{f.label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={Number(settings[f.key])}
                  onChange={(e) => setScalar(f.key, Number(e.target.value))}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm text-right"
                />
                <span className="text-sm text-gray-500">{f.suffix}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      </div>

      <button
        onClick={onSave}
        disabled={isSaving}
        className="w-full py-3 bg-moss-green text-white font-medium rounded-md hover:bg-moss-green/90 disabled:opacity-50"
      >
        {isSaving ? '保存中...' : '送料設定を保存'}
      </button>
    </div>
  );
}

function NavLinkListEditor({
  title,
  description,
  links,
  onUpdate,
  onMove,
  onAdd,
  onRemove,
}: {
  title: string;
  description: string;
  links: NavLink[];
  onUpdate: (index: number, patch: Partial<NavLink>) => void;
  onMove: (index: number, delta: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="bg-white shadow-sm rounded-lg p-6 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <button onClick={onAdd} className="text-sm px-3 py-1.5 bg-moss-green text-white rounded-md hover:bg-moss-green/90 whitespace-nowrap">
          + 追加
        </button>
      </div>
      <ul className="space-y-2">
        {links.map((link, index) => (
          <li key={index} className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-col">
              <button
                onClick={() => onMove(index, -1)}
                disabled={index === 0}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs leading-none p-1"
              >
                ▲
              </button>
              <button
                onClick={() => onMove(index, 1)}
                disabled={index === links.length - 1}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs leading-none p-1"
              >
                ▼
              </button>
            </div>
            <input
              type="text"
              value={link.label}
              onChange={(e) => onUpdate(index, { label: e.target.value })}
              placeholder="表示名"
              className="w-32 px-2 py-2 text-sm border border-gray-300 rounded-md"
            />
            <input
              type="text"
              value={link.href}
              onChange={(e) => onUpdate(index, { href: e.target.value })}
              placeholder="/path または https://..."
              className="flex-1 min-w-[140px] px-2 py-2 text-sm border border-gray-300 rounded-md"
            />
            <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
              <input
                type="checkbox"
                checked={link.isVisible !== false}
                onChange={(e) => onUpdate(index, { isVisible: e.target.checked })}
              />
              表示
            </label>
            <button onClick={() => onRemove(index)} className="text-red-500 text-sm px-1">✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
