/**
 * MetricsCollector - Performance Metrics Collection for Research (Section 5)
 *
 * Implements metrics collection according to the research proposal:
 * - Latency (E2E and consensus)
 * - Throughput (TPS)
 * - Scalability
 * - Resource usage (CPU/memory)
 * - Network overhead
 * - Robustness (rejection rates)
 */

class MetricsCollector {
    constructor() {
        this.metrics = {
            latency: {
                e2e: [], // End-to-end latency measurements
                consensus: [], // Consensus-only latency
                validation: [] // Validation latency
            },
            throughput: {
                timestamps: [],
                transactions: [],
                window: 1000 // 1 second window
            },
            resources: {
                cpu: [],
                memory: [],
                network: []
            },
            reliability: {
                submitted: 0,
                confirmed: 0,
                rejected: 0,
                replayDetected: 0
            },
            messageTypes: {} // Count by type
        };

        this.startTime = Date.now();
    }

    /**
     * Record end-to-end latency (OBU → confirmation)
     * Metric: Section 5 - Latência E2E (crítica)
     */
    recordE2ELatency(latencyMs, priority) {
        this.metrics.latency.e2e.push({
            value: latencyMs,
            priority,
            timestamp: Date.now()
        });
    }

    /**
     * Record consensus latency (proposal → commit)
     * Metric: Section 5 - Latência de consenso
     */
    recordConsensusLatency(latencyMs) {
        this.metrics.latency.consensus.push({
            value: latencyMs,
            timestamp: Date.now()
        });
    }

    /**
     * Record validation latency
     */
    recordValidationLatency(latencyMs) {
        this.metrics.latency.validation.push({
            value: latencyMs,
            timestamp: Date.now()
        });
    }

    /**
     * Record transaction submission
     * Metric: Section 5 - Throughput (TPS)
     */
    recordTransaction(messageType, confirmed = false) {
        const now = Date.now();

        this.metrics.throughput.timestamps.push(now);
        this.metrics.throughput.transactions.push({
            type: messageType,
            confirmed,
            timestamp: now
        });

        // Update reliability counters
        this.metrics.reliability.submitted++;
        if (confirmed) {
            this.metrics.reliability.confirmed++;
        }

        // Update message type counter
        if (!this.metrics.messageTypes[messageType]) {
            this.metrics.messageTypes[messageType] = 0;
        }
        this.metrics.messageTypes[messageType]++;
    }

    /**
     * Record rejected transaction (security validation)
     * Metric: Section 5 - Taxa de rejeição
     */
    recordRejection(reason) {
        this.metrics.reliability.rejected++;

        if (reason === 'REPLAY_ATTACK') {
            this.metrics.reliability.replayDetected++;
        }
    }

    /**
     * Record resource usage
     * Metric: Section 5 - CPU/memória
     */
    recordResourceUsage(cpu, memory, network) {
        this.metrics.resources.cpu.push({
            value: cpu,
            timestamp: Date.now()
        });

        this.metrics.resources.memory.push({
            value: memory,
            timestamp: Date.now()
        });

        if (network) {
            this.metrics.resources.network.push({
                bytesIn: network.bytesIn || 0,
                bytesOut: network.bytesOut || 0,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Calculate Transactions Per Second (TPS)
     * Metric: Section 5 - Throughput (TPS)
     */
    calculateTPS(windowMs = 1000) {
        const now = Date.now();
        const cutoff = now - windowMs;

        const recentTx = this.metrics.throughput.timestamps.filter(
            ts => ts >= cutoff
        );

        return recentTx.length / (windowMs / 1000);
    }

    /**
     * Calculate latency percentiles
     * Returns: p50, p95, p99 (in milliseconds)
     */
    calculateLatencyPercentiles(latencyArray) {
        if (latencyArray.length === 0) {
            return { p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 };
        }

        const values = latencyArray.map(item => item.value).sort((a, b) => a - b);
        const len = values.length;

        const p50 = values[Math.floor(len * 0.50)];
        const p95 = values[Math.floor(len * 0.95)];
        const p99 = values[Math.floor(len * 0.99)];
        const avg = values.reduce((a, b) => a + b, 0) / len;
        const min = values[0];
        const max = values[len - 1];

        return { p50, p95, p99, avg, min, max };
    }

    /**
     * Get comprehensive performance report
     * Implements metrics table from Section 5
     */
    generateReport() {
        const uptime = Date.now() - this.startTime;
        const uptimeSeconds = uptime / 1000;

        // Latency analysis
        const e2eLatency = this.calculateLatencyPercentiles(this.metrics.latency.e2e);
        const consensusLatency = this.calculateLatencyPercentiles(this.metrics.latency.consensus);
        const validationLatency = this.calculateLatencyPercentiles(this.metrics.latency.validation);

        // Critical messages latency (priority 0)
        const criticalMessages = this.metrics.latency.e2e.filter(item => item.priority === 0);
        const criticalLatency = this.calculateLatencyPercentiles(criticalMessages);

        // Throughput
        const avgTPS = this.metrics.reliability.submitted / uptimeSeconds;
        const currentTPS = this.calculateTPS(1000);

        // Reliability
        const confirmationRate = this.metrics.reliability.submitted > 0
            ? (this.metrics.reliability.confirmed / this.metrics.reliability.submitted) * 100
            : 0;

        const rejectionRate = this.metrics.reliability.submitted > 0
            ? (this.metrics.reliability.rejected / this.metrics.reliability.submitted) * 100
            : 0;

        // Resource usage
        const avgCPU = this.metrics.resources.cpu.length > 0
            ? this.metrics.resources.cpu.reduce((a, b) => a + b.value, 0) / this.metrics.resources.cpu.length
            : 0;

        const avgMemory = this.metrics.resources.memory.length > 0
            ? this.metrics.resources.memory.reduce((a, b) => a + b.value, 0) / this.metrics.resources.memory.length
            : 0;

        // Network overhead
        const totalNetworkIn = this.metrics.resources.network.reduce((a, b) => a + b.bytesIn, 0);
        const totalNetworkOut = this.metrics.resources.network.reduce((a, b) => a + b.bytesOut, 0);

        return {
            summary: {
                uptime: uptime,
                uptimeSeconds: uptimeSeconds,
                totalTransactions: this.metrics.reliability.submitted,
                confirmedTransactions: this.metrics.reliability.confirmed,
                rejectedTransactions: this.metrics.reliability.rejected,
                replayAttacksDetected: this.metrics.reliability.replayDetected
            },
            latency: {
                e2e: {
                    ...e2eLatency,
                    unit: 'ms'
                },
                critical: {
                    ...criticalLatency,
                    unit: 'ms',
                    target: 100, // Target: <100ms for critical
                    meetsTarget: criticalLatency.p95 < 100
                },
                consensus: {
                    ...consensusLatency,
                    unit: 'ms'
                },
                validation: {
                    ...validationLatency,
                    unit: 'ms'
                }
            },
            throughput: {
                averageTPS: avgTPS,
                currentTPS: currentTPS,
                unit: 'tx/s'
            },
            reliability: {
                confirmationRate: confirmationRate,
                rejectionRate: rejectionRate,
                unit: '%'
            },
            resources: {
                avgCPU: avgCPU,
                avgMemory: avgMemory,
                totalNetworkIn: totalNetworkIn,
                totalNetworkOut: totalNetworkOut,
                units: {
                    cpu: '%',
                    memory: 'MB',
                    network: 'bytes'
                }
            },
            messageTypes: this.metrics.messageTypes,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Export metrics for analysis
     * Format suitable for statistical tools (R, Python, MATLAB)
     */
    exportForAnalysis() {
        return {
            raw: {
                latency: this.metrics.latency,
                throughput: this.metrics.throughput,
                resources: this.metrics.resources,
                reliability: this.metrics.reliability
            },
            report: this.generateReport()
        };
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.metrics = {
            latency: { e2e: [], consensus: [], validation: [] },
            throughput: { timestamps: [], transactions: [], window: 1000 },
            resources: { cpu: [], memory: [], network: [] },
            reliability: { submitted: 0, confirmed: 0, rejected: 0, replayDetected: 0 },
            messageTypes: {}
        };
        this.startTime = Date.now();
    }

    /**
     * Get real-time dashboard data
     */
    getDashboard() {
        const report = this.generateReport();

        return {
            realtime: {
                tps: report.throughput.currentTPS,
                avgLatency: report.latency.e2e.avg,
                confirmationRate: report.reliability.confirmationRate
            },
            targets: {
                criticalLatency: {
                    target: 100,
                    actual: report.latency.critical.p95,
                    meetsTarget: report.latency.critical.meetsTarget
                },
                tps: {
                    target: 100, // Minimum acceptable TPS
                    actual: report.throughput.averageTPS,
                    meetsTarget: report.throughput.averageTPS >= 100
                }
            },
            summary: report.summary
        };
    }
}

module.exports = MetricsCollector;
