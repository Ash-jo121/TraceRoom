import { SpanStatusCode, trace, type Span } from "@opentelemetry/api";

const tracer = trace.getTracer("traceroom-debate-simulation", "0.1.0");

export async function withSpan<T>(
  spanName: string,
  operation: (span: Span) => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(spanName, async (span) => {
    try {
      const result = await operation(span);

      span.setStatus({
        code: SpanStatusCode.OK,
      });

      return result;
    } catch (error) {
      const exception =
        error instanceof Error ? error : new Error(String(error));

      span.recordException(exception);

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: exception.message,
      });

      throw exception;
    } finally {
      span.end();
    }
  });
}
