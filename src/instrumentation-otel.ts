export async function registerOTel() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

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

  const exporter = new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
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
    'OpenTelemetry initialized with OTLP HTTP exporter to Jaeger at http://localhost:4318'
  );
}
