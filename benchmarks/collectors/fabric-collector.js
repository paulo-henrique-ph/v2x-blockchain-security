/**
 * Hyperledger Fabric Metrics Collector
 * Platform-specific implementation for collecting Fabric performance metrics
 */

import BenchmarkRunner from '../framework/benchmark-runner.js';

export class FabricBenchmark extends BenchmarkRunner {
    constructor(config) {
        super('hyperledger-fabric', config);
    }

    /**
     * Initialize Fabric client
     */
    async initialize() {
        let FabricClient;
        try {
            FabricClient = (await import('../../hyperledger-fabric/client/nodejs/index.js')).default;
        } catch (e) {
            FabricClient = null;
        }
        if (FabricClient) {
            this.client = new FabricClient();
            await this.client.connect();
        } else {
            console.log(`[Fabric] Using mock client (real client not found)`);
            this.client = {
                registerVehicle: async (vehicleId, publicKey) => {
                    await this.simulateDelay(50, 150);
                    return { vehicleId, publicKey };
                },
                submitSecurityAlert: async (alertId, vehicleId, type, severity, desc) => {
                    await this.simulateDelay(50, 150);
                    return { alertId, vehicleId, type, severity, desc };
                },
                getVehicle: async (vehicleId) => {
                    await this.simulateDelay(10, 50);
                    return { vehicleId };
                },
                getAllVehicles: async () => {
                    await this.simulateDelay(100, 200);
                    return [];
                }
            };
        }
        await super.initialize(this.client);
    }

    /**
     * Fabric-specific: measure consensus latency
     */
    async measureConsensusLatency() {
        console.log(`[Fabric] Measuring PBFT/RAFT consensus latency`);

        for (let i = 0; i < 50; i++) {
            const start = Date.now();

            // Submit transaction and wait for commit
            await this.client.registerVehicle(`CONSENSUS-TEST-${i}`, `0xCONS${i}`);

            const consensusLatency = Date.now() - start;
            this.metrics.recordConsensusLatency(consensusLatency);
        }
    }

    /**
     * Fabric-specific: measure channel performance
     */
    async measureChannelPerformance() {
        console.log(`[Fabric] Measuring private channel performance`);

        // Measure transaction latency on private channels
        const iterations = 100;
        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            await this.client.registerVehicle(`CHANNEL-TEST-${i}`, `0xCHAN${i}`);
            const latency = Date.now() - start;
            this.metrics.recordE2ELatency(latency);
        }
    }

    /**
     * Override run to include Fabric-specific tests
     */
    async run() {
        await this.initialize();

        console.log(`\n${'='.repeat(60)}`);
        console.log(`Starting Hyperledger Fabric Benchmark Suite`);
        console.log(`${'='.repeat(60)}\n`);

        this.metrics.start();

        try {
            await this.warmup();
            await this.sleep(2000);

            // Standard benchmarks
            await this.benchmarkLatency();
            await this.sleep(2000);

            // Fabric-specific benchmarks
            await this.measureConsensusLatency();
            await this.sleep(2000);

            await this.measureChannelPerformance();
            await this.sleep(2000);

            await this.benchmarkThroughput();
            await this.sleep(2000);

            await this.benchmarkScalability();
            await this.sleep(2000);

            await this.benchmarkRobustness();

        } catch (error) {
            console.error(`Fabric benchmark failed:`, error);
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

export default FabricBenchmark;
