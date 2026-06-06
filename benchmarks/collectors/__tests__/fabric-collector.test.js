const { FabricBenchmark } = require('../fabric-collector.js');

describe('FabricBenchmark', () => {
    const config = {};
    let benchmark;

    beforeEach(() => {
        benchmark = new FabricBenchmark(config);
        benchmark.metrics = {
            recordConsensusLatency: jest.fn(),
            recordE2ELatency: jest.fn(),
            start: jest.fn(),
            end: jest.fn(),
            getSummary: jest.fn(() => ({ ok: true })),
            getRawMetrics: jest.fn(() => ({ raw: true }))
        };
        benchmark.saveResults = jest.fn();
        benchmark.printSummary = jest.fn();
        benchmark.warmup = jest.fn();
        benchmark.sleep = jest.fn();
        benchmark.benchmarkLatency = jest.fn();
        benchmark.benchmarkThroughput = jest.fn();
        benchmark.benchmarkScalability = jest.fn();
        benchmark.benchmarkRobustness = jest.fn();
    });

    test('initialize should initialize client', async () => {
        await benchmark.initialize();
        expect(benchmark.client).toBeDefined();
        expect(typeof benchmark.client.registerVehicle).toBe('function');
    });

    test('measureConsensusLatency records consensus latency', async () => {
        await benchmark.initialize();
        await benchmark.measureConsensusLatency();
        expect(benchmark.metrics.recordConsensusLatency).toHaveBeenCalled();
    });

    test('measureChannelPerformance records E2E latency', async () => {
        await benchmark.initialize();
        await benchmark.measureChannelPerformance();
        expect(benchmark.metrics.recordE2ELatency).toHaveBeenCalled();
    });

    test('run executes full benchmark', async () => {
        await benchmark.run();
        expect(benchmark.metrics.start).toHaveBeenCalled();
        expect(benchmark.metrics.end).toHaveBeenCalled();
        expect(benchmark.saveResults).toHaveBeenCalled();
        expect(benchmark.printSummary).toHaveBeenCalled();
    });
});
