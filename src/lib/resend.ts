import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
// @ts-ignore
import Handlebars from 'handlebars/dist/handlebars.js';

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not configured. Email will not be sent.');
    return null;
  }
  return new Resend(apiKey);
};

const senderEmail = process.env.RESEND_SENDER_EMAIL || 'notifications@ruhvi.in';
const senderName = 'Ruhvi';

export const getSender = () => `${senderName} <${senderEmail}>`;

// Helper to load and compile Handlebars templates
const compileTemplate = (fileName: string) => {
  try {
    const filePath = path.join(process.cwd(), 'Resend_Templates', fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`Template file not found: ${filePath}`);
      return () => '';
    }
    const source = fs.readFileSync(filePath, 'utf-8');
    return Handlebars.compile(source);
  } catch (error) {
    console.error(`Failed to load template ${fileName}:`, error);
    return () => '';
  }
};

// 1. Welcome Email
export async function sendWelcomeEmail(
  email: string,
  name: string = 'Beautiful'
) {
  const resend = getResendClient();
  if (!resend) return null;

  const template = compileTemplate(
    'Welcome to Ruhvi, {{customer.name}} ✨.html'
  );
  const htmlContent = template({ customer: { name } });

  try {
    const data = await resend.emails.send({
      from: getSender(),
      to: [email],
      subject: 'Welcome to Ruhvi! ✨',
      html: htmlContent,
    });
    return data;
  } catch (error) {
    console.error('Error sending Resend Welcome email:', error);
    return null;
  }
}

// 2. Order Confirmation
export async function sendOrderConfirmationEmail(email: string, data: any) {
  const resend = getResendClient();
  if (!resend) return null;

  const template = compileTemplate(
    'Your Ruhvi Order #{{order.number}} is Confirmed.html'
  );
  // Expected data structure for Handlebars:
  // { order: { number, date, items: [...] }, subtotal, discount, shipping, tax, total, shipping: { name, address, city, state, postal_code, country, phone }, payment: { method, status, transaction_id }, order_url, support_url }
  const htmlContent = template(data);

  try {
    const response = await resend.emails.send({
      from: getSender(),
      to: [email],
      subject: `Order Confirmed! (#${data.order?.number})`,
      html: htmlContent,
    });
    return response;
  } catch (error) {
    console.error('Error sending Resend Order Confirmation email:', error);
    return null;
  }
}

// 3. Shipping Updates (Shipped)
export async function sendOrderShippedEmail(email: string, data: any) {
  const resend = getResendClient();
  if (!resend) return null;

  const template = compileTemplate(
    'Your Ruhvi Order #{{order.number}} Has Shipped.html'
  );
  const htmlContent = template(data);

  try {
    const response = await resend.emails.send({
      from: getSender(),
      to: [email],
      subject: `Your Order #${data.order?.number} has Shipped! 🚚`,
      html: htmlContent,
    });
    return response;
  } catch (error) {
    console.error('Error sending Resend Order Shipped email:', error);
    return null;
  }
}

// 4. Shipping Updates (Out for Delivery)
export async function sendOrderOutForDeliveryEmail(email: string, data: any) {
  const resend = getResendClient();
  if (!resend) return null;

  const template = compileTemplate(
    'Your Ruhvi Order #{{order.number}} Is Out for Delivery.html'
  );
  const htmlContent = template(data);

  try {
    const response = await resend.emails.send({
      from: getSender(),
      to: [email],
      subject: `Your Order #${data.order?.number} is Out for Delivery! 📦`,
      html: htmlContent,
    });
    return response;
  } catch (error) {
    console.error('Error sending Resend Out for Delivery email:', error);
    return null;
  }
}

// 5. Shipping Updates (Delivered)
export async function sendOrderDeliveredEmail(email: string, data: any) {
  const resend = getResendClient();
  if (!resend) return null;

  const template = compileTemplate(
    'Your Ruhvi Order #{{order.number}} Has Been Delivered.html'
  );
  const htmlContent = template(data);

  try {
    const response = await resend.emails.send({
      from: getSender(),
      to: [email],
      subject: `Your Order #${data.order?.number} has been Delivered! ✨`,
      html: htmlContent,
    });
    return response;
  } catch (error) {
    console.error('Error sending Resend Delivered email:', error);
    return null;
  }
}

// 6. Order Cancelled
export async function sendOrderCancelledEmail(email: string, data: any) {
  const resend = getResendClient();
  if (!resend) return null;

  const template = compileTemplate(
    'Your Ruhvi Order #{{order.number}} Has Been Cancelled.html'
  );
  const htmlContent = template(data);

  try {
    const response = await resend.emails.send({
      from: getSender(),
      to: [email],
      subject: `Update regarding Order #${data.order?.number}`,
      html: htmlContent,
    });
    return response;
  } catch (error) {
    console.error('Error sending Resend Cancelled email:', error);
    return null;
  }
}

// 7. Payment Received
export async function sendPaymentReceivedEmail(email: string, data: any) {
  const resend = getResendClient();
  if (!resend) return null;

  const template = compileTemplate(
    'Payment Received — Ruhvi Order #{{order.number}}.html'
  );
  const htmlContent = template(data);

  try {
    const response = await resend.emails.send({
      from: getSender(),
      to: [email],
      subject: `Payment Received for Order #${data.order?.number}`,
      html: htmlContent,
    });
    return response;
  } catch (error) {
    console.error('Error sending Resend Payment Received email:', error);
    return null;
  }
}

// 8. Payment Failed
export async function sendPaymentFailedEmail(email: string, data: any) {
  const resend = getResendClient();
  if (!resend) return null;

  const template = compileTemplate(
    'Payment Failed — Action Needed for Ruhvi Order #{{order.number}}.html'
  );
  const htmlContent = template(data);

  try {
    const response = await resend.emails.send({
      from: getSender(),
      to: [email],
      subject: `Action Needed: Payment Failed for Order #${data.order?.number}`,
      html: htmlContent,
    });
    return response;
  } catch (error) {
    console.error('Error sending Resend Payment Failed email:', error);
    return null;
  }
}

// (Optional fallback for legacy compatibility or direct usage)
export async function sendShippingUpdateEmail(
  email: string,
  name: string,
  orderId: string,
  trackingLink?: string
) {
  // Legacy signature wrapper. Redirects to shipped for compatibility.
  return sendOrderShippedEmail(email, {
    order: { number: orderId },
    shipping: { name },
    tracking_url: trackingLink,
  });
}

// Support Ticket Email Notifications
export async function sendSupportTicketEmail(email: string, data: any) {
  const resend = getResendClient();
  if (!resend) return null;

  let subject = '';
  let htmlContent = '';
  const ticket = data.ticket || {};
  const customerName = data.customer?.name || 'Customer';

  const headerHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #121110; background: #FDFAF3; border-radius: 12px; overflow: hidden; border: 1px solid #E8DFC6;">
      <div style="background: #1C1B1A; padding: 24px 32px; text-align: center;">
        <h1 style="color: #C29831; font-size: 20px; margin: 0; letter-spacing: 2px;">RUHVI</h1>
        <p style="color: #A09080; font-size: 11px; margin: 4px 0 0; letter-spacing: 1px;">FINE JEWELLERY</p>
      </div>
      <div style="padding: 32px;">
  `;
  const footerHtml = `
        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #E8DFC6;">
          <p style="font-size: 12px; color: #8A7E6C; margin: 0;">If you have any questions, reply to this email or reach us on WhatsApp.</p>
          <p style="font-size: 12px; color: #8A7E6C; margin: 8px 0 0;">With care,<br/>The Ruhvi Support Team</p>
        </div>
      </div>
    </div>
  `;

  if (data.type === 'created') {
    subject = `Support Ticket ${ticket.number} — We're On It ✨`;
    htmlContent = `${headerHtml}
      <h2 style="color: #1C1B1A; font-size: 18px; margin: 0 0 8px;">Hello ${customerName},</h2>
      <p style="color: #4A4540; line-height: 1.6;">We've received your support request and our customer care team will be looking into it shortly.</p>
      
      <div style="background: #F5F0E6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #8A7E6C; font-size: 13px;">Ticket ID</td><td style="padding: 6px 0; color: #1C1B1A; font-size: 13px; font-weight: 600;">${ticket.number}</td></tr>
          <tr><td style="padding: 6px 0; color: #8A7E6C; font-size: 13px;">Issue</td><td style="padding: 6px 0; color: #1C1B1A; font-size: 13px;">${ticket.title}</td></tr>
          <tr><td style="padding: 6px 0; color: #8A7E6C; font-size: 13px;">Category</td><td style="padding: 6px 0; color: #1C1B1A; font-size: 13px;">${ticket.category}</td></tr>
          <tr><td style="padding: 6px 0; color: #8A7E6C; font-size: 13px;">Priority</td><td style="padding: 6px 0; color: #1C1B1A; font-size: 13px; text-transform: capitalize;">${ticket.priority}</td></tr>
          <tr><td style="padding: 6px 0; color: #8A7E6C; font-size: 13px;">Created</td><td style="padding: 6px 0; color: #1C1B1A; font-size: 13px;">${ticket.created_at}</td></tr>
        </table>
      </div>
      
      <p style="color: #4A4540; line-height: 1.6;">You can track your ticket status anytime by visiting your <a href="https://ruhvi.in/account/support" style="color: #C29831; text-decoration: none; font-weight: 600;">Support section</a>.</p>
    ${footerHtml}`;
  } else if (data.type === 'reply') {
    subject = `Update on Ticket ${ticket.number} — Ruhvi Support`;
    htmlContent = `${headerHtml}
      <h2 style="color: #1C1B1A; font-size: 18px; margin: 0 0 8px;">Hello ${customerName},</h2>
      <p style="color: #4A4540; line-height: 1.6;">Our support team has responded to your ticket <strong>${ticket.number}</strong>.</p>
      ${data.reply_preview ? `<div style="background: #F5F0E6; border-radius: 8px; padding: 20px; margin: 20px 0; color: #4A4540; font-size: 14px; line-height: 1.6;">${data.reply_preview}</div>` : ''}
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://ruhvi.in/account/support" style="display: inline-block; background: #1C1B1A; color: #FAF6ED; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">View Full Reply</a>
      </div>
    ${footerHtml}`;
  } else if (data.type === 'status_update') {
    subject = `Ticket ${ticket.number} — Status: ${ticket.new_status}`;
    htmlContent = `${headerHtml}
      <h2 style="color: #1C1B1A; font-size: 18px; margin: 0 0 8px;">Hello ${customerName},</h2>
      <p style="color: #4A4540; line-height: 1.6;">Your support ticket <strong>${ticket.number}</strong> has been updated.</p>
      <div style="background: #F5F0E6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="color: #8A7E6C; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px;">New Status</p>
        <p style="color: #1C1B1A; font-size: 18px; font-weight: 700; margin: 0;">${ticket.new_status}</p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://ruhvi.in/account/support" style="display: inline-block; background: #1C1B1A; color: #FAF6ED; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">View Ticket</a>
      </div>
    ${footerHtml}`;
  }

  if (!subject) return null;

  try {
    const response = await resend.emails.send({
      from: getSender(),
      to: [email],
      subject,
      html: htmlContent,
    });
    return response;
  } catch (error) {
    console.error('Error sending support ticket email:', error);
    return null;
  }
}

// Password Reset fallback (if you implement auth custom mailer later)
export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
  name: string = 'Customer'
) {
  const resend = getResendClient();
  if (!resend) return null;

  const subject = 'Reset Your Ruhvi Password 🔑';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #121110;">
      <h1 style="color: #C29831; text-align: center;">Password Reset Request</h1>
      <p>Hello ${name},</p>
      <p>We received a request to reset your password. Click the button below to set a new one:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #1C1B1A; color: #FAF6ED; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
      </div>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p>Thank you,<br/>The Ruhvi Team</p>
    </div>
  `;
  try {
    return await resend.emails.send({
      from: getSender(),
      to: [email],
      subject,
      html: htmlContent,
    });
  } catch (err) {
    console.error('Error sending Resend Password Reset email:', err);
    return null;
  }
}
