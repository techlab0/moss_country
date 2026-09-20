'use client';

import Link from 'next/link';
import { SHOP_RETURN_REQUEST_KEY } from '@/lib/shopReturnState';

interface ShopBackLinkProps {
  className?: string;
}

export function ShopBackLink({ className }: ShopBackLinkProps) {
  return (
    <Link
      href="/shop"
      onClick={() => sessionStorage.setItem(SHOP_RETURN_REQUEST_KEY, 'true')}
      className={className}
    >
      ← 商品一覧に戻る
    </Link>
  );
}
