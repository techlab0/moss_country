import twilio from 'twilio';

// Twilioクライアントを遅延初期化（環境変数が設定されている場合のみ）
function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  // 環境変数が設定されていない場合はnullを返す
  if (!accountSid || !authToken || !accountSid.startsWith('AC')) {
    return null;
  }
  
  return twilio(accountSid, authToken);
}

export interface SMSCode {
  code: string;
  phoneNumber: string;
  expiresAt: Date;
  userId: string;
}

// メモリ内のSMSコード保存（本来はRedisやデータベース）
const smsCodeStore = new Map<string, SMSCode>();

// SMSで認証コードを送信
export async function sendSMSCode(phoneNumber: string, userId: string): Promise<boolean> {
  try {
    // 6桁のランダムコードを生成
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分後に失効

    // Twilioクライアントを取得
    const client = getTwilioClient();
    
    if (!client) {
      console.warn('Twilio client not configured. SMS code generated but not sent:', code);
      // 開発環境ではコードを保存して続行
      smsCodeStore.set(userId, {
        code,
        phoneNumber,
        expiresAt,
        userId,
      });
      return true;
    }

    // Twilio経由でSMSを送信
    const message = await client.messages.create({
      body: `MOSS COUNTRY 認証コード: ${code}（5分間有効）`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    // コードを保存
    smsCodeStore.set(userId, {
      code,
      phoneNumber,
      expiresAt,
      userId,
    });

    console.log(`SMS sent successfully: ${message.sid}`);
    return true;
  } catch (error) {
    console.error('SMS sending failed:', error);
    return false;
  }
}

// SMSコードを検証
export function verifySMSCode(userId: string, inputCode: string): boolean {
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
export function cleanupExpiredCodes(): void {
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