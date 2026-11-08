import { CofounderDataClient } from './client';

export * from './types';
export * from './schemas';
export * from './idempotency';
export * from './client';

let globalClient: CofounderDataClient | null = null;

export function getCofounderDataClient(): CofounderDataClient {
  if (!globalClient) {
    globalClient = new CofounderDataClient({
      baseUrl:
        process.env.COFOUNDER_DATA_API_URL || 'https://cofounder-data.ruhvi.in',
      clientId: process.env.COFOUNDER_DATA_API_CLIENT_ID || '',
      clientSecret: process.env.COFOUNDER_DATA_API_CLIENT_SECRET || '',
    });
  }
  return globalClient;
}
