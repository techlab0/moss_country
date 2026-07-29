import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { sendMail, STORE_EMAIL } from '@/lib/mailer';
import { verifyAdminSession } from '@/lib/auth';
import { logAuditEvent } from '@/lib/auditLog';

// 管理画面からお問い合わせに初回返信を送るエンドポイント。
//
// 返信本文は SES 経由でお客様に送り、控えを店舗（STORE_EMAIL）にBCCする。
// これで管理画面とメールボックスの両方に履歴が残り、
// 以降のやりとりはメールソフト側で続けられる。
//
// 往復のやりとりを管理画面で扱うことは想定していない（IMAPでの受信取り込みが必要になるため）。
// このエンドポイントは「まだ返信していない問い合わせ」にだけ使える。

const replySchema = z.object({
  message: z
    .string()
    .min(1, '返信内容を入力してください')
    .max(5000, '返信内容は5000文字以内で入力してください'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const { message } = replySchema.parse(await request.json());

    const { data: inquiry, error: fetchError } = await supabaseAdmin
      .from('contact_inquiries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !inquiry) {
      return NextResponse.json(
        { error: 'お問い合わせが見つかりません' },
        { status: 404 }
      );
    }

    // docs/sql/add-contact-reply-columns.sql が未実行だと返信を記録できない。
    // 記録できないまま送信すると、二重送信の判定（replied_at）も効かなくなり
    // お客様に何通も届きうるため、メールを送る前に止める。
    // select('*') の結果にキーが無ければ、その列はまだ存在しない。
    if (!('replied_at' in inquiry)) {
      return NextResponse.json(
        {
          error:
            '返信を記録する列がデータベースにありません。docs/sql/add-contact-reply-columns.sql をSupabaseで実行してください。',
        },
        { status: 500 }
      );
    }

    // 二重送信の防止。画面の二度押しや、別の担当者が同時に開いていた場合に
    // お客様へ同じ内容が2通届くのを防ぐ。
    if (inquiry.replied_at) {
      return NextResponse.json(
        {
          error: 'この問い合わせには既に返信済みです。追加のやりとりはメールソフトから行ってください。',
          repliedAt: inquiry.replied_at,
        },
        { status: 409 }
      );
    }

    // メール送信が失敗した場合にDBを「返信済み」にしてしまうと、
    // 送っていない返信を送ったことにしてしまう。必ず送信成功を確認してから記録する。
    const result = await sendMail({
      to: inquiry.email,
      // お客様が返信したら店舗の受信箱に届くようにする
      replyTo: STORE_EMAIL,
      // 送信控えを店舗の受信箱にも残す（お客様には表示されない）
      bcc: STORE_EMAIL,
      subject: `Re: ${inquiry.subject}`,
      text: [
        `${inquiry.name} 様`,
        '',
        message,
        '',
        '----',
        'MOSS COUNTRY',
        STORE_EMAIL,
        '',
        '',
        '--- お問い合わせいただいた内容 ---',
        `件名: ${inquiry.subject}`,
        `お問い合わせ種類: ${inquiry.inquiry_type}`,
        '',
        inquiry.message,
      ].join('\n'),
    });

    if (!result.sent) {
      console.error('お問い合わせへの返信メール送信に失敗しました:', {
        contactId: id,
        reason: result.reason,
      });
      return NextResponse.json(
        {
          error: '返信メールの送信に失敗しました。時間をおいて再度お試しください。',
          reason: result.reason,
        },
        { status: 502 }
      );
    }

    const repliedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('contact_inquiries')
      .update({
        status: 'replied',
        replied_at: repliedAt,
        reply_message: message,
        replied_by: session.email,
        updated_at: repliedAt,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      // メールは既に送信済み。ここで失敗しても送信は取り消せないため、
      // エラーにはせず「送信は済んだが記録に失敗した」ことを呼び出し元に伝える。
      console.error('返信メールは送信できたが、記録の更新に失敗しました:', {
        contactId: id,
        updateError,
      });
      return NextResponse.json({
        sent: true,
        recorded: false,
        message: '返信メールは送信しましたが、送信内容の記録に失敗しました。',
      });
    }

    await logAuditEvent(
      session.userId,
      session.email,
      'contact.replied',
      'contact_management',
      {
        contactId: id,
        contactEmail: inquiry.email,
        contactName: inquiry.name,
        messageLength: message.length,
      },
      { resourceId: id, severity: 'medium' }
    );

    return NextResponse.json({ sent: true, recorded: true, contact: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? '入力内容に誤りがあります' },
        { status: 400 }
      );
    }

    console.error('お問い合わせ返信APIでエラーが発生しました:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
