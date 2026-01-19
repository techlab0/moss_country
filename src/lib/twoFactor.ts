export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

// 2FA設定を生成
export async function generateTwoFactorSetup(): Promise<TwoFactorSetup> {
  // 動的インポートでビルド時のエラーを回避
  const speakeasy = await import('speakeasy');
  const QRCode = await import('qrcode');

  const secret = speakeasy.generateSecret({
    issuer: 'MOSS COUNTRY',
    name: 'Admin Account',
    length: 32,
  });

  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

  // バックアップコードを生成（8桁の数字×10個）
  const backupCodes = Array.from({ length: 10 }, () => {
    return Math.random().toString().substr(2, 8);
  });

  return {
    secret: secret.base32!,
    qrCodeUrl,
    backupCodes,
  };
}

// TOTPトークンを検証
export async function verifyTwoFactorToken(token: string, secret: string): Promise<boolean> {
  const speakeasy = await import('speakeasy');
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // 時間のずれを許容（±2分）
  });
}

// バックアップコードを検証
export function verifyBackupCode(inputCode: string, backupCodes: string[]): boolean {
  return backupCodes.includes(inputCode);
}

// 2FA設定を環境変数から取得
export function getTwoFactorSecret(): string | null {
  return process.env.ADMIN_2FA_SECRET || null;
}

export function getBackupCodes(): string[] {
  const codes = process.env.ADMIN_BACKUP_CODES;
  return codes ? codes.split(',') : [];
}
