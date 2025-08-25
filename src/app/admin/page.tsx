'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // /adminアクセス時に/admin/dashboardにリダイレクト
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-moss-green mx-auto"></div>
        <p className="mt-4 text-gray-600">管理画面に移動中...</p>
      </div>
    </div>
  );
}