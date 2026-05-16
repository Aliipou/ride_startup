"""OpenTelemetry instrumentation — tracing + metrics (2025 golden standard).

Instruments FastAPI, SQLAlchemy, and Redis automatically.
Exports to OTLP collector (Grafana Tempo, Jaeger, Datadog, etc.)
"""

from ..config import settings


def setup_telemetry(app) -> None:  # type: ignore[no-untyped-def]
    """Initialize OpenTelemetry tracing and instrument the FastAPI app.

    No-ops gracefully if OTEL_EXPORTER_OTLP_ENDPOINT is not configured.
    """
    if not settings.OTEL_EXPORTER_OTLP_ENDPOINT:
        return

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.sdk.resources import Resource, SERVICE_NAME
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        from opentelemetry.instrumentation.redis import RedisInstrumentor

        resource = Resource.create({SERVICE_NAME: "ride-and-chill-api"})
        provider = TracerProvider(resource=resource)
        exporter = OTLPSpanExporter(endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT)
        provider.add_span_processor(BatchSpanProcessor(exporter))
        trace.set_tracer_provider(provider)

        FastAPIInstrumentor.instrument_app(app)
        SQLAlchemyInstrumentor().instrument()
        RedisInstrumentor().instrument()

    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"OpenTelemetry setup failed: {e}")
