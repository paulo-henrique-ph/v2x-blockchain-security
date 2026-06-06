/**
 * Load Generator for Benchmark Testing
 * Generates configurable load patterns for stress testing
 */

import { ScenarioGenerator } from './its-scenarios.js';

export class LoadGenerator {
    constructor(client, config = {}) {
        this.client = client;
        this.config = {
            pattern: config.pattern || 'constant', // constant, ramp-up, spike, wave
            baseRate: config.baseRate || 10, // messages per second
            duration: config.duration || 60000, // ms
            concurrency: config.concurrency || 1,
            scenario: config.scenario || 'criticalSafetyMessage',
            ...config
        };
        this.metrics = {
            sent: 0,
            successful: 0,
            failed: 0,
            latencies: [],
            errors: []
        };
    }

    /**
     * Generate constant load
     */
    async generateConstantLoad() {
        console.log(`Generating constant load: ${this.config.baseRate} msg/s for ${this.config.duration}ms`);

        const interval = 1000 / this.config.baseRate;
        const startTime = Date.now();

        while (Date.now() - startTime < this.config.duration) {
            await this.sendBatch(this.config.concurrency);
            await this.sleep(interval);
        }

        return this.getMetrics();
    }

    /**
     * Generate ramp-up load (linear increase)
     */
    async generateRampUpLoad() {
        const { baseRate, duration } = this.config;
        const maxRate = baseRate * 5; // 5x increase
        const steps = 10;
        const stepDuration = duration / steps;

        console.log(`Generating ramp-up load: ${baseRate} to ${maxRate} msg/s over ${duration}ms`);

        for (let step = 0; step < steps; step++) {
            const currentRate = baseRate + ((maxRate - baseRate) * step / steps);
            const interval = 1000 / currentRate;
            const stepStart = Date.now();

            console.log(`  Step ${step + 1}/${steps}: ${currentRate.toFixed(1)} msg/s`);

            while (Date.now() - stepStart < stepDuration) {
                await this.sendBatch(this.config.concurrency);
                await this.sleep(interval);
            }
        }

        return this.getMetrics();
    }

    /**
     * Generate spike load (sudden burst)
     */
    async generateSpikeLoad() {
        const { baseRate, duration } = this.config;
        const spikeRate = baseRate * 10; // 10x spike
        const spikeDuration = duration * 0.2; // 20% of total time

        console.log(`Generating spike load: ${baseRate} msg/s with ${spikeRate} msg/s spike`);

        // Normal load before spike
        await this.runLoadForDuration(baseRate, (duration - spikeDuration) / 2);

        // Spike
        console.log(`  SPIKE: ${spikeRate} msg/s`);
        await this.runLoadForDuration(spikeRate, spikeDuration);

        // Normal load after spike
        await this.runLoadForDuration(baseRate, (duration - spikeDuration) / 2);

        return this.getMetrics();
    }

    /**
     * Generate wave load (sinusoidal pattern)
     */
    async generateWaveLoad() {
        const { baseRate, duration } = this.config;
        const maxRate = baseRate * 3;
        const waveFrequency = 0.1; // Hz (10-second period)

        console.log(`Generating wave load: ${baseRate} to ${maxRate} msg/s (sinusoidal)`);

        const startTime = Date.now();

        while (Date.now() - startTime < duration) {
            const elapsed = (Date.now() - startTime) / 1000;
            const currentRate = baseRate + (maxRate - baseRate) *
                (Math.sin(2 * Math.PI * waveFrequency * elapsed) + 1) / 2;

            const interval = 1000 / currentRate;

            await this.sendBatch(this.config.concurrency);
            await this.sleep(interval);
        }

        return this.getMetrics();
    }

    /**
     * Run load at specific rate for duration
     */
    async runLoadForDuration(rate, duration) {
        const interval = 1000 / rate;
        const startTime = Date.now();

        while (Date.now() - startTime < duration) {
            await this.sendBatch(this.config.concurrency);
            await this.sleep(interval);
        }
    }

    /**
     * Send a batch of messages
     */
    async sendBatch(count) {
        const promises = [];

        for (let i = 0; i < count; i++) {
            promises.push(this.sendMessage());
        }

        await Promise.all(promises);
    }

    /**
     * Send a single message
     */
    async sendMessage() {
        const startTime = Date.now();
        this.metrics.sent++;

        try {
            const vehicleId = `LOAD-TEST-${this.metrics.sent}`;

            // Use appropriate client method based on scenario
            if (this.config.scenario === 'vehicleRegistration') {
                await this.client.registerVehicle(vehicleId, `0xKEY${this.metrics.sent}`);
            } else {
                await this.client.submitSecurityAlert(
                    `ALERT-${this.metrics.sent}`,
                    vehicleId,
                    'test-alert',
                    'medium',
                    'Load test message'
                );
            }

            const latency = Date.now() - startTime;
            this.metrics.latencies.push(latency);
            this.metrics.successful++;

        } catch (error) {
            this.metrics.failed++;
            this.metrics.errors.push({
                timestamp: Date.now(),
                error: error.message
            });
        }
    }

    /**
     * Execute load generation based on pattern
     */
    async run() {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Starting Load Generation`);
        console.log(`Pattern: ${this.config.pattern}`);
        console.log(`Scenario: ${this.config.scenario}`);
        console.log(`${'='.repeat(60)}\n`);

        const startTime = Date.now();

        switch (this.config.pattern) {
            case 'constant':
                await this.generateConstantLoad();
                break;
            case 'ramp-up':
                await this.generateRampUpLoad();
                break;
            case 'spike':
                await this.generateSpikeLoad();
                break;
            case 'wave':
                await this.generateWaveLoad();
                break;
            default:
                throw new Error(`Unknown load pattern: ${this.config.pattern}`);
        }

        const duration = Date.now() - startTime;

        console.log(`\nLoad generation completed in ${duration}ms`);
        this.printSummary();

        return this.getMetrics();
    }

    /**
     * Get collected metrics
     */
    getMetrics() {
        const latencies = this.metrics.latencies.sort((a, b) => a - b);
        const avgLatency = latencies.length > 0
            ? latencies.reduce((a, b) => a + b, 0) / latencies.length
            : 0;

        return {
            sent: this.metrics.sent,
            successful: this.metrics.successful,
            failed: this.metrics.failed,
            successRate: this.metrics.sent > 0
                ? (this.metrics.successful / this.metrics.sent) * 100
                : 0,
            latency: {
                min: latencies[0] || 0,
                max: latencies[latencies.length - 1] || 0,
                avg: avgLatency,
                p50: latencies[Math.floor(latencies.length * 0.5)] || 0,
                p95: latencies[Math.floor(latencies.length * 0.95)] || 0,
                p99: latencies[Math.floor(latencies.length * 0.99)] || 0
            },
            errors: this.metrics.errors
        };
    }

    /**
     * Print summary
     */
    printSummary() {
        const metrics = this.getMetrics();

        console.log(`\n📊 Load Generation Summary:`);
        console.log(`  Sent: ${metrics.sent}`);
        console.log(`  Successful: ${metrics.successful}`);
        console.log(`  Failed: ${metrics.failed}`);
        console.log(`  Success Rate: ${metrics.successRate.toFixed(2)}%`);
        console.log(`\n⏱️  Latency:`);
        console.log(`  Min: ${metrics.latency.min.toFixed(2)}ms`);
        console.log(`  Avg: ${metrics.latency.avg.toFixed(2)}ms`);
        console.log(`  P95: ${metrics.latency.p95.toFixed(2)}ms`);
        console.log(`  P99: ${metrics.latency.p99.toFixed(2)}ms`);
        console.log(`  Max: ${metrics.latency.max.toFixed(2)}ms`);

        if (metrics.errors.length > 0) {
            console.log(`\n❌ Errors (showing first 5):`);
            metrics.errors.slice(0, 5).forEach(err => {
                console.log(`  - ${err.error}`);
            });
        }
    }

    /**
     * Reset metrics
     */
    reset() {
        this.metrics = {
            sent: 0,
            successful: 0,
            failed: 0,
            latencies: [],
            errors: []
        };
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default LoadGenerator;
