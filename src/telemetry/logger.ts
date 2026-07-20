import {
  logs,
  SeverityNumber,
  type LogAttributes,
} from "@opentelemetry/api-logs";

const telemetryLogger = logs.getLogger("traceroom-debate-simulation", "0.1.0");

export function logInfo(body: string, attributes: LogAttributes = {}): void {
  telemetryLogger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: "INFO",
    body,
    attributes,
  });
}
