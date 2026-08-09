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
