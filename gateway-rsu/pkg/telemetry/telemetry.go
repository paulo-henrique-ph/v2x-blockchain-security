// Package telemetry provides OpenTelemetry instrumentation for the V2X Gateway RSU
package telemetry

import (
	"context"
	"fmt"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/exporters/prometheus"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
	"go.opentelemetry.io/otel/trace"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

var (
	// Tracer is the global tracer for the application
	Tracer trace.Tracer

	// Metrics
	MessageCounter      metric.Int64Counter
	LatencyHistogram    metric.Float64Histogram
	ActiveConnections   metric.Int64UpDownCounter
	ProcessingDuration  metric.Float64Histogram
	ErrorCounter        metric.Int64Counter
	ThroughputCounter   metric.Int64Counter
)

// Config holds OpenTelemetry configuration
type Config struct {
	ServiceName      string
	ServiceVersion   string
	Environment      string
	OTLPEndpoint     string
	EnableTracing    bool
	EnableMetrics    bool
	PrometheusPort   int
}

// DefaultConfig returns default OpenTelemetry configuration
func DefaultConfig() *Config {
	return &Config{
		ServiceName:    "v2x-gateway-rsu",
		ServiceVersion: "1.0.0",
		Environment:    "production",
		OTLPEndpoint:   "localhost:4317",
		EnableTracing:  true,
		EnableMetrics:  true,
		PrometheusPort: 9090,
	}
}

// Initialize sets up OpenTelemetry tracing and metrics
func Initialize(config *Config) (func(), error) {
	ctx := context.Background()

	// Create resource with service information
	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceName(config.ServiceName),
			semconv.ServiceVersion(config.ServiceVersion),
			semconv.DeploymentEnvironment(config.Environment),
			attribute.String("service.type", "gateway"),
			attribute.String("protocol", "rest+grpc"),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	var shutdownFuncs []func()

	// Setup Tracing
	if config.EnableTracing {
		tracerShutdown, err := setupTracing(ctx, res, config.OTLPEndpoint)
		if err != nil {
			return nil, fmt.Errorf("failed to setup tracing: %w", err)
		}
		shutdownFuncs = append(shutdownFuncs, tracerShutdown)

		// Initialize global tracer
		Tracer = otel.Tracer(config.ServiceName)
	}

	// Setup Metrics
	if config.EnableMetrics {
		metricsShutdown, err := setupMetrics(ctx, res)
		if err != nil {
			return nil, fmt.Errorf("failed to setup metrics: %w", err)
		}
		shutdownFuncs = append(shutdownFuncs, metricsShutdown)

		// Initialize metric instruments
		if err := initializeMetrics(); err != nil {
			return nil, fmt.Errorf("failed to initialize metrics: %w", err)
		}
	}

	// Set global propagator
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	// Return cleanup function
	cleanup := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		for _, shutdown := range shutdownFuncs {
			shutdown()
		}
	}

	return cleanup, nil
}

// setupTracing configures OpenTelemetry tracing
func setupTracing(ctx context.Context, res *resource.Resource, endpoint string) (func(), error) {
	// Create OTLP trace exporter
	conn, err := grpc.DialContext(ctx, endpoint,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create gRPC connection: %w", err)
	}

	traceExporter, err := otlptrace.New(ctx, otlptracegrpc.NewClient(
		otlptracegrpc.WithGRPCConn(conn),
	))
	if err != nil {
		return nil, fmt.Errorf("failed to create trace exporter: %w", err)
	}

	// Create trace provider
	tracerProvider := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(traceExporter),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
	)

	otel.SetTracerProvider(tracerProvider)

	return func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := tracerProvider.Shutdown(ctx); err != nil {
			fmt.Printf("Error shutting down tracer provider: %v\n", err)
		}
	}, nil
}

// setupMetrics configures OpenTelemetry metrics with Prometheus
func setupMetrics(ctx context.Context, res *resource.Resource) (func(), error) {
	// Create Prometheus exporter
	prometheusExporter, err := prometheus.New()
	if err != nil {
		return nil, fmt.Errorf("failed to create prometheus exporter: %w", err)
	}

	// Create meter provider
	meterProvider := sdkmetric.NewMeterProvider(
		sdkmetric.WithResource(res),
		sdkmetric.WithReader(prometheusExporter),
	)

	otel.SetMeterProvider(meterProvider)

	return func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := meterProvider.Shutdown(ctx); err != nil {
			fmt.Printf("Error shutting down meter provider: %v\n", err)
		}
	}, nil
}

// initializeMetrics creates all metric instruments
func initializeMetrics() error {
	meter := otel.Meter("v2x-gateway-rsu")

	var err error

	// Message counter
	MessageCounter, err = meter.Int64Counter(
		"v2x.messages.total",
		metric.WithDescription("Total number of V2X messages processed"),
		metric.WithUnit("{message}"),
	)
	if err != nil {
		return fmt.Errorf("failed to create message counter: %w", err)
	}

	// Latency histogram
	LatencyHistogram, err = meter.Float64Histogram(
		"v2x.message.latency",
		metric.WithDescription("Message processing latency"),
		metric.WithUnit("ms"),
	)
	if err != nil {
		return fmt.Errorf("failed to create latency histogram: %w", err)
	}

	// Active connections
	ActiveConnections, err = meter.Int64UpDownCounter(
		"v2x.connections.active",
		metric.WithDescription("Number of active connections"),
		metric.WithUnit("{connection}"),
	)
	if err != nil {
		return fmt.Errorf("failed to create active connections counter: %w", err)
	}

	// Processing duration
	ProcessingDuration, err = meter.Float64Histogram(
		"v2x.processing.duration",
		metric.WithDescription("Message processing duration"),
		metric.WithUnit("ms"),
	)
	if err != nil {
		return fmt.Errorf("failed to create processing duration histogram: %w", err)
	}

	// Error counter
	ErrorCounter, err = meter.Int64Counter(
		"v2x.errors.total",
		metric.WithDescription("Total number of errors"),
		metric.WithUnit("{error}"),
	)
	if err != nil {
		return fmt.Errorf("failed to create error counter: %w", err)
	}

	// Throughput counter
	ThroughputCounter, err = meter.Int64Counter(
		"v2x.throughput.total",
		metric.WithDescription("Message throughput"),
		metric.WithUnit("{message}"),
	)
	if err != nil {
		return fmt.Errorf("failed to create throughput counter: %w", err)
	}

	return nil
}

// RecordMessage records a processed message
func RecordMessage(ctx context.Context, messageType string, priority int, success bool) {
	attrs := []attribute.KeyValue{
		attribute.String("message.type", messageType),
		attribute.Int("message.priority", priority),
		attribute.Bool("success", success),
	}

	MessageCounter.Add(ctx, 1, metric.WithAttributes(attrs...))
	ThroughputCounter.Add(ctx, 1, metric.WithAttributes(attrs...))
}

// RecordLatency records message processing latency
func RecordLatency(ctx context.Context, latencyMs float64, messageType string) {
	attrs := []attribute.KeyValue{
		attribute.String("message.type", messageType),
	}

	LatencyHistogram.Record(ctx, latencyMs, metric.WithAttributes(attrs...))
}

// RecordError records an error occurrence
func RecordError(ctx context.Context, errorType string, component string) {
	attrs := []attribute.KeyValue{
		attribute.String("error.type", errorType),
		attribute.String("component", component),
	}

	ErrorCounter.Add(ctx, 1, metric.WithAttributes(attrs...))
}

// RecordProcessingDuration records the duration of a processing operation
func RecordProcessingDuration(ctx context.Context, durationMs float64, operation string) {
	attrs := []attribute.KeyValue{
		attribute.String("operation", operation),
	}

	ProcessingDuration.Record(ctx, durationMs, metric.WithAttributes(attrs...))
}

// StartSpan starts a new trace span with common attributes
func StartSpan(ctx context.Context, spanName string, opts ...trace.SpanStartOption) (context.Context, trace.Span) {
	return Tracer.Start(ctx, spanName, opts...)
}

// AddSpanEvent adds an event to the current span
func AddSpanEvent(ctx context.Context, name string, attrs ...attribute.KeyValue) {
	span := trace.SpanFromContext(ctx)
	span.AddEvent(name, trace.WithAttributes(attrs...))
}

// SetSpanAttributes sets attributes on the current span
func SetSpanAttributes(ctx context.Context, attrs ...attribute.KeyValue) {
	span := trace.SpanFromContext(ctx)
	span.SetAttributes(attrs...)
}

// RecordSpanError records an error in the current span
func RecordSpanError(ctx context.Context, err error) {
	span := trace.SpanFromContext(ctx)
	span.RecordError(err)
}
