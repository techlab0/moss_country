// speakeasy は型定義（@types/speakeasy）を同梱しないため、最小限の宣言を用意する。
// これが無いと noImplicitAny 環境で import 時に TS7016 になる。
declare module 'speakeasy' {
  export interface GeneratedSecret {
    ascii: string;
    hex: string;
    base32: string;
    otpauth_url?: string;
  }

  export function generateSecret(options?: {
    length?: number;
    name?: string;
    issuer?: string;
    symbols?: boolean;
  }): GeneratedSecret;

  export interface TotpVerifyOptions {
    secret: string;
    encoding?: 'ascii' | 'hex' | 'base32';
    token: string;
    window?: number;
    step?: number;
    time?: number;
  }

  export const totp: {
    verify(options: TotpVerifyOptions): boolean;
    (options: { secret: string; encoding?: string; step?: number; time?: number }): string;
  };

  const speakeasy: {
    generateSecret: typeof generateSecret;
    totp: typeof totp;
  };
  export default speakeasy;
}
