import { redirect } from 'next/navigation';

export default function AdminMobileWorkshopPage() {
  redirect('/admin/pages?page=mobileWorkshop');
}
