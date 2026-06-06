/**
 * Benchmark Runner
 * Orchestrates benchmark execution across different platforms
 */

import MetricsCollector from './metrics.js';
import fs from 'fs';
import path from 'path';

export class BenchmarkRunner {
    constructor(platform, config = {}) {
        this.platform = platform;
        this.config = {
            warmupTransactions: config.warmupTransactions || 10,
            testTransactions: config.testTransactions || 100,
            concurrency: config.concurrency || 1,
            scenarios: config.scenarios || ['vehicle-registration', 'security-alert'],
            duration: config.duration || 60000, // 60 seconds
            collectInterval: config.collectInterval || 1000, // 1 second
            ...config
        };
        this.metrics = new MetricsCollector(platform);
        this.client = null;
    }

    /**
     * Initialize platform client
     */
    async initialize(client) {
        this.client = client;
        console.log(`[${this.platform}] Initializing benchmark runner`);
        console.log(`Configuration:`, JSON.stringify(this.config, null, 2));
    }

    /**
     * Run warmup phase
     */
    async warmup() {
        console.log(`[${this.platform}] Starting warmup phase (${this.config.warmupTransactions} transactions)`);

        for (let i = 0; i < this.config.warmupTransactions; i++) {
            try {
                const vehicleId = `WARMUP-VEHICLE-${i}`;
                await this.client.registerVehicle(vehicleId, `0xWARMUP${i}`);
            } catch (error) {
                console.error(`Warmup transaction ${i} failed:`, error.message);
            }
        }

        console.log(`[${this.platform}] Warmup completed`);
    }

    /**
     * Run latency benchmark
     */
    async benchmarkLatency() {
        console.log(`[${this.platform}] Running latency benchmark`);

        const iterations = this.config.testTransactions;

        for (let i = 0; i < iterations; i++) {
            const vehicleId = `LATENCY-TEST-${i}`;
            const publicKey = `0xLATENCY${i}`;

            // Measure E2E latency
            const startE2E = Date.now();
            try {
                await this.client.registerVehicle(vehicleId, publicKey);
                const e2eLatency = Date.now() - startE2E;
                this.metrics.recordE2ELatency(e2eLatency);
            } catch (error) {
                console.error(`Latency test ${i} failed:`, error.message);
                this.metrics.recordErrorRate(1, 1);
            }

            // Measure query latency
            const startQuery = Date.now();
            try {
                await this.client.getVehicle(vehicleId);
                const queryLatency = Date.now() - startQuery;
                this.metrics.recordQueryLatency(queryLatency);
            } catch (error) {
                console.error(`Query test ${i} failed:`, error.message);
            }
        }

        console.log(`[${this.platform}] Latency benchmark completed`);
    }

    /**
     * Run throughput benchmark
     */
    async benchmarkThroughput() {
        console.log(`[${this.platform}] Running throughput benchmark`);

        const duration = this.config.duration;
        const startTime = Date.now();
        let transactionCount = 0;
        let confirmedCount = 0;
        let errorCount = 0;

        // Collect TPS periodically
        const tpsInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const currentTPS = confirmedCount / elapsed;
            this.metrics.recordTPS(currentTPS);
        }, this.config.collectInterval);

        while (Date.now() - startTime < duration) {
            const batch = [];

            // Submit batch of concurrent transactions
            for (let i = 0; i < this.config.concurrency; i++) {
                const vehicleId = `TPS-TEST-${transactionCount + i}`;
                const publicKey = `0xTPS${transactionCount + i}`;

                batch.push(
                    this.client.registerVehicle(vehicleId, publicKey)
                        .then(() => confirmedCount++)
                        .catch(() => errorCount++)
                );
            }

            await Promise.all(batch);
            transactionCount += this.config.concurrency;
        }

        clearInterval(tpsInterval);

        // Record final metrics
        const totalDuration = (Date.now() - startTime) / 1000;
        const finalTPS = confirmedCount / totalDuration;
        this.metrics.recordTPS(finalTPS);
        this.metrics.recordConfirmationRate(confirmedCount, transactionCount);
        this.metrics.recordErrorRate(errorCount, transactionCount);

        console.log(`[${this.platform}] Throughput benchmark completed`);
        console.log(`  Total transactions: ${transactionCount}`);
        console.log(`  Confirmed: ${confirmedCount}`);
        console.log(`  Errors: ${errorCount}`);
        console.log(`  Final TPS: ${finalTPS.toFixed(2)}`);
    }

    /**
     * Run scalability benchmark
     */
    async benchmarkScalability() {
        console.log(`[${this.platform}] Running scalability benchmark`);

        // Test with different load levels
        const loadLevels = [1, 5, 10, 20, 50];

        for (const load of loadLevels) {
            console.log(`  Testing with load level: ${load}`);

            const startTime = Date.now();
            let confirmedCount = 0;
            const testDuration = 10000; // 10 seconds per load level

            while (Date.now() - startTime < testDuration) {
                const batch = [];

                for (let i = 0; i < load; i++) {
                    const vehicleId = `SCALE-TEST-${load}-${confirmedCount + i}`;
                    batch.push(
                        this.client.registerVehicle(vehicleId, `0xSCALE${confirmedCount + i}`)
                            .then(() => confirmedCount++)
                            .catch(() => {})
                    );
                }

                await Promise.all(batch);
            }

            const duration = (Date.now() - startTime) / 1000;
            const tps = confirmedCount / duration;
            this.metrics.recordTpsVsLoad(load, tps);

            console.log(`    Load ${load}: ${tps.toFixed(2)} TPS`);
        }

        console.log(`[${this.platform}] Scalability benchmark completed`);
    }

    /**
     * Run robustness benchmark
     */
    async benchmarkRobustness() {
        console.log(`[${this.platform}] Running robustness benchmark`);

        // Test with malicious/invalid transactions
        const totalTests = 100;
        let rejectedCount = 0;

        for (let i = 0; i < totalTests; i++) {
            try {
                // Attempt invalid operations
                await this.client.registerVehicle('', ''); // Empty ID
                rejectedCount++;
            } catch (error) {
                // Expected to fail
            }

            try {
                await this.client.getVehicle('NON-EXISTENT-VEHICLE');
                // Should return null or error
            } catch (error) {
                // Expected behavior
            }
        }

        this.metrics.recordRejectionRate(rejectedCount, totalTests);

        console.log(`[${this.platform}] Robustness benchmark completed`);
    }

    /**
     * Run complete benchmark suite
     */
    async run() {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Starting benchmark suite for: ${this.platform}`);
        console.log(`${'='.repeat(60)}\n`);

        this.metrics.start();

        try {
            // Warmup
            await this.warmup();

            // Wait a bit between phases
            await this.sleep(2000);

            // Run benchmarks
            await this.benchmarkLatency();
            await this.sleep(2000);

            await this.benchmarkThroughput();
            await this.sleep(2000);

            await this.benchmarkScalability();
            await this.sleep(2000);

            await this.benchmarkRobustness();

        } catch (error) {
            console.error(`Benchmark failed:`, error);
            throw error;
        } finally {
            this.metrics.end();
        }

        // Get results
        const summary = this.metrics.getSummary();
        const rawMetrics = this.metrics.getRawMetrics();

        // Save results
        await this.saveResults(summary, rawMetrics);

        // Print summary
        this.printSummary(summary);

        return { summary, rawMetrics };
    }

    /**
     * Save results to file
     */
    async saveResults(summary, rawMetrics) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsDir = path.resolve('benchmarks', 'results', this.platform);

        // Create directory if it doesn't exist
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }

        // Save summary
        const summaryFile = path.join(resultsDir, `summary-${timestamp}.json`);
        fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
        console.log(`\nSummary saved to: ${summaryFile}`);

        // Save raw metrics
        const rawFile = path.join(resultsDir, `raw-${timestamp}.json`);
        fs.writeFileSync(rawFile, JSON.stringify(rawMetrics, null, 2));
        console.log(`Raw metrics saved to: ${rawFile}`);
    }

    /**
     * Print summary to console
     */
    printSummary(summary) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Benchmark Results for: ${this.platform}`);
        console.log(`${'='.repeat(60)}`);

        console.log(`\n📊 Latency (ms):`);
        console.log(`  E2E     - Min: ${summary.latency.e2e.min.toFixed(2)}, Avg: ${summary.latency.e2e.avg.toFixed(2)}, P95: ${summary.latency.e2e.p95.toFixed(2)}, P99: ${summary.latency.e2e.p99.toFixed(2)}, Max: ${summary.latency.e2e.max.toFixed(2)}`);
        console.log(`  Query   - Min: ${summary.latency.query.min.toFixed(2)}, Avg: ${summary.latency.query.avg.toFixed(2)}, P95: ${summary.latency.query.p95.toFixed(2)}, Max: ${summary.latency.query.max.toFixed(2)}`);

        console.log(`\n⚡ Throughput:`);
        console.log(`  TPS     - Avg: ${summary.throughput.tps.avg.toFixed(2)}, Max: ${summary.throughput.tps.max.toFixed(2)}`);
        console.log(`  Success - ${summary.throughput.confirmationRate.avg.toFixed(2)}%`);

        console.log(`\n🛡️  Robustness:`);
        console.log(`  Rejection Rate - ${summary.robustness.rejectionRate.avg.toFixed(2)}%`);
        console.log(`  Error Rate     - ${summary.robustness.errorRate.avg.toFixed(2)}%`);

        console.log(`\n${'='.repeat(60)}\n`);
    }

    /**
     * Helper: sleep
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default BenchmarkRunner;
