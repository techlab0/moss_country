'use client';

import { usePathname } from 'next/navigation';

// 管理画面(/admin配下)ではサイト用のヘッダー・フッターを表示しない。
// 管理画面は AdminLayout が自前のヘッダー・サイドバーを持つため、二重表示になるのを防ぐ。
export function HideOnAdmin({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) {
    return null;
  }
  return <>{children}</>;
}
