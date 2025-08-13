'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // エラーログを送信（本番環境では外部サービスへ）
    if (process.env.NODE_ENV === 'production') {
      // TODO: エラー監視サービスに送信
      // analytics.track('error', { error: error.message, stack: error.stack });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // カスタムフォールバックUIが提供されている場合はそれを使用
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // デフォルトのエラーUI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              エラーが発生しました
            </h2>
            <p className="text-gray-600 mb-6">
              申し訳ございません。一時的な問題が発生しました。
              しばらく時間をおいて再度お試しください。
            </p>
            <div className="space-y-3">
              <Button 
                onClick={this.handleRetry}
                variant="primary"
                className="w-full"
              >
                再試行する
              </Button>
              <Button 
                onClick={() => window.location.href = '/'}
                variant="ghost"
                className="w-full"
              >
                ホームに戻る
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  開発者情報を表示
                </summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded text-xs text-red-600 overflow-auto">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// フック型のエラーバウンダリ（カート専用）
export const CartErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-6 text-center bg-red-50 border border-red-200 rounded-lg">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 4M7 13l1.5-4m0 0L5.4 5M7 13h10m0 0l1.5 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-800 mb-2">
            カート機能でエラーが発生しました
          </h3>
          <p className="text-red-600 mb-4">
            ショッピングカートに一時的な問題が発生しています。
            ページを更新してもう一度お試しください。
          </p>
          <Button 
            onClick={() => window.location.reload()}
            variant="primary"
            size="sm"
          >
            ページを更新
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};