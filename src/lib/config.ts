/**
 * 本番環境設定の検証
 */

export function validateProductionConfig(): {
  isValid: boolean;
  missingVariables: string[];
  warnings: string[];
} {
  const requiredVariables = [
    'NEXT_PUBLIC_SANITY_PROJECT_ID',
    'NEXT_PUBLIC_SANITY_DATASET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const optionalVariables = [
    'SANITY_API_TOKEN',
    'SENDGRID_API_KEY', 
    'NEXT_PUBLIC_SQUARE_APPLICATION_ID',
    'SQUARE_ACCESS_TOKEN',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missingVariables: string[] = [];
  const warnings: string[] = [];

  // 必須環境変数をチェック
  requiredVariables.forEach(variable => {
    if (!process.env[variable]) {
      missingVariables.push(variable);
    }
  });

  // オプション環境変数をチェック
  optionalVariables.forEach(variable => {
    if (!process.env[variable]) {
      warnings.push(`Optional: ${variable} is not set`);
    }
  });

  // 本番環境特有のチェック
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXT_PUBLIC_SANITY_DATASET !== 'production') {
      warnings.push('NEXT_PUBLIC_SANITY_DATASET should be "production" in production environment');
    }
  }

  return {
    isValid: missingVariables.length === 0,
    missingVariables,
    warnings
  };
}

export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';

// Sanity設定
export const sanityConfig = {
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'z36tkqex',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  useCdn: isProduction, // 本番環境ではCDNを使用
  token: process.env.SANITY_API_TOKEN,
};

// Supabase設定
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

// Square設定（決済）
export const squareConfig = {
  applicationId: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
  locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
  isConfigured: !!(
    process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID &&
    process.env.SQUARE_ACCESS_TOKEN
  ),
};

// SendGrid設定（メール送信）
export const sendGridConfig = {
  apiKey: process.env.SENDGRID_API_KEY,
  isConfigured: !!process.env.SENDGRID_API_KEY,
};

// サイト設定
export const siteConfig = {
  name: 'MOSS COUNTRY',
  url: isProduction ? 'https://moss-country.com' : 'http://localhost:3000',
  description: '北海道の苔テラリウム専門店',
  adminEmails: ['admin@mosscountry.com'],
};