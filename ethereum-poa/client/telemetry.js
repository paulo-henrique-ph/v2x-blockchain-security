// OpenTelemetry Configuration for Ethereum PoA Client
// Provides distributed tracing and metrics collection

const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
const { MeterProvider, PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc');
const api = require('@opentelemetry/api');

class EthereumTelemetry {
    constructor(config = {}) {
        this.config = {
            serviceName: config.serviceName || 'ethereum-poa-client',
            serviceVersion: config.serviceVersion || '1.0.0',
            environment: config.environment || 'production',
            otlpEndpoint: config.otlpEndpoint || 'localhost:4317',
            prometheusPort: config.prometheusPort || 9091,
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
                'blockchain.platform': 'ethereum-poa',
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
                new ExpressInstrumentation(),
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
     * Initialize metric instruments
     */
    initializeMetricInstruments() {
        // Transaction counter
        this.metrics.transactionCounter = this.meter.createCounter('eth.transactions.total', {
            description: 'Total number of transactions submitted',
            unit: '{transaction}',
        });

        // Gas usage histogram
        this.metrics.gasUsage = this.meter.createHistogram('eth.gas.usage', {
            description: 'Gas used by transactions',
            unit: '{gas}',
        });

        // Transaction latency
        this.metrics.txLatency = this.meter.createHistogram('eth.transaction.latency', {
            description: 'Transaction confirmation latency',
            unit: 'ms',
        });

        // Error counter
        this.metrics.errorCounter = this.meter.createCounter('eth.errors.total', {
            description: 'Total number of errors',
            unit: '{error}',
        });

        // Active connections
        this.metrics.activeConnections = this.meter.createUpDownCounter('eth.connections.active', {
            description: 'Number of active Web3 connections',
            unit: '{connection}',
        });

        // Smart contract calls
        this.metrics.contractCalls = this.meter.createCounter('eth.contract.calls.total', {
            description: 'Total smart contract calls',
            unit: '{call}',
        });

        // Message storage counter
        this.metrics.messagesStored = this.meter.createCounter('eth.messages.stored', {
            description: 'Total V2X messages stored on blockchain',
            unit: '{message}',
        });

        // Vehicle registration counter
        this.metrics.vehiclesRegistered = this.meter.createCounter('eth.vehicles.registered', {
            description: 'Total vehicles registered',
            unit: '{vehicle}',
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
     * Record a transaction submission
     */
    recordTransaction(messageType, priority, success, gasUsed = 0, latencyMs = 0) {
        const attributes = {
            'message.type': messageType,
            'message.priority': priority,
            'success': success,
        };

        this.metrics.transactionCounter?.add(1, attributes);

        if (gasUsed > 0) {
            this.metrics.gasUsage?.record(gasUsed, attributes);
        }

        if (latencyMs > 0) {
            this.metrics.txLatency?.record(latencyMs, attributes);
        }

        if (success) {
            this.metrics.messagesStored?.add(1, attributes);
        }
    }

    /**
     * Record a smart contract call
     */
    recordContractCall(method, success) {
        this.metrics.contractCalls?.add(1, {
            'contract.method': method,
            'success': success,
        });
    }

    /**
     * Record vehicle registration
     */
    recordVehicleRegistration(vehicleId, success) {
        this.metrics.vehiclesRegistered?.add(1, {
            'vehicle.id': vehicleId,
            'success': success,
        });
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
     * Update active connections count
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

module.exports = EthereumTelemetry;
