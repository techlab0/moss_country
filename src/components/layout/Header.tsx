'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { defaultSiteSettings, NavLink } from '@/lib/siteSettingsDefaults';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { cart } = useCart();
  // 管理画面のサイト設定で保存されたリンク構成を反映する（保存がなければ従来の構成）
  const [links, setLinks] = useState<NavLink[]>(defaultSiteSettings.headerLinks);

  useEffect(() => {
    fetch('/api/site-settings')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.settings?.headerLinks?.length) {
          setLinks(data.settings.headerLinks);
        }
      })
      .catch(() => {
        // 取得失敗時はデフォルト構成のまま表示する
      });
  }, []);

  const navigation = links
    .filter(link => link.isVisible !== false)
    .map(link => ({ name: link.label, href: link.href }));

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center focus:outline-none">
            <img 
              src="/images/moss_country_logo.avif" 
              alt="MOSS COUNTRY" 
              className="h-12 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-700 hover:text-moss-green transition-colors duration-200 font-medium"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Cart Icon */}
          <div className="hidden md:flex items-center">
            <Link href="/cart" className="relative p-2 text-gray-700 hover:text-moss-green transition-colors duration-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 2.4M17 21a2 2 0 100-4 2 2 0 000 4zm-8 0a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
              {cart.itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {cart.itemCount > 99 ? '99+' : cart.itemCount}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-3 rounded-md text-gray-700 hover:text-moss-green hover:bg-gray-100 transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block px-3 py-2 text-gray-700 hover:text-moss-green hover:bg-gray-50 rounded-md transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <Link
                href="/cart"
                className="flex items-center justify-between px-3 py-2 text-gray-700 hover:text-moss-green hover:bg-gray-50 rounded-md transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 2.4M17 21a2 2 0 100-4 2 2 0 000 4zm-8 0a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                  <span>カート</span>
                </span>
                {cart.itemCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 font-medium">
                    {cart.itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};