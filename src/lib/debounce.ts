/**
 * デバウンス関数
 * 連続した関数呼び出しを指定した遅延時間後に実行
 */
// 引数の型をタプルで受けることで、(cartData: Cart) => void のような
// 具体的な引数を持つ関数もそのまま渡せる。
export function debounce<TArgs extends unknown[]>(
  func: (...args: TArgs) => unknown,
  wait: number
): (...args: TArgs) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: TArgs) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
  };
}

/**
 * スロットル関数
 * 指定した間隔でのみ関数を実行
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}