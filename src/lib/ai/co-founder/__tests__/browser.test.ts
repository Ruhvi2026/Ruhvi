jest.mock('server-only', () => ({}));

import { executeCoFounderTool } from '../tool-bridge';
import { CO_FOUNDER_TOOL_DECLARATIONS } from '../brain';

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

describe('AI Co-Founder Playwright Web Browsing Tool', () => {
  it('has browse_website registered in CO_FOUNDER_TOOL_DECLARATIONS', () => {
    const tool = CO_FOUNDER_TOOL_DECLARATIONS.find(
      (t) => t.name === 'browse_website'
    );
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('Playwright');
    expect(tool?.parameters.properties.url).toBeDefined();
  });

  it('rejects browse_website when URL is missing', async () => {
    const res = await executeCoFounderTool('browse_website', {}, [
      'analytics:read',
    ]);
    expect(res.success).toBe(false);
    expect(res.error).toContain('url is required');
  });

  it('blocks browse_website when scopes lack permissions', async () => {
    const res = await executeCoFounderTool(
      'browse_website',
      { url: 'https://example.com' },
      ['orders:read']
    );
    expect(res.success).toBe(false);
    expect(res.error).toContain('Forbidden');
  });
});
