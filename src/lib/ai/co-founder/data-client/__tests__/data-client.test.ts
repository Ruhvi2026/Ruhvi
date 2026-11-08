import { CofounderDataClient } from '../client';
import { generateIdempotencyKey } from '../idempotency';
import { explicitMemorySchema, candidateLessonSchema } from '../schemas';

describe('CofounderDataClient & Schemas', () => {
  describe('Idempotency Key Generator', () => {
    it('generates consistent hash for same payload', () => {
      const payload = { content: 'test instruction', scope: 'global' };
      const key1 = generateIdempotencyKey('memory', payload);
      const key2 = generateIdempotencyKey('memory', payload);
      expect(key1).toBe(key2);
      expect(key1).toMatch(/^memory_[a-f0-9]{24}$/);
    });

    it('generates unique keys for different payloads', () => {
      const key1 = generateIdempotencyKey('memory', { a: 1 });
      const key2 = generateIdempotencyKey('memory', { a: 2 });
      expect(key1).not.toBe(key2);
    });
  });

  describe('Validation Schemas', () => {
    it('validates explicit memory schema', () => {
      const valid = explicitMemorySchema.safeParse({
        content: 'Remember to always check inventory first.',
        memory_type: 'user_instruction',
      });
      expect(valid.success).toBe(true);

      const invalid = explicitMemorySchema.safeParse({
        content: '',
      });
      expect(invalid.success).toBe(false);
    });

    it('validates candidate lesson schema', () => {
      const valid = candidateLessonSchema.safeParse({
        lesson: 'Supplier X has longer lead times on weekends.',
        confidence: 0.8,
      });
      expect(valid.success).toBe(true);
    });
  });

  describe('CofounderDataClient Network Operations', () => {
    let originalFetch: typeof global.fetch;

    beforeAll(() => {
      originalFetch = global.fetch;
    });

    afterAll(() => {
      global.fetch = originalFetch;
    });

    it('sets correct headers and sends payload', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'test-id', status: 'healthy' },
        }),
      });
      global.fetch = mockFetch as any;

      const client = new CofounderDataClient({
        baseUrl: 'https://test-api.example.com',
        clientId: 'test-client-id.access',
        clientSecret: 'cfast_testsecret',
      });

      const res = await client.saveExplicitMemory({
        content: 'Test content',
        memory_type: 'user_instruction',
      });

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://test-api.example.com/v1/memory/explicit');
      expect(init.headers['CF-Access-Client-Id']).toBe('test-client-id.access');
      expect(init.headers['CF-Access-Client-Secret']).toBe('cfast_testsecret');
      expect(init.headers['Idempotency-Key']).toBeDefined();
    });

    it('gracefully degrades on fetch failure without throwing unhandled exceptions', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network down'));

      const client = new CofounderDataClient({
        baseUrl: 'https://test-api.example.com',
      });

      const res = await client.health();
      expect(res.success).toBe(false);
      expect(res.error).toContain('Network down');
    });

    it('invokes worker snapshot sync and telemetry methods', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { synced_count: 1 } }),
      });
      global.fetch = mockFetch as any;

      const client = new CofounderDataClient({
        baseUrl: 'https://test-api.example.com',
      });

      const res = await client.syncWorkerSnapshots([
        {
          worker_id: 'test_worker',
          capabilities: ['test'],
          allowed_tools: ['tool'],
        },
      ]);
      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/v1/workers/snapshot/sync',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('uploads and downloads artifacts directly with correct headers', async () => {
      const mockUploadFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { r2_key: 'dev/test.json', size_bytes: 14 },
        }),
      });
      global.fetch = mockUploadFetch as any;

      const client = new CofounderDataClient({
        baseUrl: 'https://test-api.example.com',
        clientId: 'id123',
        clientSecret: 'secret456',
      });

      const uploadRes = await client.uploadArtifact(
        'test.json',
        '{"test": true}',
        {
          contentType: 'application/json',
        }
      );
      expect(uploadRes.success).toBe(true);
      expect(mockUploadFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/artifacts/upload?key=test.json'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'CF-Access-Client-Id': 'id123',
            'CF-Access-Client-Secret': 'secret456',
            'Content-Type': 'application/json',
          }),
        })
      );

      // Download
      const mockDownloadFetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () =>
          new TextEncoder().encode('{"test": true}').buffer,
        headers: new Headers({ 'content-type': 'application/json' }),
      });
      global.fetch = mockDownloadFetch as any;

      const downloadRes = await client.downloadArtifact('test.json');
      expect(downloadRes.success).toBe(true);
      expect(downloadRes.data).toBeDefined();
      expect(downloadRes.contentType).toBe('application/json');
    });
  });
});
