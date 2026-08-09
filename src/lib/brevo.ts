const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const resolveBrevoApiKey = (rawKey?: string): string => {
  if (!rawKey) return '';
  const trimmed = rawKey.trim();
  if (trimmed.startsWith('eyJ')) {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      if (parsed.api_key) return parsed.api_key;
    } catch {
      // ignore
    }
  }
  return trimmed;
};

const getHeaders = async (useMcpKey = false) => {
  const rawKey = useMcpKey
    ? process.env.BREVO_MCP_API_KEY || process.env.BREVO_API_KEY
    : process.env.BREVO_API_KEY;

  const apiKey = resolveBrevoApiKey(rawKey);
  if (!apiKey) {
    console.warn('BREVO_API_KEY is not set. Emails will not be sent.');
  }
  return {
    'Content-Type': 'application/json',
    'api-key': apiKey || '',
  };
};

const getSender = async () => {
  return {
    name: process.env.BREVO_SENDER_NAME || 'Ruhvi',
    email: process.env.BREVO_SENDER_EMAIL || 'marketing@ruhvi.in',
  };
};

export async function sendEmail({
  to,
  subject,
  htmlContent,
  useMcpKey = false,
}: {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  useMcpKey?: boolean;
}) {
  try {
    const headers = await getHeaders(useMcpKey);
    const sender = await getSender();

    if (!headers['api-key']) return;

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sender,
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
export async function sendWinBackEmail(
  email: string,
  name: string,
  discountCode: string
) {
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
export async function sendCelebrationEmail(
  email: string,
  name: string,
  type: 'birthday' | 'anniversary',
  discountCode: string
) {
  const subject =
    type === 'birthday'
      ? `Happy Birthday from Ruhvi! 🎂`
      : `Happy Anniversary from Ruhvi! 🎉`;
  const title =
    type === 'birthday'
      ? `Wishing you a sparkling Birthday!`
      : `Wishing you a beautiful Anniversary!`;
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

// --- AI Tool Integration Functions ---

export async function sendTransactionalEmail(
  to: string,
  subject: string,
  htmlContent: string,
  senderName?: string
) {
  // Use MCP key (useMcpKey = true)
  return sendEmail({
    to: [{ email: to, name: senderName }],
    subject,
    htmlContent,
    useMcpKey: true,
  });
}

export async function createOrUpdateContact(
  email: string,
  attributes?: Record<string, any>,
  listIds?: number[]
) {
  try {
    const headers = await getHeaders(true); // useMcpKey = true
    if (!headers['api-key']) return;

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        attributes,
        listIds,
        updateEnabled: true, // Update if exists
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to create/update contact: ${errorData}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error('Error creating contact:', error);
    throw new Error(`Brevo API Error: ${error.message}`);
  }
}

export async function getCampaignStats(startDate?: string, endDate?: string) {
  try {
    const headers = await getHeaders(true); // useMcpKey = true
    if (!headers['api-key']) return;

    let url = 'https://api.brevo.com/v3/emailCampaigns?status=sent';
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }
    const data = await response.json();
    return { campaigns: data.campaigns || [] };
  } catch (error: any) {
    console.error('Error fetching campaign stats:', error);
    throw new Error(`Brevo API Error: ${error.message}`);
  }
}
