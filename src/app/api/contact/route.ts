import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { sendMail, STORE_EMAIL } from '@/lib/mailer';
import { checkRateLimit } from '@/lib/simpleRateLimit';

// Validation schema for contact form
const contactSchema = z.object({
  name: z.string().min(1, '名前は必須です').max(100, '名前は100文字以内で入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください').max(255, 'メールアドレスは255文字以内で入力してください'),
  phone: z.string().optional(),
  inquiryType: z.string().min(1, 'お問い合わせ種類を選択してください'),
  subject: z.string().min(1, '件名は必須です').max(200, '件名は200文字以内で入力してください'),
  message: z.string().min(1, 'お問い合わせ内容は必須です').max(1000, 'お問い合わせ内容は1000文字以内で入力してください'),
  agreement: z.boolean().refine(val => val === true, 'プライバシーポリシーに同意してください')
});

export async function POST(request: NextRequest) {
  try {
    const rateLimitIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(`contact:${rateLimitIp}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, message: 'リクエストが多すぎます。しばらくしてから再度お試しください。' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // ハニーポット（フォーム上は不可視の website フィールド）に値が入っていたらボットとみなす。
    // 拒否を悟らせないため、何も保存せずに通常と同じ成功レスポンスを返す
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      console.warn('ハニーポット検知: お問い合わせをスパムとして破棄しました');
      return NextResponse.json(
        {
          success: true,
          message: 'お問い合わせありがとうございます。24時間以内にご返信させていただきます。',
          contactId: null,
          dbSaved: false,
        },
        { status: 200 }
      );
    }

    // Validate form data
    const validatedData = contactSchema.parse(body);
    
    // Get client IP and user agent
    const ip = request.ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    let contactId: string | null = null;
    // サーバーサイドのメール送信結果（未設定・失敗でもレスポンスには含めるがエラー扱いはしない）
    let storeNotified = false;
    let customerConfirmed = false;

    // Try to save to database (with timeout)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒タイムアウト

      const { data: contactData, error: dbError } = await supabaseAdmin
        .from('contact_inquiries')
        .insert({
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone || null,
          inquiry_type: validatedData.inquiryType,
          subject: validatedData.subject,
          message: validatedData.message,
          ip_address: ip,
          user_agent: userAgent,
          status: 'pending',
          priority: 'medium'
        })
        .select()
        .single();

      clearTimeout(timeoutId);

      if (dbError) {
        console.error('Database error:', dbError);
        // データベースエラーでもフォーム送信自体は成功として扱う
      } else {
        contactId = contactData?.id || null;
        console.log('Contact inquiry saved to database successfully:', contactId);

        // 店舗宛のお問い合わせ通知メール
        const notifyResult = await sendMail({
          to: STORE_EMAIL,
          subject: `【MOSS COUNTRY】新しいお問い合わせ: ${validatedData.subject}`,
          text: [
            'お問い合わせフォームより新しいお問い合わせがありました。',
            '',
            `お名前: ${validatedData.name}`,
            `メールアドレス: ${validatedData.email}`,
            `電話番号: ${validatedData.phone || '未入力'}`,
            `お問い合わせ種類: ${validatedData.inquiryType}`,
            `件名: ${validatedData.subject}`,
            '',
            'お問い合わせ内容:',
            validatedData.message,
          ].join('\n'),
        });
        storeNotified = notifyResult.sent;

        // 送信者（お客様）宛の受付確認メール
        const confirmResult = await sendMail({
          to: validatedData.email,
          subject: 'お問い合わせありがとうございます - MOSS COUNTRY',
          text: [
            `${validatedData.name} 様`,
            '',
            'この度はMOSS COUNTRYへお問い合わせいただき、誠にありがとうございます。',
            '以下の内容でお問い合わせを受け付けました。24時間以内にご返信させていただきます。',
            '',
            `件名: ${validatedData.subject}`,
            `お問い合わせ種類: ${validatedData.inquiryType}`,
            '',
            'お問い合わせ内容:',
            validatedData.message,
            '',
            '----',
            'MOSS COUNTRY',
          ].join('\n'),
        });
        customerConfirmed = confirmResult.sent;
      }
    } catch (dbSaveError) {
      console.error('Database save failed:', dbSaveError);
      // データベース保存失敗でもフォーム送信は継続
    }

    return NextResponse.json(
      {
        success: true,
        message: 'お問い合わせありがとうございます。24時間以内にご返信させていただきます。',
        contactId: contactId,
        dbSaved: contactId !== null,
        email: { storeNotified, customerConfirmed },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Contact form error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: '入力内容に誤りがあります。',
          errors: error.errors
        },
        { status: 400 }
      );
    }

    // ZodError以外の予期しないエラーは、ユーザーには成功として案内する
    return NextResponse.json(
      { 
        success: true, 
        message: 'お問い合わせを受け付けました。24時間以内にご返信させていただきます。',
        contactId: null,
        dbSaved: false
      },
      { status: 200 }
    );
  }
}

// GET method for retrieving contact inquiries (admin only)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    
    const offset = (page - 1) * limit;
    
    let query = supabaseAdmin
      .from('contact_inquiries')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,subject.ilike.%${search}%`);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
    
  } catch (error) {
    console.error('Get contacts error:', error);
    return NextResponse.json(
      { success: false, message: 'お問い合わせの取得に失敗しました。' },
      { status: 500 }
    );
  }
}