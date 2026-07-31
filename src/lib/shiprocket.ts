/**
 * Shiprocket API Client Utility
 * Handles token generation, order creation, and AWB assignment.
 */

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * Authenticate with Shiprocket and retrieve a JWT token.
 * Tokens are cached in memory for 9 days (Shiprocket tokens expire in 10 days).
 */
export async function getShiprocketToken(): Promise<string> {
  // 1. Direct API Key / Token override if provided
  const directToken = process.env.SHIPROCKET_API_KEY || process.env.SHIPROCKET_TOKEN;
  if (directToken) {
    return directToken;
  }

  // 2. Email + Password login fallback
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    console.warn('Shiprocket credentials (API Key or Email/Password) missing. Using mock token.');
    return 'mock_token_123';
  }

  // Check if we have a valid cached token
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(`Shiprocket auth failed: ${response.statusText}`);
    }

    const data = await response.json();
    cachedToken = data.token;
    // Cache for 9 days (milliseconds)
    tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000;
    
    return data.token;
  } catch (error) {
    console.error('Error getting Shiprocket token:', error);
    throw error;
  }
}

/**
 * Create a Custom Order in Shiprocket
 */
export async function createCustomOrder(orderData: any) {
  const token = await getShiprocketToken();
  
  // Return a mock response if we are using a mock token
  if (token === 'mock_token_123') {
    console.log('Mocking Shiprocket create order with data:', orderData);
    return {
      order_id: `SR-MOCK-${Date.now()}`,
      shipment_id: `SHP-MOCK-${Date.now()}`,
      status: 'NEW',
      status_code: 1,
      onboarding_completed_now: 0,
      awb_code: '',
      courier_company_id: '',
      courier_name: '',
    };
  }

  try {
    const response = await fetch(`${BASE_URL}/orders/create/adhoc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create Shiprocket order');
    }
    
    return data;
  } catch (error) {
    console.error('Shiprocket Create Order Error:', error);
    throw error;
  }
}

/**
 * Generate AWB for a Shipment (Assign Courier)
 */
export async function generateAWB(shipmentId: string, courierId?: string) {
  const token = await getShiprocketToken();

  if (token === 'mock_token_123') {
    return {
      awb_assign_status: 1,
      response: {
        data: {
          awb_code: `AWB-MOCK-${Date.now()}`,
          courier_company_id: courierId || '1',
          courier_name: 'Mock Courier Delivery',
        }
      }
    };
  }

  try {
    const response = await fetch(`${BASE_URL}/courier/assign/awb`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        shipment_id: shipmentId,
        courier_id: courierId, // Optional, Shiprocket will auto-assign if omitted
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to generate AWB');
    }

    return data;
  } catch (error) {
    console.error('Shiprocket Generate AWB Error:', error);
    throw error;
  }
}
