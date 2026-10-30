import {
  getOtelEndpoint,
  parseOtelHeaders,
  registerOTel,
} from '../instrumentation-otel';

describe('OpenTelemetry Instrumentation Configuration (Finding B1)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_EXPORTER_OTLP_HEADERS;
    delete process.env.ENABLE_LOCAL_OTEL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getOtelEndpoint()', () => {
    it('returns null by default when no endpoint or local flag is configured', () => {
      (process.env as any).NODE_ENV = 'production';
      expect(getOtelEndpoint()).toBeNull();
    });

    it('returns null in production even if ENABLE_LOCAL_OTEL is set', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.ENABLE_LOCAL_OTEL = 'true';
      expect(getOtelEndpoint()).toBeNull();
    });

    it('returns localhost endpoint only in development with explicit flag', () => {
      (process.env as any).NODE_ENV = 'development';
      process.env.ENABLE_LOCAL_OTEL = 'true';
      expect(getOtelEndpoint()).toBe('http://localhost:4318/v1/traces');
    });

    it('formats custom remote endpoint and appends /v1/traces if omitted', () => {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT =
        'https://otel.collector.ruhvi.in';
      expect(getOtelEndpoint()).toBe(
        'https://otel.collector.ruhvi.in/v1/traces'
      );
    });

    it('preserves endpoint if /v1/traces is already present', () => {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT =
        'https://otel.collector.ruhvi.in/v1/traces';
      expect(getOtelEndpoint()).toBe(
        'https://otel.collector.ruhvi.in/v1/traces'
      );
    });
  });

  describe('parseOtelHeaders()', () => {
    it('returns undefined for empty input', () => {
      expect(parseOtelHeaders('')).toBeUndefined();
      expect(parseOtelHeaders(undefined)).toBeUndefined();
    });

    it('parses comma-separated key=value headers correctly', () => {
      const headers = parseOtelHeaders(
        'x-honeycomb-team=secret_key,dataset=production'
      );
      expect(headers).toEqual({
        'x-honeycomb-team': 'secret_key',
        dataset: 'production',
      });
    });
  });

  describe('registerOTel()', () => {
    it('gracefully skips execution in non-nodejs runtimes', async () => {
      process.env.NEXT_RUNTIME = 'edge';
      await expect(registerOTel()).resolves.toBeUndefined();
    });

    it('gracefully skips execution when no endpoint is configured', async () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      (process.env as any).NODE_ENV = 'production';
      await expect(registerOTel()).resolves.toBeUndefined();
    });
  });
});
