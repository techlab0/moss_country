// Twilioクライアントを遅延初期化（環境変数が設定されている場合のみ）
async function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  // 環境変数が設定されていない場合はnullを返す
  if (!accountSid || !authToken || !accountSid.startsWith('AC')) {
    return null;
  }

  // 動的インポートでビルド時のエラーを回避
  const twilio = (await import('twilio')).default;
  return twilio(accountSid, authToken);
}

export interface SMSCode {
  code: string;
  phoneNumber: string;
  expiresAt: Date;
  userId: string;
}

// メモリ内のSMSコード保存（DB未設定時、およびフォールバック用）
const smsCodeStore = new Map<string, SMSCode>();

// 環境変数でデータベース使用を制御（sms_verification_codesテーブル未作成の環境ではメモリにフォールバック）
const USE_DATABASE = process.env.USE_SUPABASE === 'true';

async function getSupabaseClientForSMS() {
  if (!USE_DATABASE) return null;
  try {
    const { supabaseAdmin } = await import('./supabase');
    return supabaseAdmin;
  } catch (error) {
    console.warn('Supabaseモジュールの読み込みに失敗:', error);
    return null;
  }
}

// SMSコードを保存（DB優先、フォールバックでメモリベース）
async function persistSMSCode(userId: string, code: string, phoneNumber: string, expiresAt: Date): Promise<void> {
  const supabase = await getSupabaseClientForSMS();
  if (supabase) {
    try {
      const { error } = await supabase.from('sms_verification_codes').upsert({
        user_id: userId,
        code,
        phone_number: phoneNumber,
        expires_at: expiresAt.toISOString(),
      });
      if (error) throw error;
      return;
    } catch (error) {
      console.warn('SMS認証コードのDB保存に失敗、メモリベースにフォールバック:', error);
    }
  }

  smsCodeStore.set(userId, { code, phoneNumber, expiresAt, userId });
}

// SMSで認証コードを送信
export async function sendSMSCode(phoneNumber: string, userId: string): Promise<boolean> {
  try {
    // 6桁のランダムコードを生成
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分後に失効

    await persistSMSCode(userId, code, phoneNumber, expiresAt);

    // Twilioクライアントを取得
    const client = await getTwilioClient();

    if (!client) {
      console.warn('Twilio client not configured. SMS code generated but not sent:', code);
      return true;
    }

    // Twilio経由でSMSを送信
    const message = await client.messages.create({
      body: `MOSS COUNTRY 認証コード: ${code}（5分間有効）`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    console.log(`SMS sent successfully: ${message.sid}`);
    return true;
  } catch (error) {
    console.error('SMS sending failed:', error);
    return false;
  }
}

// SMSコードを検証（DB優先、フォールバックでメモリベース）
export async function verifySMSCode(userId: string, inputCode: string): Promise<boolean> {
  const supabase = await getSupabaseClientForSMS();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('sms_verification_codes')
        .select('code, expires_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;

      if (data) {
        const isValid = data.code === inputCode && new Date() < new Date(data.expires_at);
        if (isValid) {
          await supabase.from('sms_verification_codes').delete().eq('user_id', userId);
        }
        return isValid;
      }
      // DB側に該当データがない場合はメモリ側（フォールバック時に保存された可能性）を確認する
    } catch (error) {
      console.warn('SMS認証コードのDB照会に失敗、メモリベースにフォールバック:', error);
    }
  }

  const storedCode = smsCodeStore.get(userId);

  if (!storedCode) {
    return false;
  }

  const isValid = storedCode.code === inputCode && new Date() < storedCode.expiresAt;

  if (isValid) {
    // 使用済みコードを削除
    smsCodeStore.delete(userId);
  }

  return isValid;
}

// 期限切れのコードを清理
export async function cleanupExpiredCodes(): Promise<void> {
  const supabase = await getSupabaseClientForSMS();
  if (supabase) {
    try {
      await supabase.from('sms_verification_codes').delete().lt('expires_at', new Date().toISOString());
    } catch (error) {
      console.warn('SMS認証コードのDBクリーンアップに失敗:', error);
    }
  }

  const now = new Date();
  for (const [userId, codeData] of smsCodeStore.entries()) {
    if (now > codeData.expiresAt) {
      smsCodeStore.delete(userId);
    }
  }
}

// 電話番号の形式を正規化
export function normalizePhoneNumber(phoneNumber: string): string {
  // 日本の電話番号を国際形式に変換
  let normalized = phoneNumber.replace(/[^\d]/g, '');
  
  if (normalized.startsWith('0')) {
    normalized = '+81' + normalized.substring(1);
  } else if (!normalized.startsWith('+')) {
    normalized = '+81' + normalized;
  }
  
  return normalized;
}

// 電話番号の形式を検証
export function isValidPhoneNumber(phoneNumber: string): boolean {
  const normalized = normalizePhoneNumber(phoneNumber);
  // 日本の携帯電話番号の基本的な検証
  return /^\+81[7-9]\d{8}$/.test(normalized);
}