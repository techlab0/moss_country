'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SetupData {
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
}

type TwoFactorMethod = 'totp' | 'webauthn';

export default function Setup2FAPage() {
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethod>('totp');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'method-select' | 'setup' | 'verify' | 'backup'>('method-select');
  const router = useRouter();


  const generateSetup = async (method: TwoFactorMethod) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ method }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (method === 'webauthn') {
          // WebAuthn登録処理
          try {
            // @ts-ignore - WebAuthn types
            const credential = await navigator.credentials.create({
              publicKey: data.options
            });
            
            if (!credential) {
              setError('WebAuthn認証がキャンセルされました');
              return;
            }
            
            // 登録完了をサーバーに送信
            const verifyResponse = await fetch('/api/admin/2fa/webauthn/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ credential }),
            });
            
            if (verifyResponse.ok) {
              router.push('/admin/dashboard');
              return;
            } else {
              const errorData = await verifyResponse.json();
              setError(errorData.error || 'WebAuthn登録に失敗しました');
            }
          } catch (webauthnError: any) {
            console.error('WebAuthn error:', webauthnError);
            if (webauthnError.name === 'NotAllowedError') {
              setError('認証がキャンセルされました');
            } else if (webauthnError.name === 'NotSupportedError') {
              setError('このブラウザはWebAuthnに対応していません');
            } else {
              setError('WebAuthn認証中にエラーが発生しました');
            }
          }
        } else {
          setSetupData(data);
          setStep('setup');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || '2FA設定の生成に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const verifySetup = async () => {
    if (!verificationCode || !setupData) return;
    
    setIsVerifying(true);
    setError('');

    try {
      const response = await fetch('/api/admin/2fa/verify-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: verificationCode,
          secret: setupData.secret,
        }),
      });

      if (response.ok) {
        setStep('backup');
      } else {
        const data = await response.json();
        setError(data.error || '認証コードが正しくありません');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsVerifying(false);
    }
  };

  const completSetup = async () => {
    try {
      const response = await fetch('/api/admin/2fa/complete-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: setupData?.secret,
          backupCodes: setupData?.backupCodes,
        }),
      });

      if (response.ok) {
        router.push('/admin/dashboard');
      } else {
        setError('2FA設定の完了に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">2FA設定を準備中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            二段階認証の設定
          </h1>

          {step === 'method-select' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-blue-800">
                  二段階認証方法を選択
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  アカウントの安全性を高めるために、認証方法を選択してください。
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedMethod === 'totp' ? 'border-moss-green bg-moss-green/5' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedMethod('totp')}
                  >
                    <div className="flex items-center space-x-3">
                      <input 
                        type="radio" 
                        checked={selectedMethod === 'totp'} 
                        onChange={() => setSelectedMethod('totp')}
                        className="text-moss-green" 
                      />
                      <div>
                        <h4 className="font-medium text-gray-900">認証アプリ (推奨)</h4>
                        <p className="text-sm text-gray-600">Google Authenticator、Authy等のアプリを使用</p>
                      </div>
                    </div>
                  </div>

                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedMethod === 'webauthn' ? 'border-moss-green bg-moss-green/5' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedMethod('webauthn')}
                  >
                    <div className="flex items-center space-x-3">
                      <input 
                        type="radio" 
                        checked={selectedMethod === 'webauthn'} 
                        onChange={() => setSelectedMethod('webauthn')}
                        className="text-moss-green" 
                      />
                      <div>
                        <h4 className="font-medium text-gray-900">WebAuthn (生体認証)</h4>
                        <p className="text-sm text-gray-600">指紋認証、Face ID、セキュリティキー等</p>
                        <p className="text-xs text-gray-500 mt-1">ℹ️ ブラウザが対応している場合のみ使用可能</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={() => generateSetup(selectedMethod)}
                disabled={isLoading}
                className="w-full bg-moss-green text-white py-2 px-4 rounded-md hover:bg-moss-green/90 disabled:opacity-50"
              >
                {isLoading ? '設定中...' : (selectedMethod === 'webauthn' ? 'WebAuthn認証を開始' : '設定を開始')}
              </button>
            </div>
          )}

          {step === 'setup' && setupData && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-blue-800">
                  ステップ1: 認証アプリでQRコードをスキャン
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Google Authenticator、Authy、1Password等の認証アプリでQRコードをスキャンしてください。
                </p>
              </div>

              <div className="text-center">
                <img
                  src={setupData.qrCodeUrl}
                  alt="2FA QR Code"
                  className="mx-auto border rounded-lg"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  手動設定用シークレットキー:
                </h4>
                <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                  {setupData.secret}
                </code>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setStep('method-select')}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  戻る
                </button>
                <button
                  onClick={() => setStep('verify')}
                  className="flex-1 bg-moss-green text-white py-2 px-4 rounded-md hover:bg-moss-green/90"
                >
                  次へ進む
                </button>
              </div>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-yellow-800">
                  ステップ2: 認証コードを入力
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  認証アプリに表示されている6桁のコードを入力してください。
                </p>
              </div>

              <div>
                <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 mb-2">
                  認証コード (6桁)
                </label>
                <input
                  id="verification-code"
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-lg font-mono"
                  placeholder="123456"
                  disabled={isVerifying}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={() => setStep('setup')}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  戻る
                </button>
                <button
                  onClick={verifySetup}
                  disabled={verificationCode.length !== 6 || isVerifying}
                  className="flex-1 bg-moss-green text-white py-2 px-4 rounded-md hover:bg-moss-green/90 disabled:opacity-50"
                >
                  {isVerifying ? '確認中...' : '確認'}
                </button>
              </div>
            </div>
          )}

          {step === 'backup' && setupData && (
            <div className="space-y-6">
              <div className="bg-red-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-red-800">
                  ステップ3: バックアップコードの保存
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  認証アプリが利用できない場合に使用できるバックアップコードです。
                  安全な場所に保存してください。
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  バックアップコード:
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {setupData.backupCodes.map((code, index) => (
                    <code key={index} className="text-sm font-mono bg-white px-3 py-2 rounded border">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-md">
                <p className="text-sm text-yellow-700">
                  ⚠️ これらのコードは一度しか表示されません。必ず安全な場所に保存してください。
                </p>
              </div>

              <button
                onClick={completSetup}
                className="w-full bg-moss-green text-white py-3 px-4 rounded-md hover:bg-moss-green/90 font-medium"
              >
                2FA設定を完了する
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}