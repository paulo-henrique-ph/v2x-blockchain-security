/**
 * Metrics Framework for Blockchain Platform Comparison
 * Based on Section 5: Quadro de métricas
 */

export class MetricsCollector {
    constructor(platformName) {
        this.platformName = platformName;
        this.metrics = {
            latency: {
                e2e: [], // End-to-end latency (OBU → confirmation)
                consensus: [], // Consensus latency (proposal → commit)
                query: [] // Query response time
            },
            throughput: {
                tps: [], // Transactions per second
                confirmationRate: [] // Confirmed / submitted
            },
            resources: {
                cpu: [], // CPU usage %
                memory: [], // Memory usage MB
                networkIn: [], // Network bytes in
                networkOut: [] // Network bytes out
            },
            robustness: {
                rejectionRate: [], // Malicious messages rejected %
                availability: [], // Availability under load %
                errorRate: [] // Transaction error rate %
            },
            scalability: {
                tpsVsValidators: new Map(), // TPS for different validator counts
                tpsVsLoad: new Map() // TPS at different load levels
            }
        };
        this.startTime = null;
        this.endTime = null;
    }

    /**
     * Start metrics collection session
     */
    start() {
        this.startTime = Date.now();
        console.log(`[${this.platformName}] Metrics collection started at ${new Date(this.startTime).toISOString()}`);
    }

    /**
     * End metrics collection session
     */
    end() {
        this.endTime = Date.now();
        const duration = this.endTime - this.startTime;
        console.log(`[${this.platformName}] Metrics collection ended. Duration: ${duration}ms`);
        return duration;
    }

    /**
     * Record end-to-end latency (OBU → confirmation)
     * @param {number} latencyMs - Latency in milliseconds
     */
    recordE2ELatency(latencyMs) {
        this.metrics.latency.e2e.push({
            timestamp: Date.now(),
            value: latencyMs
        });
    }

    /**
     * Record consensus latency (proposal → commit)
     * @param {number} latencyMs - Latency in milliseconds
     */
    recordConsensusLatency(latencyMs) {
        this.metrics.latency.consensus.push({
            timestamp: Date.now(),
            value: latencyMs
        });
    }

    /**
     * Record query latency
     * @param {number} latencyMs - Latency in milliseconds
     */
    recordQueryLatency(latencyMs) {
        this.metrics.latency.query.push({
            timestamp: Date.now(),
            value: latencyMs
        });
    }

    /**
     * Record TPS measurement
     * @param {number} tps - Transactions per second
     */
    recordTPS(tps) {
        this.metrics.throughput.tps.push({
            timestamp: Date.now(),
            value: tps
        });
    }

    /**
     * Record confirmation rate
     * @param {number} confirmed - Number of confirmed transactions
     * @param {number} submitted - Number of submitted transactions
     */
    recordConfirmationRate(confirmed, submitted) {
        const rate = submitted > 0 ? (confirmed / submitted) * 100 : 0;
        this.metrics.throughput.confirmationRate.push({
            timestamp: Date.now(),
            value: rate,
            confirmed,
            submitted
        });
    }

    /**
     * Record resource usage
     * @param {Object} resources - { cpu, memory, networkIn, networkOut }
     */
    recordResourceUsage(resources) {
        const timestamp = Date.now();

        if (resources.cpu !== undefined) {
            this.metrics.resources.cpu.push({ timestamp, value: resources.cpu });
        }
        if (resources.memory !== undefined) {
            this.metrics.resources.memory.push({ timestamp, value: resources.memory });
        }
        if (resources.networkIn !== undefined) {
            this.metrics.resources.networkIn.push({ timestamp, value: resources.networkIn });
        }
        if (resources.networkOut !== undefined) {
            this.metrics.resources.networkOut.push({ timestamp, value: resources.networkOut });
        }
    }

    /**
     * Record rejection rate for malicious messages
     * @param {number} rejected - Number of rejected messages
     * @param {number} total - Total malicious messages injected
     */
    recordRejectionRate(rejected, total) {
        const rate = total > 0 ? (rejected / total) * 100 : 0;
        this.metrics.robustness.rejectionRate.push({
            timestamp: Date.now(),
            value: rate,
            rejected,
            total
        });
    }

    /**
     * Record availability under load
     * @param {number} availabilityPercent - Availability percentage
     */
    recordAvailability(availabilityPercent) {
        this.metrics.robustness.availability.push({
            timestamp: Date.now(),
            value: availabilityPercent
        });
    }

    /**
     * Record error rate
     * @param {number} errors - Number of errors
     * @param {number} total - Total transactions
     */
    recordErrorRate(errors, total) {
        const rate = total > 0 ? (errors / total) * 100 : 0;
        this.metrics.robustness.errorRate.push({
            timestamp: Date.now(),
            value: rate,
            errors,
            total
        });
    }

    /**
     * Record TPS vs validator count for scalability testing
     * @param {number} validatorCount - Number of validators
     * @param {number} tps - Measured TPS
     */
    recordTpsVsValidators(validatorCount, tps) {
        if (!this.metrics.scalability.tpsVsValidators.has(validatorCount)) {
            this.metrics.scalability.tpsVsValidators.set(validatorCount, []);
        }
        this.metrics.scalability.tpsVsValidators.get(validatorCount).push(tps);
    }

    /**
     * Record TPS vs load for scalability testing
     * @param {number} loadLevel - Load level (e.g., number of concurrent clients)
     * @param {number} tps - Measured TPS
     */
    recordTpsVsLoad(loadLevel, tps) {
        if (!this.metrics.scalability.tpsVsLoad.has(loadLevel)) {
            this.metrics.scalability.tpsVsLoad.set(loadLevel, []);
        }
        this.metrics.scalability.tpsVsLoad.get(loadLevel).push(tps);
    }

    /**
     * Calculate statistics for a metric array
     * @param {Array} data - Array of {timestamp, value} objects
     * @returns {Object} Statistics
     */
    calculateStats(data) {
        if (!data || data.length === 0) {
            return { min: 0, max: 0, avg: 0, median: 0, p95: 0, p99: 0, count: 0 };
        }

        const values = data.map(d => d.value).sort((a, b) => a - b);
        const count = values.length;
        const sum = values.reduce((acc, val) => acc + val, 0);
        const avg = sum / count;

        const getPercentile = (arr, p) => {
            const index = Math.ceil((p / 100) * arr.length) - 1;
            return arr[Math.max(0, index)];
        };

        return {
            min: values[0],
            max: values[count - 1],
            avg: avg,
            median: getPercentile(values, 50),
            p95: getPercentile(values, 95),
            p99: getPercentile(values, 99),
            count: count,
            stdDev: Math.sqrt(values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / count)
        };
    }

    /**
     * Get summary of all collected metrics
     * @returns {Object} Summary with statistics
     */
    getSummary() {
        return {
            platform: this.platformName,
            duration: this.endTime - this.startTime,
            timestamp: new Date().toISOString(),
            latency: {
                e2e: this.calculateStats(this.metrics.latency.e2e),
                consensus: this.calculateStats(this.metrics.latency.consensus),
                query: this.calculateStats(this.metrics.latency.query)
            },
            throughput: {
                tps: this.calculateStats(this.metrics.throughput.tps),
                confirmationRate: this.calculateStats(this.metrics.throughput.confirmationRate)
            },
            resources: {
                cpu: this.calculateStats(this.metrics.resources.cpu),
                memory: this.calculateStats(this.metrics.resources.memory),
                networkIn: this.calculateStats(this.metrics.resources.networkIn),
                networkOut: this.calculateStats(this.metrics.resources.networkOut)
            },
            robustness: {
                rejectionRate: this.calculateStats(this.metrics.robustness.rejectionRate),
                availability: this.calculateStats(this.metrics.robustness.availability),
                errorRate: this.calculateStats(this.metrics.robustness.errorRate)
            },
            scalability: {
                tpsVsValidators: Object.fromEntries(this.metrics.scalability.tpsVsValidators),
                tpsVsLoad: Object.fromEntries(this.metrics.scalability.tpsVsLoad)
            }
        };
    }

    /**
     * Export raw metrics data
     * @returns {Object} Raw metrics
     */
    getRawMetrics() {
        return {
            platform: this.platformName,
            startTime: this.startTime,
            endTime: this.endTime,
            metrics: {
                ...this.metrics,
                scalability: {
                    tpsVsValidators: Object.fromEntries(this.metrics.scalability.tpsVsValidators),
                    tpsVsLoad: Object.fromEntries(this.metrics.scalability.tpsVsLoad)
                }
            }
        };
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.metrics = {
            latency: { e2e: [], consensus: [], query: [] },
            throughput: { tps: [], confirmationRate: [] },
            resources: { cpu: [], memory: [], networkIn: [], networkOut: [] },
            robustness: { rejectionRate: [], availability: [], errorRate: [] },
            scalability: { tpsVsValidators: new Map(), tpsVsLoad: new Map() }
        };
        this.startTime = null;
        this.endTime = null;
    }
}

export default MetricsCollector;
