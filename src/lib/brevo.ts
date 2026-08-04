const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const getHeaders = () => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('BREVO_API_KEY is not set. Emails will not be sent.');
  }
  return {
    'Content-Type': 'application/json',
    'api-key': apiKey || '',
  };
};

const getSender = () => {
  return {
    name: process.env.BREVO_SENDER_NAME || 'Ruhvi',
    email: process.env.BREVO_SENDER_EMAIL || 'noreply@ruhvi.in',
  };
};

export async function sendEmail({ to, subject, htmlContent }: { to: { email: string; name?: string }[], subject: string, htmlContent: string }) {
  if (!process.env.BREVO_API_KEY) return;
  
  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        sender: getSender(),
        to,
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Brevo API Error:', errorData);
      throw new Error(`Failed to send email: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending Brevo email:', error);
  }
}

// 1. Welcome Email
export async function sendWelcomeEmail(email: string, name: string = 'Beautiful') {
  const subject = 'Welcome to Ruhvi! ✨';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #121110;">
      <h1 style="color: #C29831; text-align: center;">Welcome to Ruhvi!</h1>
      <p>Hello ${name},</p>
      <p>We are thrilled to have you join our exclusive community. Discover our timeless gold and diamond jewelry collections curated just for you.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://ruhvi.in" style="background-color: #1C1B1A; color: #FAF6ED; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Explore Collections</a>
      </div>
      <p>Thank you for choosing Ruhvi.</p>
    </div>
  `;
  return sendEmail({ to: [{ email, name }], subject, htmlContent });
}

// 2. Order Confirmation
export async function sendOrderConfirmationEmail(email: string, name: string, orderId: string, amount: number) {
  const subject = `Order Confirmed! (#${orderId.substring(0, 8).toUpperCase()})`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #121110;">
      <h1 style="color: #C29831; text-align: center;">Thank You for Your Order!</h1>
      <p>Hello ${name},</p>
      <p>Your order has been successfully placed. We are preparing it for shipment.</p>
      <div style="background-color: #FAF7ED; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Total Amount:</strong> ₹${amount.toLocaleString('en-IN')}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://ruhvi.in/orders" style="background-color: #1C1B1A; color: #FAF6ED; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Track Order</a>
      </div>
    </div>
  `;
  return sendEmail({ to: [{ email, name }], subject, htmlContent });
}

// 3. Shipping Updates
export async function sendShippingUpdateEmail(email: string, name: string, orderId: string, trackingLink?: string) {
  const subject = `Your Order has Shipped! 🚚`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #121110;">
      <h1 style="color: #C29831; text-align: center;">Great News!</h1>
      <p>Hello ${name},</p>
      <p>Your Ruhvi order (#${orderId.substring(0, 8).toUpperCase()}) is on its way!</p>
      ${trackingLink ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${trackingLink}" style="background-color: #1C1B1A; color: #FAF6ED; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Track Shipment</a>
      </div>` : ''}
      <p>We hope you love your new jewelry.</p>
    </div>
  `;
  return sendEmail({ to: [{ email, name }], subject, htmlContent });
}

// 4. Abandoned Cart
export async function sendAbandonedCartEmail(email: string, name: string) {
  const subject = `You left something beautiful behind... ✨`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #121110;">
      <h1 style="color: #C29831; text-align: center;">Still thinking about it?</h1>
      <p>Hello ${name},</p>
      <p>We noticed you left some exquisite pieces in your cart. They are still waiting for you, but they might not be available for long!</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://ruhvi.in/cart" style="background-color: #1C1B1A; color: #FAF6ED; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Complete Checkout</a>
      </div>
    </div>
  `;
  return sendEmail({ to: [{ email, name }], subject, htmlContent });
}

// 5. Win-back Campaign
export async function sendWinBackEmail(email: string, name: string, discountCode: string) {
  const subject = `We miss you! Here's a special gift 🎁`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #121110;">
      <h1 style="color: #C29831; text-align: center;">It's been a while!</h1>
      <p>Hello ${name},</p>
      <p>We haven't seen you in a while! To welcome you back, we've prepared a special discount just for you.</p>
      <div style="background-color: #FAF7ED; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p>Use code at checkout:</p>
        <h2 style="letter-spacing: 2px;">${discountCode}</h2>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://ruhvi.in" style="background-color: #1C1B1A; color: #FAF6ED; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Shop Now</a>
      </div>
    </div>
  `;
  return sendEmail({ to: [{ email, name }], subject, htmlContent });
}

// 6. Birthday / Anniversary
export async function sendCelebrationEmail(email: string, name: string, type: 'birthday' | 'anniversary', discountCode: string) {
  const subject = type === 'birthday' ? `Happy Birthday from Ruhvi! 🎂` : `Happy Anniversary from Ruhvi! 🎉`;
  const title = type === 'birthday' ? `Wishing you a sparkling Birthday!` : `Wishing you a beautiful Anniversary!`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #121110;">
      <h1 style="color: #C29831; text-align: center;">${title}</h1>
      <p>Hello ${name},</p>
      <p>Celebrate your special day with something truly timeless. Enjoy this exclusive gift from us!</p>
      <div style="background-color: #FAF7ED; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p>Use code at checkout:</p>
        <h2 style="letter-spacing: 2px;">${discountCode}</h2>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://ruhvi.in" style="background-color: #1C1B1A; color: #FAF6ED; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Treat Yourself</a>
      </div>
    </div>
  `;
  return sendEmail({ to: [{ email, name }], subject, htmlContent });
}
