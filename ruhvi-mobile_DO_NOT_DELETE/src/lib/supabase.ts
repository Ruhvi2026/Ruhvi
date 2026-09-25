import { Platform } from 'react-native';
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://igrkrkxdantrolbldapj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlncmtya3hkYW50cm9sYmxkYXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MzQ0NDIsImV4cCI6MjEwMTAxMDQ0Mn0.Ks0ZUolRtSKa57knTkV0GP5wDKS3kWKLcAzAKxSD2ko';

let currentToken: string | null = null;
let cachedUserId: string | null = null;
let activeClient: SupabaseClient | null = null;

function parseJwtSub(token: string): string | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = base64.replace(/=+$/, '');
    let output = '';
    for (let bc = 0, bs = 0, buffer, i = 0;
      (buffer = str.charAt(i++));
      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
        bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
      buffer = chars.indexOf(buffer);
    }
    const parsed = JSON.parse(output);
    return parsed.sub || null;
  } catch (e) {
    return null;
  }
}

export const getSupabaseClient = (): SupabaseClient => {
  if (!activeClient) {
    activeClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          apikey: supabaseAnonKey,
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {})
        }
      },
      realtime: {
        params: {
          apikey: supabaseAnonKey,
          ...(currentToken ? { token: currentToken } : {})
        },
        heartbeatIntervalMs: 15000
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    if (currentToken && activeClient.realtime) {
      activeClient.realtime.setAuth(currentToken);
    }
  }
  return activeClient;
};

// Export a proxy so any import { supabase } always routes to the active client
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseClient();
    const val = (client as any)[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  }
});

export const setCurrentUserId = (id: string | null) => {
  cachedUserId = id;
};

export const getCurrentUserId = (): string | null => cachedUserId;
export const getCurrentToken = (): string | null => currentToken;

// Helper to inject our Custom JWT on successful login or startup
export const setSupabaseToken = (token: string | null, userId?: string | null) => {
  currentToken = token;
  cachedUserId = userId || (token ? parseJwtSub(token) : null);
  if (activeClient) {
    if (activeClient.realtime && token) {
      activeClient.realtime.setAuth(token);
    }
    activeClient = null; // force recreation with new token headers
  }
};
