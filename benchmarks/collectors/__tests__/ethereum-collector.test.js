const { EthereumBenchmark } = require('../ethereum-collector.js');

describe('EthereumBenchmark', () => {
    const config = { contractAddress: '0x123', privateKey: '0xabc' };
    let benchmark;

    beforeEach(() => {
        benchmark = new EthereumBenchmark(config);
        benchmark.metrics = {
            recordConsensusLatency: jest.fn(),
            recordE2ELatency: jest.fn(),
            recordQueryLatency: jest.fn(),
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
    });

    test('measureGasCosts returns gas costs', async () => {
        const gas = await benchmark.measureGasCosts();
        expect(gas.registerVehicle.length).toBe(50);
        expect(gas.submitAlert.length).toBe(50);
    });

    test('measureBlockConfirmation records latency', async () => {
        await benchmark.initialize();
        await benchmark.measureBlockConfirmation();
        expect(benchmark.metrics.recordConsensusLatency).toHaveBeenCalled();
    });

    test('measureContractCallOverhead records latencies', async () => {
        await benchmark.initialize();
        await benchmark.measureContractCallOverhead();
        expect(benchmark.metrics.recordE2ELatency).toHaveBeenCalled();
        expect(benchmark.metrics.recordQueryLatency).toHaveBeenCalled();
    });

    test('run executes full benchmark', async () => {
        await benchmark.run();
        expect(benchmark.metrics.start).toHaveBeenCalled();
        expect(benchmark.metrics.end).toHaveBeenCalled();
        expect(benchmark.saveResults).toHaveBeenCalled();
        expect(benchmark.printSummary).toHaveBeenCalled();
    });
});
