import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { resources } from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export function registerOTel() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

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
      }),
    ],
  });

  sdk.start();

  console.log(
    'OpenTelemetry initialized with OTLP gRPC exporter to Jaeger at http://localhost:4317'
  );
}
