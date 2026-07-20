import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import {
  AggregationTemporality,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

const traceExporter = new OTLPTraceExporter({
  url: "http://localhost:4318/v1/traces",
});

const logExporter = new OTLPLogExporter({
  url: "http://localhost:4318/v1/logs",
});

const metricExporter = new OTLPMetricExporter({
  url: "http://localhost:4318/v1/metrics",
  temporalityPreference: AggregationTemporality.DELTA,
});

const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 5_000,
});

export const telemetrySdk = new NodeSDK({
  traceExporter,

  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "traceroom-debate-simulation",
  }),
  logRecordProcessors: [new BatchLogRecordProcessor(logExporter)],
  metricReaders: [metricReader],
});

telemetrySdk.start();
