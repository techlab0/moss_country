import React from 'react';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
  progress?: number;
  showProgress?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = '読み込み中...', 
  fullScreen = true,
  progress = 0,
  showProgress = false
}) => {
  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex items-center justify-center bg-stone-900"
    : "flex items-center justify-center py-12";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center">
        {/* 上部のローディング要素 */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>

        {/* ロゴ（静的） */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 mb-8">
          <img 
            src="/images/moss_country_logo.avif" 
            alt="MOSS COUNTRY" 
            className="h-16 w-auto"
          />
        </div>

        {/* 下部のローディング要素 */}
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-6"></div>

        {/* メッセージ */}
        <div className="text-center">
          <p className="text-emerald-300 text-lg font-medium animate-pulse">
            {message}
          </p>
          
          {/* プログレスバー */}
          {showProgress && (
            <div className="mt-4 w-64">
              <div className="flex justify-between text-sm text-emerald-300 mb-2">
                <span>進行状況</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-2 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// インライン用のミニローディング
export const InlineLoading: React.FC<{ message?: string }> = ({ message = '読み込み中...' }) => {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-6 h-6 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <span className="text-emerald-600 text-sm font-medium">{message}</span>
      </div>
    </div>
  );
};

// ボタン用のローディングスピナー
export const ButtonLoading: React.FC = () => {
  return (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
};