import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  GenerateRegistrationOptionsOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyRegistrationResponseOpts,
  VerifyAuthenticationResponseOpts,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';

// WebAuthn設定
const RP_NAME = 'MOSS COUNTRY Admin';
const RP_ID = process.env.NODE_ENV === 'production' ? 'moss-country.com' : 'localhost';
const ORIGIN = process.env.NODE_ENV === 'production' ? 'https://moss-country.com' : 'http://localhost:3000';

// ユーザー情報の型定義
interface WebAuthnUser {
  id: string;
  email: string;
  credentials: WebAuthnCredential[];
}

interface WebAuthnCredential {
  id: string;
  publicKey: Uint8Array;
  counter: number;
  transports?: AuthenticatorTransport[];
}

// メモリ内ストレージ（本来はデータベース）
const webauthnUsers: Map<string, WebAuthnUser> = new Map();
const currentChallenges: Map<string, string> = new Map();

/**
 * WebAuthn登録オプションを生成
 */
export async function generateWebAuthnRegistrationOptions(userId: string, userEmail: string) {
  try {
    const user = webauthnUsers.get(userId) || {
      id: userId,
      email: userEmail,
      credentials: [],
    };

    const options: GenerateRegistrationOptionsOpts = {
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: userId,
      userName: userEmail,
      userDisplayName: userEmail,
      attestationType: 'none',
      excludeCredentials: user.credentials.map(cred => ({
        id: cred.id,
        type: 'public-key',
        transports: cred.transports,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    };

    const registrationOptions = await generateRegistrationOptions(options);
    
    // チャレンジを保存
    currentChallenges.set(userId, registrationOptions.challenge);
    
    return registrationOptions;
  } catch (error) {
    console.error('WebAuthn registration options generation failed:', error);
    throw new Error('登録オプションの生成に失敗しました');
  }
}

/**
 * WebAuthn登録を検証
 */
export async function verifyWebAuthnRegistration(
  userId: string,
  registrationResponse: RegistrationResponseJSON
) {
  try {
    const expectedChallenge = currentChallenges.get(userId);
    if (!expectedChallenge) {
      throw new Error('チャレンジが見つかりません');
    }

    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

      // 新しい認証情報を保存
      const user = webauthnUsers.get(userId) || {
        id: userId,
        email: '',
        credentials: [],
      };

      const newCredential: WebAuthnCredential = {
        id: Buffer.from(credentialID).toString('base64url'),
        publicKey: credentialPublicKey,
        counter,
        transports: registrationResponse.response.transports,
      };

      user.credentials.push(newCredential);
      webauthnUsers.set(userId, user);

      // チャレンジを削除
      currentChallenges.delete(userId);

      return { verified: true, credentialID: newCredential.id };
    }

    return { verified: false };
  } catch (error) {
    console.error('WebAuthn registration verification failed:', error);
    throw new Error('登録の検証に失敗しました');
  }
}

/**
 * WebAuthn認証オプションを生成
 */
export async function generateWebAuthnAuthenticationOptions(userId: string) {
  try {
    const user = webauthnUsers.get(userId);
    if (!user || user.credentials.length === 0) {
      throw new Error('登録された認証情報が見つかりません');
    }

    const options: GenerateAuthenticationOptionsOpts = {
      rpID: RP_ID,
      allowCredentials: user.credentials.map(cred => ({
        id: Buffer.from(cred.id, 'base64url'),
        type: 'public-key',
        transports: cred.transports,
      })),
      userVerification: 'preferred',
    };

    const authenticationOptions = await generateAuthenticationOptions(options);
    
    // チャレンジを保存
    currentChallenges.set(userId, authenticationOptions.challenge);
    
    return authenticationOptions;
  } catch (error) {
    console.error('WebAuthn authentication options generation failed:', error);
    throw new Error('認証オプションの生成に失敗しました');
  }
}

/**
 * WebAuthn認証を検証
 */
export async function verifyWebAuthnAuthentication(
  userId: string,
  authenticationResponse: AuthenticationResponseJSON
) {
  try {
    const user = webauthnUsers.get(userId);
    const expectedChallenge = currentChallenges.get(userId);
    
    if (!user || !expectedChallenge) {
      throw new Error('ユーザーまたはチャレンジが見つかりません');
    }

    const credentialID = Buffer.from(authenticationResponse.id, 'base64url').toString('base64url');
    const credential = user.credentials.find(cred => cred.id === credentialID);
    
    if (!credential) {
      throw new Error('認証情報が見つかりません');
    }

    const verification = await verifyAuthenticationResponse({
      response: authenticationResponse,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: Buffer.from(credential.id, 'base64url'),
        credentialPublicKey: credential.publicKey,
        counter: credential.counter,
      },
    });

    if (verification.verified) {
      // カウンターを更新
      credential.counter = verification.authenticationInfo.newCounter;
      webauthnUsers.set(userId, user);
      
      // チャレンジを削除
      currentChallenges.delete(userId);
    }

    return { verified: verification.verified };
  } catch (error) {
    console.error('WebAuthn authentication verification failed:', error);
    throw new Error('認証の検証に失敗しました');
  }
}

/**
 * ユーザーのWebAuthn認証情報を取得
 */
export function getUserWebAuthnCredentials(userId: string): WebAuthnCredential[] {
  const user = webauthnUsers.get(userId);
  return user?.credentials || [];
}

/**
 * ユーザーのWebAuthn認証情報を削除
 */
export function removeUserWebAuthnCredentials(userId: string): boolean {
  return webauthnUsers.delete(userId);
}