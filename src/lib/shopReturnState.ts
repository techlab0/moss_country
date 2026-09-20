export const SHOP_RETURN_STATE_KEY = 'moss-country-shop-return-state';
export const SHOP_RETURN_REQUEST_KEY = 'moss-country-shop-return-request';

export type ShopSortOption = 'recommended' | 'name' | 'priceAsc' | 'priceDesc';

export interface ShopReturnState {
  scrollY: number;
  searchQuery: string;
  inStockOnly: boolean;
  selectedCategory: string;
  sortBy: ShopSortOption;
  savedAt: number;
}

const MAX_AGE_MS = 30 * 60 * 1000;

export function parseShopReturnState(value: string | null): ShopReturnState | null {
  if (!value) return null;

  try {
    const state = JSON.parse(value) as Partial<ShopReturnState>;
    const validSorts: ShopSortOption[] = ['recommended', 'name', 'priceAsc', 'priceDesc'];

    if (
      typeof state.scrollY !== 'number' ||
      !Number.isFinite(state.scrollY) ||
      typeof state.searchQuery !== 'string' ||
      typeof state.inStockOnly !== 'boolean' ||
      typeof state.selectedCategory !== 'string' ||
      !validSorts.includes(state.sortBy as ShopSortOption) ||
      typeof state.savedAt !== 'number' ||
      Date.now() - state.savedAt > MAX_AGE_MS
    ) {
      return null;
    }

    return state as ShopReturnState;
  } catch {
    return null;
  }
}
