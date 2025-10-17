// ローディングシステムの設定

export const LOADING_CONFIG = {
  // デフォルト設定
  DEFAULT_MAX_TIME: 5000,    // 最大5秒
  DEFAULT_MIN_TIME: 800,     // 最小0.8秒
  
  // ページ別設定
  PAGE_CONFIGS: {
    // トップページ - 重要なので少し長めに
    '/': {
      maxTime: 6000,
      minTime: 1000,
      message: 'MOSS COUNTRYへようこそ...'
    },
    
    // ブログページ - 画像が多いので長めに
    '/blog': {
      maxTime: 7000,
      minTime: 1200,
      message: 'ブログを読み込み中...'
    },
    
    // 商品ページ - 画像が多い
    '/products': {
      maxTime: 6000,
      minTime: 1000,
      message: '商品を読み込み中...'
    },
    
    // 苔図鑑 - 画像が多い
    '/moss-guide': {
      maxTime: 7000,
      minTime: 1200,
      message: '苔図鑑を読み込み中...'
    },
    
    // ワークショップページ
    '/workshop': {
      maxTime: 4000,
      minTime: 800,
      message: 'ワークショップ情報を読み込み中...'
    },
    
    // ストーリーページ
    '/story': {
      maxTime: 4000,
      minTime: 800,
      message: 'ストーリーを読み込み中...'
    },
    
    // 店舗情報ページ
    '/store': {
      maxTime: 4000,
      minTime: 800,
      message: '店舗情報を読み込み中...'
    }
  },
  
  // 除外パス（ローディングを表示しないページ）
  EXCLUDE_PATHS: [
    '/admin',     // 管理画面
    '/api',       // APIルート
    '/checkout',  // チェックアウト（UX重視）
    '/payment'    // 決済関連（UX重視）
  ],
  
  // プログレス設定
  PROGRESS: {
    UPDATE_INTERVAL: 100,        // プログレス更新間隔（ミリ秒）
    RANDOM_INCREMENT_MAX: 20,    // ランダム増分の最大値
    STOP_AT_PERCENTAGE: 90,      // この%で停止（実際の読み込み完了を待つ）
  },
  
  // メッセージ設定
  MESSAGES: {
    LOADING: 'ページを読み込み中...',
    IMAGES: '画像を読み込み中...',
    ALMOST_DONE: 'もうすぐ完了...',
    FINALIZING: 'NOW LOADING',
    ERROR: '読み込みに時間がかかっています...'
  }
} as const;

// ページ設定を取得するヘルパー関数
export const getPageLoadingConfig = (pathname: string) => {
  // 除外パスをチェック
  if (LOADING_CONFIG.EXCLUDE_PATHS.some(path => pathname.startsWith(path))) {
    return null;
  }
  
  // ページ別設定があるかチェック
  const pageConfig = LOADING_CONFIG.PAGE_CONFIGS[pathname as keyof typeof LOADING_CONFIG.PAGE_CONFIGS];
  
  if (pageConfig) {
    return pageConfig;
  }
  
  // デフォルト設定を返す
  return {
    maxTime: LOADING_CONFIG.DEFAULT_MAX_TIME,
    minTime: LOADING_CONFIG.DEFAULT_MIN_TIME,
    message: LOADING_CONFIG.MESSAGES.LOADING
  };
};