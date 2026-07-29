// メール送信基盤（AWS SES SMTP / Gmail）の設定解決が壊れないことを確認する。
// SESはリージョンごとに認証情報が別物で、ホスト・ポート・secure の組み合わせを
// 取り違えると本番で問い合わせメールが丸ごと落ちるため、ここで固定しておく。

import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

// STORE_EMAIL はモジュール読み込み時に確定するため、import より前に設定する
process.env.STORE_EMAIL = 'info@mosscountry.com';

const mailerModuleUrl = pathToFileURL(resolve('src/lib/mailer.ts')).href;
const { describeMailerConfig, sendMail, STORE_EMAIL } = await import(mailerModuleUrl);

const MAIL_ENV_KEYS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'MAIL_FROM',
  'SES_CONFIGURATION_SET',
  'GMAIL_USER',
  'GMAIL_APP_PASSWORD',
];

// run が非同期でも環境変数を戻すのが早すぎないよう、必ず await してから復元する
async function withMailEnv(env, run) {
  const saved = Object.fromEntries(MAIL_ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of MAIL_ENV_KEYS) delete process.env[key];
  Object.assign(process.env, env);
  try {
    return await run();
  } finally {
    for (const key of MAIL_ENV_KEYS) delete process.env[key];
    for (const [key, value] of Object.entries(saved)) {
      if (value !== undefined) process.env[key] = value;
    }
  }
}

test('SMTP_* が揃っていればSESのSMTPを使う', async () => {
  await withMailEnv(
    {
      SMTP_HOST: 'email-smtp.ap-southeast-2.amazonaws.com',
      SMTP_PORT: '587',
      SMTP_SECURE: 'false',
      SMTP_USER: 'AKIAEXAMPLESMTPUSER',
      SMTP_PASS: 'smtp-password',
      MAIL_FROM: 'info@mosscountry.com',
    },
    () => {
      const config = describeMailerConfig();

      assert.equal(config.configured, true);
      assert.equal(config.provider, 'smtp');
      assert.equal(config.host, 'email-smtp.ap-southeast-2.amazonaws.com');
      assert.equal(config.port, 587);
      // 587はSTARTTLS。ここがtrueになるとSESに接続できずタイムアウトする
      assert.equal(config.secure, false);
      assert.equal(config.from, 'info@mosscountry.com');
    }
  );
});

test('SMTP_SECURE 未指定なら465だけをSSL扱いにする', async () => {
  await withMailEnv(
    { SMTP_HOST: 'sv16805.xserver.jp', SMTP_PORT: '465', SMTP_USER: 'u', SMTP_PASS: 'p' },
    () => assert.equal(describeMailerConfig().secure, true)
  );

  await withMailEnv(
    { SMTP_HOST: 'email-smtp.ap-southeast-2.amazonaws.com', SMTP_PORT: '587', SMTP_USER: 'u', SMTP_PASS: 'p' },
    () => assert.equal(describeMailerConfig().secure, false)
  );
});

test('MAIL_FROM 未設定ならSMTPユーザー名を送信元にする', async () => {
  await withMailEnv(
    { SMTP_HOST: 'email-smtp.ap-southeast-2.amazonaws.com', SMTP_USER: 'smtp-user', SMTP_PASS: 'p' },
    () => assert.equal(describeMailerConfig().from, 'smtp-user')
  );
});

test('SMTP_* が欠けていればGmailにフォールバックする', async () => {
  await withMailEnv(
    // SMTP_PASS が無い＝SES未設定とみなす
    {
      SMTP_HOST: 'email-smtp.ap-southeast-2.amazonaws.com',
      SMTP_USER: 'u',
      GMAIL_USER: 'shop@gmail.com',
      GMAIL_APP_PASSWORD: 'app-password',
    },
    () => {
      const config = describeMailerConfig();

      assert.equal(config.configured, true);
      assert.equal(config.host, 'smtp.gmail.com');
      assert.equal(config.port, 465);
      assert.equal(config.secure, true);
      assert.equal(config.from, 'shop@gmail.com');
    }
  );
});

test('送信基盤が何も設定されていなければ未設定として扱う', async () => {
  await withMailEnv({}, () => {
    const config = describeMailerConfig();

    assert.equal(config.configured, false);
    assert.equal(config.provider, 'none');
  });
});

test('SESの設定セットは環境変数から読み取る', async () => {
  await withMailEnv({ SES_CONFIGURATION_SET: 'mosscountry-default' }, () =>
    assert.equal(describeMailerConfig().configurationSet, 'mosscountry-default')
  );

  await withMailEnv({}, () => assert.equal(describeMailerConfig().configurationSet, null));
});

test('店舗宛の通知先はSTORE_EMAILで上書きできる', () => {
  assert.equal(STORE_EMAIL, 'info@mosscountry.com');
});

test('送信基盤が未設定でも例外を投げず sent:false を返す', async () => {
  await withMailEnv({}, async () => {
    const result = await sendMail({ to: 'test@example.com', subject: 'x', text: 'y' });

    assert.equal(result.sent, false);
    assert.equal(result.reason, 'not-configured');
  });
});

test('宛先が空なら送信せず sent:false を返す', async () => {
  await withMailEnv(
    { SMTP_HOST: 'email-smtp.ap-southeast-2.amazonaws.com', SMTP_USER: 'u', SMTP_PASS: 'p' },
    async () => {
      const result = await sendMail({ to: '', subject: 'x', text: 'y' });

      assert.equal(result.sent, false);
      assert.equal(result.reason, 'no-recipient');
    }
  );
});
