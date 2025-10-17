import { redirect } from 'next/navigation';

export default function AdminRedirectPage() {
  // サーバーサイドでリダイレクト
  redirect('/admin/dashboard');
}