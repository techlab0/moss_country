// SendGrid メール送信サービス
import * as sgMail from '@sendgrid/mail';

// 環境変数からAPIキーを設定
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text?: string;
}

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  paymentMethod: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  bankInfo?: {
    bank: string;
    branch: string;
    accountType: string;
    accountNumber: string;
    accountName: string;
    transferDeadline: string;
  };
  codFee?: number;
}

const DEFAULT_FROM_EMAIL = 'noreply@mosscountry.com';

export class EmailService {
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured. Email not sent.');
      return false;
    }

    try {
      const msg = {
        to: options.to,
        from: options.from || DEFAULT_FROM_EMAIL,
        subject: options.subject,
        html: options.html,
        text: options.text || undefined,
      };

      await sgMail.send(msg);
      console.log('Email sent successfully to:', options.to);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  static async sendOrderConfirmationEmail(data: OrderEmailData): Promise<boolean> {
    const subject = `【MOSS COUNTRY】ご注文ありがとうございます - 注文番号: ${data.orderNumber}`;
    
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ご注文確認 - MOSS COUNTRY</title>
    <style>
        body { font-family: 'Hiragino Sans', 'Yu Gothic', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #2d5016; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2d5016; margin-bottom: 10px; }
        .order-info { background: #f8f9f0; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .items-table th { background-color: #f0f0f0; font-weight: bold; }
        .total-row { font-weight: bold; background-color: #f8f9f0; }
        .payment-info { background: #e8f4f8; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .bank-details { background: #fff3cd; padding: 15px; border-radius: 4px; border-left: 4px solid #ffc107; margin: 15px 0; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
        .important { color: #d73527; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🌿 MOSS COUNTRY</div>
            <p>北海道の苔テラリウム専門店</p>
        </div>
        
        <h2>ご注文いただき、ありがとうございます</h2>
        <p>${data.customerName} 様</p>
        <p>この度は、MOSS COUNTRYでのご注文をいただき、誠にありがとうございます。<br>
        ご注文内容をご確認ください。</p>
        
        <div class="order-info">
            <h3>📋 ご注文情報</h3>
            <p><strong>注文番号:</strong> ${data.orderNumber}</p>
            <p><strong>注文日時:</strong> ${new Date().toLocaleDateString('ja-JP', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
        </div>
        
        <h3>🛍️ ご注文商品</h3>
        <table class="items-table">
            <thead>
                <tr>
                    <th>商品名</th>
                    <th>数量</th>
                    <th>単価</th>
                    <th>小計</th>
                </tr>
            </thead>
            <tbody>
                ${data.items.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>¥${item.price.toLocaleString()}</td>
                        <td>¥${item.total.toLocaleString()}</td>
                    </tr>
                `).join('')}
                <tr>
                    <td colspan="3"><strong>商品小計</strong></td>
                    <td><strong>¥${data.subtotal.toLocaleString()}</strong></td>
                </tr>
                <tr>
                    <td colspan="3"><strong>配送料</strong></td>
                    <td><strong>${data.shippingCost === 0 ? '無料' : `¥${data.shippingCost.toLocaleString()}`}</strong></td>
                </tr>
                <tr>
                    <td colspan="3"><strong>消費税</strong></td>
                    <td><strong>¥${data.tax.toLocaleString()}</strong></td>
                </tr>
                ${data.codFee ? `
                <tr>
                    <td colspan="3"><strong>代金引換手数料</strong></td>
                    <td><strong>¥${data.codFee.toLocaleString()}</strong></td>
                </tr>
                ` : ''}
                <tr class="total-row">
                    <td colspan="3"><strong>合計金額</strong></td>
                    <td><strong>¥${data.total.toLocaleString()}</strong></td>
                </tr>
            </tbody>
        </table>
        
        <div class="payment-info">
            <h3>💳 お支払い方法</h3>
            <p><strong>${data.paymentMethod}</strong></p>
            
            ${data.bankInfo ? `
            <div class="bank-details">
                <h4 class="important">🏦 お振込先情報</h4>
                <p><strong>銀行名:</strong> ${data.bankInfo.bank}</p>
                <p><strong>支店名:</strong> ${data.bankInfo.branch}</p>
                <p><strong>口座種類:</strong> ${data.bankInfo.accountType}</p>
                <p><strong>口座番号:</strong> ${data.bankInfo.accountNumber}</p>
                <p><strong>口座名義:</strong> ${data.bankInfo.accountName}</p>
                <p class="important"><strong>お振込期限:</strong> ${data.bankInfo.transferDeadline}</p>
                <p style="font-size: 14px; color: #666;">※お振込手数料はお客様負担となります。<br>
                ※期限内にお振込みが確認できない場合、ご注文をキャンセルさせていただく場合があります。</p>
            </div>
            ` : ''}
            
            ${data.codFee ? `
            <div class="bank-details">
                <h4>🚚 代金引換について</h4>
                <p>商品お受け取り時に、配達員へ現金でお支払いください。</p>
                <p><strong>お支払い金額:</strong> ¥${data.total.toLocaleString()}（代引き手数料込）</p>
                <p style="font-size: 14px; color: #666;">※お釣りのないよう、ご準備をお願いいたします。</p>
            </div>
            ` : ''}
        </div>
        
        <div class="order-info">
            <h3>🚚 お届け先</h3>
            <p>${data.shippingAddress.lastName} ${data.shippingAddress.firstName} 様</p>
            <p>〒${data.shippingAddress.postalCode}</p>
            <p>${data.shippingAddress.state}${data.shippingAddress.city}</p>
            <p>${data.shippingAddress.address1}</p>
            ${data.shippingAddress.address2 ? `<p>${data.shippingAddress.address2}</p>` : ''}
        </div>
        
        <div class="payment-info">
            <h3>📦 発送について</h3>
            <p>ご入金確認後（代金引換の場合はご注文確定後）、2-3営業日以内に発送いたします。</p>
            <p>発送完了後、追跡番号をメールでお知らせいたします。</p>
        </div>
        
        <div class="footer">
            <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
            <hr style="margin: 20px 0;">
            <p><strong>🌿 MOSS COUNTRY</strong><br>
            北海道札幌市中央区<br>
            TEL: 011-123-4567<br>
            Email: info@mosscountry.com<br>
            営業時間: 10:00-18:00（定休日：月曜日）</p>
        </div>
    </div>
</body>
</html>`;

    // テキスト版も生成
    const text = `
【MOSS COUNTRY】ご注文ありがとうございます

${data.customerName} 様

この度は、MOSS COUNTRYでのご注文をいただき、誠にありがとうございます。

■ ご注文情報
注文番号: ${data.orderNumber}
注文日時: ${new Date().toLocaleDateString('ja-JP')}

■ ご注文商品
${data.items.map(item => `${item.name} × ${item.quantity} = ¥${item.total.toLocaleString()}`).join('\n')}

商品小計: ¥${data.subtotal.toLocaleString()}
配送料: ${data.shippingCost === 0 ? '無料' : `¥${data.shippingCost.toLocaleString()}`}
消費税: ¥${data.tax.toLocaleString()}
${data.codFee ? `代金引換手数料: ¥${data.codFee.toLocaleString()}\n` : ''}
合計金額: ¥${data.total.toLocaleString()}

■ お支払い方法
${data.paymentMethod}

${data.bankInfo ? `
■ お振込先情報
${data.bankInfo.bank} ${data.bankInfo.branch} ${data.bankInfo.accountType}
口座番号: ${data.bankInfo.accountNumber}
口座名義: ${data.bankInfo.accountName}
お振込期限: ${data.bankInfo.transferDeadline}
` : ''}

■ お届け先
${data.shippingAddress.lastName} ${data.shippingAddress.firstName} 様
〒${data.shippingAddress.postalCode}
${data.shippingAddress.state}${data.shippingAddress.city}
${data.shippingAddress.address1}
${data.shippingAddress.address2 || ''}

────────────────────
🌿 MOSS COUNTRY
北海道札幌市中央区
TEL: 011-123-4567
Email: info@mosscountry.com
営業時間: 10:00-18:00（定休日：月曜日）
────────────────────
`;

    return this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      text
    });
  }

  // Square決済用の注文確認メール
  static async sendSquareOrderConfirmationEmail(orderData: {
    orderNumber: string;
    customer: { email: string; firstName: string; lastName: string };
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    paymentId?: string;
    receiptUrl?: string;
  }): Promise<boolean> {
    const subject = `【MOSS COUNTRY】ご注文ありがとうございます - 注文番号: ${orderData.orderNumber}`;
    
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ご注文確認 - MOSS COUNTRY</title>
    <style>
        body { font-family: 'Hiragino Sans', 'Yu Gothic', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #2d5016; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2d5016; margin-bottom: 10px; }
        .order-info { background: #f8f9f0; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .success-badge { background: #d4edda; color: #155724; padding: 15px; border-radius: 6px; border-left: 4px solid #28a745; margin: 20px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .items-table th { background-color: #f0f0f0; font-weight: bold; }
        .total-row { font-weight: bold; background-color: #f8f9f0; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🌿 MOSS COUNTRY</div>
            <p>北海道の苔テラリウム専門店</p>
        </div>
        
        <div class="success-badge">
            <h3>✅ お支払いが完了しました</h3>
            <p>この度は、MOSS COUNTRYでのご注文をいただき、誠にありがとうございます。</p>
        </div>
        
        <h2>${orderData.customer.lastName} ${orderData.customer.firstName} 様</h2>
        
        <div class="order-info">
            <h3>📋 ご注文情報</h3>
            <p><strong>注文番号:</strong> ${orderData.orderNumber}</p>
            <p><strong>注文日時:</strong> ${new Date().toLocaleDateString('ja-JP', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            ${orderData.paymentId ? `<p><strong>決済ID:</strong> ${orderData.paymentId}</p>` : ''}
        </div>
        
        <h3>🛍️ ご注文商品</h3>
        <table class="items-table">
            <thead>
                <tr>
                    <th>商品名</th>
                    <th>数量</th>
                    <th>価格</th>
                </tr>
            </thead>
            <tbody>
                ${orderData.items.map(item => `
                    <tr>
                        <td>${item.product?.name || 'Unknown Product'}</td>
                        <td>${item.quantity}</td>
                        <td>¥${(item.price || 0).toLocaleString()}</td>
                    </tr>
                `).join('')}
                <tr class="total-row">
                    <td colspan="2"><strong>合計金額</strong></td>
                    <td><strong>¥${orderData.total.toLocaleString()}</strong></td>
                </tr>
            </tbody>
        </table>
        
        <div class="order-info">
            <h3>💳 お支払い</h3>
            <p><strong>お支払い方法:</strong> クレジットカード決済（Square）</p>
            <p><strong>お支払い状況:</strong> <span style="color: #28a745; font-weight: bold;">完了</span></p>
            ${orderData.receiptUrl ? `<p><a href="${orderData.receiptUrl}" style="color: #2d5016;">レシートを確認する</a></p>` : ''}
        </div>
        
        <div class="order-info">
            <h3>📦 発送について</h3>
            <p>お支払い確認後、2-3営業日以内に発送いたします。</p>
            <p>発送完了後、追跡番号をメールでお知らせいたします。</p>
            <p>商品の準備が整うまで今しばらくお待ちください。</p>
        </div>
        
        <div class="footer">
            <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
            <hr style="margin: 20px 0;">
            <p><strong>🌿 MOSS COUNTRY</strong><br>
            北海道札幌市中央区<br>
            TEL: 011-123-4567<br>
            Email: info@mosscountry.com<br>
            営業時間: 10:00-18:00（定休日：月曜日）</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
【MOSS COUNTRY】ご注文ありがとうございます

${orderData.customer.lastName} ${orderData.customer.firstName} 様

この度は、MOSS COUNTRYでのご注文をいただき、誠にありがとうございます。
お支払いが完了いたしました。

■ ご注文情報
注文番号: ${orderData.orderNumber}
注文日時: ${new Date().toLocaleDateString('ja-JP')}
${orderData.paymentId ? `決済ID: ${orderData.paymentId}` : ''}

■ ご注文商品
${orderData.items.map(item => `${item.product?.name || 'Unknown Product'} × ${item.quantity} = ¥${(item.price || 0).toLocaleString()}`).join('\n')}

合計金額: ¥${orderData.total.toLocaleString()}

■ お支払い
お支払い方法: クレジットカード決済（Square）
お支払い状況: 完了

■ 発送について
お支払い確認後、2-3営業日以内に発送いたします。
発送完了後、追跡番号をメールでお知らせいたします。

────────────────────
🌿 MOSS COUNTRY
北海道札幌市中央区
TEL: 011-123-4567
Email: info@mosscountry.com
営業時間: 10:00-18:00（定休日：月曜日）
────────────────────
`;

    return this.sendEmail({
      to: orderData.customer.email,
      subject,
      html,
      text
    });
  }

  static async sendAdminNotificationEmail(data: OrderEmailData): Promise<boolean> {
    const subject = `【新規注文】${data.orderNumber} - ${data.customerName}様`;
    
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>新規注文通知 - MOSS COUNTRY</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; }
        .header { background: #2d5016; color: white; padding: 15px; margin: -20px -20px 20px -20px; }
        .order-info { background: #f9f9f9; padding: 15px; margin: 15px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f0f0f0; }
        .urgent { color: #d73527; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🌿 MOSS COUNTRY - 新規注文通知</h2>
        </div>
        
        <div class="order-info">
            <h3>注文詳細</h3>
            <p><strong>注文番号:</strong> ${data.orderNumber}</p>
            <p><strong>顧客名:</strong> ${data.customerName}</p>
            <p><strong>メールアドレス:</strong> ${data.customerEmail}</p>
            <p><strong>注文日時:</strong> ${new Date().toLocaleString('ja-JP')}</p>
            <p><strong>支払い方法:</strong> ${data.paymentMethod}</p>
            <p><strong>合計金額:</strong> ¥${data.total.toLocaleString()}</p>
        </div>
        
        <h3>注文商品</h3>
        <table>
            <tr><th>商品名</th><th>数量</th><th>単価</th><th>小計</th></tr>
            ${data.items.map(item => `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>¥${item.price.toLocaleString()}</td>
                    <td>¥${item.total.toLocaleString()}</td>
                </tr>
            `).join('')}
        </table>
        
        <div class="order-info">
            <h3>お届け先</h3>
            <p>${data.shippingAddress.lastName} ${data.shippingAddress.firstName} 様</p>
            <p>〒${data.shippingAddress.postalCode}</p>
            <p>${data.shippingAddress.state}${data.shippingAddress.city}</p>
            <p>${data.shippingAddress.address1}</p>
            ${data.shippingAddress.address2 ? `<p>${data.shippingAddress.address2}</p>` : ''}
        </div>
        
        ${data.bankInfo ? `
        <p class="urgent">※銀行振込注文 - 入金確認が必要です</p>
        ` : ''}
        
        <p>管理画面で詳細を確認し、必要な対応を行ってください。</p>
    </div>
</body>
</html>`;

    return this.sendEmail({
      to: 'admin@mosscountry.com', // 管理者メールアドレス
      subject,
      html
    });
  }
}

// Convenience export function for webhook usage
export async function sendOrderConfirmationEmail(orderData: {
  orderNumber: string;
  customer: { email: string; firstName: string; lastName: string };
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  paymentId?: string;
  receiptUrl?: string;
}): Promise<boolean> {
  return EmailService.sendSquareOrderConfirmationEmail(orderData);
}