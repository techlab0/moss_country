import type { Metadata } from 'next';
import { MaintenancePage } from '@/components/maintenance/MaintenancePage';

// メンテナンス中の案内は検索結果に載せない
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function Maintenance() {
  return <MaintenancePage />;
}