// OpenTelemetry Configuration for Hyperledger Fabric Client
// Provides distributed tracing and metrics collection for Fabric network interactions

const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
const { MeterProvider, PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc');
const api = require('@opentelemetry/api');

class FabricTelemetry {
    constructor(config = {}) {
        this.config = {
            serviceName: config.serviceName || 'hyperledger-fabric-client',
            serviceVersion: config.serviceVersion || '1.0.0',
            environment: config.environment || 'production',
            otlpEndpoint: config.otlpEndpoint || 'localhost:4317',
            prometheusPort: config.prometheusPort || 9092,
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
                'blockchain.platform': 'hyperledger-fabric',
                'fabric.channel': 'itschannel',
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
     * Initialize metric instruments specific to Hyperledger Fabric
     */
    initializeMetricInstruments() {
        // Transaction counter
        this.metrics.transactionCounter = this.meter.createCounter('fabric.transactions.total', {
            description: 'Total number of transactions submitted to Fabric',
            unit: '{transaction}',
        });

        // Transaction latency (E2E)
        this.metrics.e2eLatency = this.meter.createHistogram('fabric.transaction.latency.e2e', {
            description: 'End-to-end transaction latency',
            unit: 'ms',
        });

        // Endorsement latency
        this.metrics.endorsementLatency = this.meter.createHistogram('fabric.transaction.latency.endorsement', {
            description: 'Transaction endorsement latency',
            unit: 'ms',
        });

        // Commit latency
        this.metrics.commitLatency = this.meter.createHistogram('fabric.transaction.latency.commit', {
            description: 'Transaction commit latency',
            unit: 'ms',
        });

        // Validation latency
        this.metrics.validationLatency = this.meter.createHistogram('fabric.transaction.latency.validation', {
            description: 'Chaincode validation latency',
            unit: 'ms',
        });

        // Consensus latency
        this.metrics.consensusLatency = this.meter.createHistogram('fabric.transaction.latency.consensus', {
            description: 'Consensus latency',
            unit: 'ms',
        });

        // Error counter
        this.metrics.errorCounter = this.meter.createCounter('fabric.errors.total', {
            description: 'Total number of errors',
            unit: '{error}',
        });

        // Chaincode invocation counter
        this.metrics.chaincodeInvocations = this.meter.createCounter('fabric.chaincode.invocations', {
            description: 'Number of chaincode invocations',
            unit: '{invocation}',
        });

        // Message storage counter
        this.metrics.messagesStored = this.meter.createCounter('fabric.messages.stored', {
            description: 'Total V2X messages stored on ledger',
            unit: '{message}',
        });

        // Gateway connections
        this.metrics.gatewayConnections = this.meter.createUpDownCounter('fabric.gateway.connections', {
            description: 'Active gateway connections',
            unit: '{connection}',
        });

        // Endorsement failures
        this.metrics.endorsementFailures = this.meter.createCounter('fabric.endorsement.failures', {
            description: 'Number of endorsement failures',
            unit: '{failure}',
        });

        // Transaction throughput
        this.metrics.throughput = this.meter.createCounter('fabric.throughput.total', {
            description: 'Transaction throughput',
            unit: '{transaction}',
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
    recordTransaction(messageType, priority, success, latencies = {}) {
        const attributes = {
            'message.type': messageType,
            'message.priority': priority,
            'success': success,
        };

        this.metrics.transactionCounter?.add(1, attributes);
        this.metrics.throughput?.add(1, attributes);

        // Record various latencies
        if (latencies.e2e) {
            this.metrics.e2eLatency?.record(latencies.e2e, attributes);
        }
        if (latencies.endorsement) {
            this.metrics.endorsementLatency?.record(latencies.endorsement, attributes);
        }
        if (latencies.commit) {
            this.metrics.commitLatency?.record(latencies.commit, attributes);
        }
        if (latencies.validation) {
            this.metrics.validationLatency?.record(latencies.validation, attributes);
        }
        if (latencies.consensus) {
            this.metrics.consensusLatency?.record(latencies.consensus, attributes);
        }

        if (success) {
            this.metrics.messagesStored?.add(1, attributes);
        }
    }

    /**
     * Record chaincode invocation
     */
    recordChaincodeInvocation(functionName, success) {
        this.metrics.chaincodeInvocations?.add(1, {
            'chaincode.function': functionName,
            'success': success,
        });
    }

    /**
     * Record endorsement failure
     */
    recordEndorsementFailure(reason) {
        this.metrics.endorsementFailures?.add(1, {
            'failure.reason': reason,
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
     * Update gateway connections
     */
    updateGatewayConnections(delta) {
        this.metrics.gatewayConnections?.add(delta);
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

module.exports = FabricTelemetry;
