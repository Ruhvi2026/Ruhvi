export async function registerOTel() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const { NodeSDK } = await import('@opentelemetry/sdk-node');
  const { OTLPTraceExporter } =
    await import('@opentelemetry/exporter-trace-otlp-grpc');
  const { resources } = await import('@opentelemetry/sdk-node');
  const { SemanticResourceAttributes } =
    await import('@opentelemetry/semantic-conventions');
  const { getNodeAutoInstrumentations } =
    await import('@opentelemetry/auto-instrumentations-node');

  const resource = new resources.Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'ruhvi-ecommerce',
    [SemanticResourceAttributes.SERVICE_VERSION]:
      process.env.npm_package_version ?? '0.1.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
      process.env.NODE_ENV ?? 'development',
  });

  const exporter = new OTLPTraceExporter({
    url: 'http://localhost:4317',
  } as any);

  const sdk = new NodeSDK({
    resource,
    traceExporter: exporter as any,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-dns': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-winston': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-pino': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-bunyan': {
          enabled: false,
        },
      }),
    ],
  });

  sdk.start();

  console.log(
    'OpenTelemetry initialized with OTLP gRPC exporter to Jaeger at http://localhost:4317'
  );
}
