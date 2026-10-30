export function getOtelEndpoint(): string | null {
  const explicit = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (explicit && explicit.trim().length > 0) {
    const trimmed = explicit.trim();
    return trimmed.endsWith('/v1/traces')
      ? trimmed
      : `${trimmed.replace(/\/$/, '')}/v1/traces`;
  }

  // Only enable local Jaeger exporter if explicitly enabled in local development
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.ENABLE_LOCAL_OTEL === 'true'
  ) {
    return 'http://localhost:4318/v1/traces';
  }

  return null;
}

export function parseOtelHeaders(
  raw?: string
): Record<string, string> | undefined {
  if (!raw || !raw.trim()) return undefined;
  const result: Record<string, string> = {};
  for (const part of raw.split(',')) {
    const [key, ...values] = part.split('=');
    if (key && values.length > 0) {
      result[key.trim()] = values.join('=').trim();
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export async function registerOTel() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const endpoint = getOtelEndpoint();
  if (!endpoint) {
    // Graceful skip: Serverless environments (like Vercel) without a dedicated OTLP collector
    // will rely on Sentry for distributed error and performance monitoring.
    return;
  }

  try {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { OTLPTraceExporter } =
      await import('@opentelemetry/exporter-trace-otlp-http');
    const { resourceFromAttributes } = await import('@opentelemetry/resources');
    const { SemanticResourceAttributes } =
      await import('@opentelemetry/semantic-conventions');
    const { HttpInstrumentation } =
      await import('@opentelemetry/instrumentation-http');
    const { ExpressInstrumentation } =
      await import('@opentelemetry/instrumentation-express');
    const { UndiciInstrumentation } =
      await import('@opentelemetry/instrumentation-undici');

    const resource = resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: 'ruhvi-ecommerce',
      [SemanticResourceAttributes.SERVICE_VERSION]:
        process.env.npm_package_version ?? '0.1.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
        process.env.NODE_ENV ?? 'development',
    });

    const headers = parseOtelHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);

    const exporter = new OTLPTraceExporter({
      url: endpoint,
      ...(headers ? { headers } : {}),
    } as any);

    const sdk = new NodeSDK({
      resource,
      traceExporter: exporter as any,
      instrumentations: [
        new HttpInstrumentation(),
        new ExpressInstrumentation(),
        new UndiciInstrumentation(),
      ],
    });

    sdk.start();

    console.log(
      `OpenTelemetry initialized with OTLP HTTP exporter to ${endpoint}`
    );
  } catch (err) {
    console.warn('[OpenTelemetry] Failed to initialize exporter:', err);
  }
}
