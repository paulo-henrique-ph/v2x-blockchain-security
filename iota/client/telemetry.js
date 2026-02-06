// OpenTelemetry Configuration for IOTA Tangle Client
// Provides distributed tracing and metrics collection for IOTA DAG interactions

import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import * as api from '@opentelemetry/api';

export class IOTATelemetry {
    constructor(config = {}) {
        this.config = {
            serviceName: config.serviceName || 'iota-tangle-client',
            serviceVersion: config.serviceVersion || '1.0.0',
            environment: config.environment || 'production',
            otlpEndpoint: config.otlpEndpoint || 'localhost:4317',
            prometheusPort: config.prometheusPort || 9093,
            enableTracing: config.enableTracing !== false,
            enableMetrics: config.enableMetrics !== false,
        };

        this.tracer = null;
        this.meter = null;
        this.metrics = {};
    }

    /**
     * Initialize OpenTelemetry tracing and metrics
     */
    async initialize() {
        try {
            // Create resource with service information
            const resource = new Resource({
                [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
                [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
                [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
                'service.type': 'blockchain-client',
                'blockchain.platform': 'iota-tangle',
                'blockchain.type': 'dag',
            });

            // Setup Tracing
            if (this.config.enableTracing) {
                await this.setupTracing(resource);
                console.log('✅ OpenTelemetry Tracing initialized');
            }

            // Setup Metrics
            if (this.config.enableMetrics) {
                await this.setupMetrics(resource);
                this.initializeMetricInstruments();
                console.log(`✅ OpenTelemetry Metrics initialized (Prometheus: ${this.config.prometheusPort})`);
            }

            return this;
        } catch (error) {
            console.error('Failed to initialize OpenTelemetry:', error);
            throw error;
        }
    }

    /**
     * Setup distributed tracing
     */
    async setupTracing(resource) {
        // Create OTLP trace exporter
        const traceExporter = new OTLPTraceExporter({
            url: `grpc://${this.config.otlpEndpoint}`,
        });

        // Create tracer provider
        const tracerProvider = new NodeTracerProvider({
            resource: resource,
        });

        // Add batch span processor
        tracerProvider.addSpanProcessor(
            new BatchSpanProcessor(traceExporter, {
                maxQueueSize: 1000,
                scheduledDelayMillis: 5000,
            })
        );

        // Register the provider
        tracerProvider.register();

        // Register instrumentations
        registerInstrumentations({
            instrumentations: [
                new HttpInstrumentation({
                    ignoreIncomingPaths: ['/metrics', '/health'],
                }),
            ],
        });

        // Get tracer instance
        this.tracer = api.trace.getTracer(this.config.serviceName, this.config.serviceVersion);
    }

    /**
     * Setup metrics collection
     */
    async setupMetrics(resource) {
        // Create Prometheus exporter
        const prometheusExporter = new PrometheusExporter(
            {
                port: this.config.prometheusPort,
            },
            () => {
                console.log(`Prometheus metrics available at http://localhost:${this.config.prometheusPort}/metrics`);
            }
        );

        // Create OTLP metric exporter
        const otlpMetricExporter = new OTLPMetricExporter({
            url: `grpc://${this.config.otlpEndpoint}`,
        });

        // Create meter provider
        const meterProvider = new MeterProvider({
            resource: resource,
            readers: [
                prometheusExporter,
                new PeriodicExportingMetricReader({
                    exporter: otlpMetricExporter,
                    exportIntervalMillis: 60000,
                }),
            ],
        });

        // Set global meter provider
        api.metrics.setGlobalMeterProvider(meterProvider);

        // Get meter instance
        this.meter = api.metrics.getMeter(this.config.serviceName, this.config.serviceVersion);
    }

    /**
     * Initialize metric instruments specific to IOTA Tangle
     */
    initializeMetricInstruments() {
        // Message counter (Tangle messages)
        this.metrics.messageCounter = this.meter.createCounter('iota.messages.total', {
            description: 'Total number of messages submitted to Tangle',
            unit: '{message}',
        });

        // Message latency (DAG confirmation)
        this.metrics.messageLatency = this.meter.createHistogram('iota.message.latency', {
            description: 'Message confirmation latency in Tangle',
            unit: 'ms',
        });

        // Tips selection latency
        this.metrics.tipsSelectionLatency = this.meter.createHistogram('iota.tips.selection.latency', {
            description: 'Tips selection latency',
            unit: 'ms',
        });

        // PoW latency
        this.metrics.powLatency = this.meter.createHistogram('iota.pow.latency', {
            description: 'Proof of Work computation latency',
            unit: 'ms',
        });

        // Confirmation rate
        this.metrics.confirmationRate = this.meter.createHistogram('iota.confirmation.rate', {
            description: 'Message confirmation rate',
            unit: '{percentage}',
        });

        // Error counter
        this.metrics.errorCounter = this.meter.createCounter('iota.errors.total', {
            description: 'Total number of errors',
            unit: '{error}',
        });

        // Message payload size
        this.metrics.payloadSize = this.meter.createHistogram('iota.message.payload.size', {
            description: 'Message payload size',
            unit: 'bytes',
        });

        // V2X messages stored
        this.metrics.v2xMessagesStored = this.meter.createCounter('iota.v2x.messages.stored', {
            description: 'Total V2X messages stored in Tangle',
            unit: '{message}',
        });

        // DID operations
        this.metrics.didOperations = this.meter.createCounter('iota.did.operations', {
            description: 'Number of DID operations',
            unit: '{operation}',
        });

        // Active connections
        this.metrics.activeConnections = this.meter.createUpDownCounter('iota.connections.active', {
            description: 'Active client connections',
            unit: '{connection}',
        });

        // Throughput
        this.metrics.throughput = this.meter.createCounter('iota.throughput.total', {
            description: 'Message throughput',
            unit: '{message}',
        });

        // Network health
        this.metrics.networkHealth = this.meter.createGauge('iota.network.health', {
            description: 'IOTA network health score',
            unit: '{score}',
        });
    }

    /**
     * Create a new span for tracing
     */
    startSpan(name, attributes = {}) {
        if (!this.tracer) return null;

        return this.tracer.startSpan(name, {
            attributes,
        });
    }

    /**
     * Start an active span with automatic context propagation
     */
    startActiveSpan(name, callback, attributes = {}) {
        if (!this.tracer) {
            return callback(null);
        }

        return this.tracer.startActiveSpan(name, { attributes }, callback);
    }

    /**
     * Record a message submission to Tangle
     */
    recordMessage(messageType, priority, success, latencies = {}, payloadSize = 0) {
        const attributes = {
            'message.type': messageType,
            'message.priority': priority,
            'success': success,
        };

        this.metrics.messageCounter?.add(1, attributes);
        this.metrics.throughput?.add(1, attributes);

        // Record latencies
        if (latencies.total) {
            this.metrics.messageLatency?.record(latencies.total, attributes);
        }
        if (latencies.tipsSelection) {
            this.metrics.tipsSelectionLatency?.record(latencies.tipsSelection, attributes);
        }
        if (latencies.pow) {
            this.metrics.powLatency?.record(latencies.pow, attributes);
        }

        // Record payload size
        if (payloadSize > 0) {
            this.metrics.payloadSize?.record(payloadSize, attributes);
        }

        if (success) {
            this.metrics.v2xMessagesStored?.add(1, attributes);
        }
    }

    /**
     * Record DID operation
     */
    recordDIDOperation(operation, success) {
        this.metrics.didOperations?.add(1, {
            'operation.type': operation,
            'success': success,
        });
    }

    /**
     * Update confirmation rate
     */
    updateConfirmationRate(rate) {
        this.metrics.confirmationRate?.record(rate);
    }

    /**
     * Update network health
     */
    updateNetworkHealth(score) {
        this.metrics.networkHealth?.record(score);
    }

    /**
     * Record an error
     */
    recordError(errorType, component, message = '') {
        this.metrics.errorCounter?.add(1, {
            'error.type': errorType,
            'component': component,
            'error.message': message,
        });
    }

    /**
     * Update active connections
     */
    updateConnections(delta) {
        this.metrics.activeConnections?.add(delta);
    }

    /**
     * Add event to current span
     */
    addSpanEvent(span, name, attributes = {}) {
        if (span) {
            span.addEvent(name, attributes);
        }
    }

    /**
     * Record error in span
     */
    recordSpanError(span, error) {
        if (span) {
            span.recordException(error);
            span.setStatus({ code: api.SpanStatusCode.ERROR, message: error.message });
        }
    }

    /**
     * Set span status to OK
     */
    setSpanSuccess(span) {
        if (span) {
            span.setStatus({ code: api.SpanStatusCode.OK });
        }
    }

    /**
     * End a span
     */
    endSpan(span) {
        if (span) {
            span.end();
        }
    }

    /**
     * Shutdown telemetry gracefully
     */
    async shutdown() {
        try {
            await api.trace.getTracerProvider()?.shutdown();
            await api.metrics.getMeterProvider()?.shutdown();
            console.log('OpenTelemetry shutdown complete');
        } catch (error) {
            console.error('Error during OpenTelemetry shutdown:', error);
        }
    }
}
