// じゃらん予約通知メールの解析が壊れないことを確認する。
//
// ここが誤ると、日付や人数が不正な予約が台帳に入り、受付枠の空き計算まで狂う
// （＝自社サイト側でダブルブッキングや取りこぼしが起きる）。実メールの本文を
// そのまま固定しておく。

import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const moduleUrl = pathToFileURL(resolve('src/lib/jalanBookingMail.ts')).href;
const { parseJalanBookingMail, resolveJalanMailKind, extractEmailAddress, JalanMailParseError } =
  await import(moduleUrl);

// 実際に届いたメールの「▲ 予約内容」ブロック。氏名・メール・電話は伏せてある。
const RESERVATION_BLOCK = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▲ 予約内容
予約番号：31E1TTKAQ
利用日時：2026/08/22(土) 11:30～13:30
プラン名：＼実店舗オープン／【北海道/札幌】癒しの苔テラリウム作り体験 ～自然を手のひらに～当日持ち帰りOK♪♪＜女性・カップル・ファミリー・お友達同士おすすめ♪＞
人数：2名  (おひとり様（約横6cmx縦11cm）:1名、おひとり様（約横10cmx縦8cm）:1名、おひとり様（約横9cmx縦17cm）:0名)
支払方法：現地払い
合計料金(税込)：7,000円
ポイント利用額：5,000ポイント
クーポン利用額：0円
※クーポン利用最低金額：0円
（クーポン利用無し）
■カスタマへの請求額■  2,000円


体験者氏名：テスト太郎様
メールアドレス：masked@example.com
電話番号：08000000000
当日緊急連絡先：08000000001
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

const TENTATIVE_MAIL = `Moss Country  予約担当者様

仮予約を受付いたしました。
ご確認をお願いいたします。
なお、仮予約のため、こちらの予約は確定しておりません。

${RESERVATION_BLOCK}`;

const CONFIRMED_MAIL = `Moss Country  予約担当者様

予約が確定しました。
ご確認をお願いいたします。

${RESERVATION_BLOCK}`;

const CANCELLED_MAIL = `Moss Country  予約担当者様

予約がキャンセルされました。
ご確認をお願いいたします。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▲ 予約内容
予約番号：31N8UY5BN
利用日時：2026/08/19(水) 15:00～17:00
プラン名：＼実店舗オープン／【北海道/札幌】癒しの苔テラリウム作り体験 ～自然を手のひらに～当日持ち帰りOK♪♪
人数：2名  (おひとり様（約横6cmx縦11cm）:1名、おひとり様（約横10cmx縦8cm）:1名、おひとり様（約横9cmx縦17cm）:0名)
支払方法：現地払い
合計料金(税込)：7,000円
ポイント利用額：400ポイント
クーポン利用額：0円
※クーポン利用最低金額：0円
（クーポン利用無し）
■カスタマへの請求額■  6,600円


体験者氏名：テスト花子様
メールアドレス：masked2@example.com
電話番号：09000000000
当日緊急連絡先：09000000001
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

test('送信元アドレスから種別を判定する', () => {
  assert.equal(resolveJalanMailKind('reservation_request@activityboard.jp'), 'tentative');
  assert.equal(resolveJalanMailKind('reservation@activityboard.jp'), 'confirmed');
  assert.equal(resolveJalanMailKind('reservation_cancel@activityboard.jp'), 'cancelled');
});

test('表示名付きのFromヘッダーからでも判定できる', () => {
  assert.equal(extractEmailAddress('"じゃらん" <reservation@activityboard.jp>'), 'reservation@activityboard.jp');
  assert.equal(resolveJalanMailKind('じゃらんnet <RESERVATION@activityboard.jp>'), 'confirmed');
});

test('取込み対象外の送信元はnullを返す', () => {
  // これらを予約として取り込むと、予約でないものが台帳に入ってしまう
  assert.equal(resolveJalanMailKind('info@activityboard.jp'), null);
  assert.equal(resolveJalanMailKind('reminder@activityboard.jp'), null);
  assert.equal(resolveJalanMailKind('autoextension_complete@activityboard.jp'), null);
  assert.equal(resolveJalanMailKind('autoextension_notification@activityboard.jp'), null);
});

test('仮予約メールを解析する', () => {
  const parsed = parseJalanBookingMail('reservation_request@activityboard.jp', TENTATIVE_MAIL);

  assert.equal(parsed.kind, 'tentative');
  assert.equal(parsed.bookingNumber, '31E1TTKAQ');
  assert.equal(parsed.date, '2026-08-22');
  assert.equal(parsed.startTime, '11:30');
  assert.equal(parsed.endTime, '13:30');
  assert.equal(parsed.partySize, 2);
  assert.equal(parsed.paymentMethodLabel, '現地払い');
  assert.equal(parsed.totalYen, 7000);
  assert.equal(parsed.pointYen, 5000);
  assert.equal(parsed.couponYen, 0);
  assert.equal(parsed.chargeAtVenueYen, 2000);
  assert.equal(parsed.customerName, 'テスト太郎');
  assert.equal(parsed.customerEmail, 'masked@example.com');
  assert.equal(parsed.customerPhone, '08000000000');
  assert.equal(parsed.emergencyPhone, '08000000001');
  assert.match(parsed.planName, /癒しの苔テラリウム作り体験/);
});

test('確定メールは仮予約と同じ予約番号になる（＝同じ予約の更新として扱える）', () => {
  const tentative = parseJalanBookingMail('reservation_request@activityboard.jp', TENTATIVE_MAIL);
  const confirmed = parseJalanBookingMail('reservation@activityboard.jp', CONFIRMED_MAIL);

  assert.equal(confirmed.kind, 'confirmed');
  assert.equal(confirmed.bookingNumber, tentative.bookingNumber);
  assert.equal(confirmed.date, tentative.date);
  assert.equal(confirmed.startTime, tentative.startTime);
  assert.equal(confirmed.partySize, tentative.partySize);
});

test('キャンセルメールを解析する', () => {
  const parsed = parseJalanBookingMail('reservation_cancel@activityboard.jp', CANCELLED_MAIL);

  assert.equal(parsed.kind, 'cancelled');
  assert.equal(parsed.bookingNumber, '31N8UY5BN');
  assert.equal(parsed.date, '2026-08-19');
  assert.equal(parsed.startTime, '15:00');
  assert.equal(parsed.endTime, '17:00');
  assert.equal(parsed.pointYen, 400);
  assert.equal(parsed.chargeAtVenueYen, 6600);
});

test('「※クーポン利用最低金額」をクーポン利用額と誤読しない', () => {
  const body = RESERVATION_BLOCK.replace('クーポン利用額：0円', 'クーポン利用額：1,500円');
  const parsed = parseJalanBookingMail('reservation@activityboard.jp', body);
  assert.equal(parsed.couponYen, 1500);
});

test('CRLF改行のメールでも解析できる', () => {
  const parsed = parseJalanBookingMail(
    'reservation@activityboard.jp',
    CONFIRMED_MAIL.replace(/\n/g, '\r\n')
  );
  assert.equal(parsed.bookingNumber, '31E1TTKAQ');
  assert.equal(parsed.date, '2026-08-22');
  assert.equal(parsed.partySize, 2);
});

test('必須項目が欠けたメールは例外にする（不正な予約を台帳へ入れない）', () => {
  const noNumber = TENTATIVE_MAIL.replace('予約番号：31E1TTKAQ', '');
  assert.throws(
    () => parseJalanBookingMail('reservation@activityboard.jp', noNumber),
    JalanMailParseError
  );

  const noDate = TENTATIVE_MAIL.replace(/^利用日時.*$/m, '');
  assert.throws(
    () => parseJalanBookingMail('reservation@activityboard.jp', noDate),
    JalanMailParseError
  );

  const noParty = TENTATIVE_MAIL.replace(/^人数.*$/m, '');
  assert.throws(
    () => parseJalanBookingMail('reservation@activityboard.jp', noParty),
    JalanMailParseError
  );
});

test('対象外の送信元は解析自体を拒否する', () => {
  assert.throws(
    () => parseJalanBookingMail('info@activityboard.jp', TENTATIVE_MAIL),
    JalanMailParseError
  );
});
