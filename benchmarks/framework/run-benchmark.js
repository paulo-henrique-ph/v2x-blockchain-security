#!/usr/bin/env node

/**
 * Main Benchmark Runner Script
 * Entry point for running benchmarks
 */

import { Command } from 'commander';
import FabricBenchmark from '../collectors/fabric-collector.js';
import EthereumBenchmark from '../collectors/ethereum-collector.js';
import IOTABenchmark from '../collectors/iota-collector.js';

const program = new Command();

program
    .name('run-benchmark')
    .description('Run performance benchmarks for blockchain platforms')
    .version('1.0.0');

program
    .requiredOption('-p, --platform <type>', 'Platform to benchmark (fabric, ethereum, iota, all)')
    .option('-t, --transactions <number>', 'Number of test transactions', '100')
    .option('-c, --concurrency <number>', 'Concurrency level', '1')
    .option('-d, --duration <number>', 'Test duration in seconds', '60')
    .option('--warmup <number>', 'Number of warmup transactions', '10')
    .parse(process.argv);

const options = program.opts();

const config = {
    testTransactions: parseInt(options.transactions),
    concurrency: parseInt(options.concurrency),
    duration: parseInt(options.duration) * 1000,
    warmupTransactions: parseInt(options.warmup)
};

console.log('Benchmark Configuration:', config);

async function runBenchmark(platform) {
    let benchmark;

    switch (platform) {
        case 'fabric':
            benchmark = new FabricBenchmark(config);
            break;
        case 'ethereum':
            benchmark = new EthereumBenchmark(config);
            break;
        case 'iota':
            benchmark = new IOTABenchmark(config);
            break;
        default:
            throw new Error(`Unknown platform: ${platform}`);
    }

    return await benchmark.run();
}

async function main() {
    const platform = options.platform.toLowerCase();

    try {
        if (platform === 'all') {
            console.log('Running benchmarks for all platforms...\n');

            for (const p of ['fabric', 'ethereum', 'iota']) {
                console.log(`\n${'#'.repeat(80)}`);
                console.log(`# Running ${p.toUpperCase()} Benchmark`);
                console.log(`${'#'.repeat(80)}\n`);

                await runBenchmark(p);

                // Wait between platforms
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            console.log('\n✅ All benchmarks completed!');
        } else {
            await runBenchmark(platform);
            console.log('\n✅ Benchmark completed!');
        }

        console.log('\nNext steps:');
        console.log('  - Run: npm run analyze');
        console.log('  - Or: npm run report');

    } catch (error) {
        console.error('❌ Benchmark failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
