const getWhatsAppConfig = () => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return null;
  }
  return { token, phoneNumberId };
};

export const sendWhatsAppMessage = async (
  to: string,
  templateName: string,
  languageCode: string = 'en',
  components: any[] = []
) => {
  const config = getWhatsAppConfig();

  // Format phone number: remove any non-digit characters and leading zeros
  const formattedPhone = to.replace(/\D/g, '').replace(/^0+/, '');
  // Add 91 if not present for India, though in a real app you'd want proper country code parsing
  const finalPhone = formattedPhone.length === 10 ? `91${formattedPhone}` : formattedPhone;

  if (!config) {
    console.log(`[WhatsApp Sandbox] Message to ${finalPhone} using template '${templateName}'`);
    console.log(`[WhatsApp Sandbox] Components:`, JSON.stringify(components, null, 2));
    return { success: true, sandbox: true };
  }

  const url = `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: finalPhone,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components: components,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API Error:', data);
      throw new Error(`WhatsApp API Error: ${data.error?.message || 'Unknown error'}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    throw error;
  }
};

export const sendOrderConfirmation = async (
  orderNumber: string,
  customerPhone: string,
  customerName: string,
  totalAmount: number
) => {
  // Assuming a template named "order_confirmation" with 3 parameters: name, orderNumber, total
  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: customerName || 'Customer' },
        { type: 'text', text: orderNumber },
        { type: 'text', text: `₹${totalAmount.toLocaleString('en-IN')}` },
      ],
    },
  ];

  return sendWhatsAppMessage(customerPhone, 'order_confirmation', 'en', components);
};

export const sendShippingUpdate = async (
  orderNumber: string,
  customerPhone: string,
  customerName: string,
  trackingUrl: string
) => {
  // Assuming a template named "shipping_update" with 3 parameters: name, orderNumber, trackingUrl
  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: customerName || 'Customer' },
        { type: 'text', text: orderNumber },
        { type: 'text', text: trackingUrl },
      ],
    },
  ];

  return sendWhatsAppMessage(customerPhone, 'shipping_update', 'en', components);
};
