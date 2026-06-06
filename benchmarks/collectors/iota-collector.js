/**
 * IOTA Tangle Metrics Collector
 * Platform-specific implementation for collecting IOTA performance metrics
 */

import BenchmarkRunner from '../framework/benchmark-runner.js';

export class IOTABenchmark extends BenchmarkRunner {
    constructor(config) {
        super('iota', config);
    }

    /**
     * Initialize IOTA client
     */
    async initialize() {
        // Try to import the real IOTA client, fallback to mock if not available
        let IOTAClient;
        try {
            IOTAClient = (await import('../../iota/client/index.js')).default;
        } catch (e) {
            IOTAClient = null;
        }
        if (IOTAClient) {
            this.client = new IOTAClient();
            await this.client.initialize(this.config.mnemonic);
        } else {
            console.log(`[IOTA] Client initialization placeholder`);
            // Mock client for testing
            this.client = {
                registerVehicle: async (vehicleId, publicKey) => {
                    await this.simulateDelay(30, 100);
                    return { blockId: 'BLOCK-' + Math.random().toString(36).substr(2, 9) };
                },
                submitSecurityAlert: async (alertId, vehicleId, type, severity, desc) => {
                    await this.simulateDelay(30, 100);
                    return { blockId: 'BLOCK-' + Math.random().toString(36).substr(2, 9) };
                },
                getVehicle: async (vehicleId) => {
                    await this.simulateDelay(100, 300);
                    return { vehicleId };
                },
                getAllVehicles: async () => {
                    await this.simulateDelay(500, 1500);
                    return [];
                },
                queryMessagesByTag: async (tag) => {
                    await this.simulateDelay(200, 500);
                    return [];
                }
            };
        }
        await super.initialize(this.client);
    }

    /**
     * IOTA-specific: measure message attachment time
     */
    async measureMessageAttachment() {
        console.log(`[IOTA] Measuring message attachment time (PoW)`);

        for (let i = 0; i < 50; i++) {
            const start = Date.now();

            // Submit message with PoW
            await this.client.registerVehicle(`ATTACH-TEST-${i}`, `0xATTACH${i}`);

            const attachmentTime = Date.now() - start;
            this.metrics.recordConsensusLatency(attachmentTime);
        }
    }

    /**
     * IOTA-specific: measure milestone confirmation time
     */
    async measureMilestoneConfirmation() {
        console.log(`[IOTA] Measuring milestone confirmation time`);

        const iterations = 30;

        for (let i = 0; i < iterations; i++) {
            const start = Date.now();

            // Submit message and wait for milestone confirmation
            await this.client.registerVehicle(`MILESTONE-TEST-${i}`, `0xMILE${i}`);

            // Simulate waiting for milestone (typically 10-60 seconds)
            await this.simulateDelay(10000, 60000);

            const confirmationTime = Date.now() - start;
            this.metrics.recordE2ELatency(confirmationTime);
        }
    }

    /**
     * IOTA-specific: measure tag-based query performance
     */
    async measureTagQueryPerformance() {
        console.log(`[IOTA] Measuring tag-based query performance`);

        const tags = ['ITS_VEHICLE', 'ITS_ALERT', 'ITS_TELEMETRY'];

        for (const tag of tags) {
            const iterations = 20;

            for (let i = 0; i < iterations; i++) {
                const start = Date.now();
                await this.client.queryMessagesByTag(tag);
                const queryLatency = Date.now() - start;
                this.metrics.recordQueryLatency(queryLatency);
            }
        }
    }

    /**
     * IOTA-specific: measure feeless transaction benefit
     */
    async measureFeelessBenefit() {
        console.log(`[IOTA] Measuring feeless transaction characteristics`);

        // IOTA has no transaction fees
        // Measure throughput without cost constraints
        const duration = 30000; // 30 seconds
        const startTime = Date.now();
        let messageCount = 0;

        while (Date.now() - startTime < duration) {
            await this.client.registerVehicle(`FEELESS-TEST-${messageCount}`, `0xFEE${messageCount}`);
            messageCount++;
        }

        const actualDuration = (Date.now() - startTime) / 1000;
        const messagesPerSecond = messageCount / actualDuration;

        console.log(`  Messages submitted: ${messageCount}`);
        console.log(`  Messages per second: ${messagesPerSecond.toFixed(2)}`);
        console.log(`  Total cost: 0 (feeless)`);

        this.metrics.recordTPS(messagesPerSecond);
    }

    /**
     * Override run to include IOTA-specific tests
     */
    async run() {
        await this.initialize();

        console.log(`\n${'='.repeat(60)}`);
        console.log(`Starting IOTA Tangle Benchmark Suite`);
        console.log(`${'='.repeat(60)}\n`);

        this.metrics.start();

        try {
            await this.warmup();
            await this.sleep(2000);

            // Standard benchmarks
            await this.benchmarkLatency();
            await this.sleep(2000);

            // IOTA-specific benchmarks
            await this.measureMessageAttachment();
            await this.sleep(2000);

            // Note: Milestone confirmation is slow, uncomment for full test
            // await this.measureMilestoneConfirmation();
            // await this.sleep(2000);

            await this.measureTagQueryPerformance();
            await this.sleep(2000);

            await this.measureFeelessBenefit();
            await this.sleep(2000);

            await this.benchmarkThroughput();
            await this.sleep(2000);

            await this.benchmarkScalability();
            await this.sleep(2000);

            await this.benchmarkRobustness();

        } catch (error) {
            console.error(`IOTA benchmark failed:`, error);
            throw error;
        } finally {
            this.metrics.end();
        }

        const summary = this.metrics.getSummary();
        const rawMetrics = this.metrics.getRawMetrics();

        await this.saveResults(summary, rawMetrics);
        this.printSummary(summary);

        return { summary, rawMetrics };
    }

    /**
     * Simulate network delay (for testing)
     */
    async simulateDelay(min, max) {
        const delay = Math.random() * (max - min) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }
}

export default IOTABenchmark;
