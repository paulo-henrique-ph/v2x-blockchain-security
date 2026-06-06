import IOTABenchmark from './iota-collector.js';

describe('IOTABenchmark initialize', () => {
    let benchmark;
    beforeEach(() => {
        benchmark = new IOTABenchmark({ mnemonic: 'test-mnemonic' });
        // Mock super.initialize to avoid side effects
        benchmark.__proto__.__proto__.initialize = jest.fn();
    });

    test('should initialize with mock client if real client not available', async () => {
        // Arrange
        // (No real IOTA client in test env)
        // Act
        await benchmark.initialize();
        // Assert
        expect(benchmark.client).toBeDefined();
        expect(typeof benchmark.client.registerVehicle).toBe('function');
        expect(typeof benchmark.client.submitSecurityAlert).toBe('function');
        expect(typeof benchmark.client.getVehicle).toBe('function');
        expect(typeof benchmark.client.getAllVehicles).toBe('function');
        expect(typeof benchmark.client.queryMessagesByTag).toBe('function');
    });

    test('mock client registerVehicle returns blockId', async () => {
        // Arrange
        await benchmark.initialize();
        // Act
        const result = await benchmark.client.registerVehicle('V1', 'PK1');
        // Assert
        expect(result).toHaveProperty('blockId');
        expect(typeof result.blockId).toBe('string');
    });

    test('mock client submitSecurityAlert returns blockId', async () => {
        // Arrange
        await benchmark.initialize();
        // Act
        const result = await benchmark.client.submitSecurityAlert('A1', 'V1', 'TYPE', 'HIGH', 'desc');
        // Assert
        expect(result).toHaveProperty('blockId');
        expect(typeof result.blockId).toBe('string');
    });

    test('mock client getVehicle returns vehicleId', async () => {
        // Arrange
        await benchmark.initialize();
        // Act
        const result = await benchmark.client.getVehicle('V2');
        // Assert
        expect(result).toHaveProperty('vehicleId', 'V2');
    });

    test('mock client getAllVehicles returns array', async () => {
        // Arrange
        await benchmark.initialize();
        // Act
        const result = await benchmark.client.getAllVehicles();
        // Assert
        expect(Array.isArray(result)).toBe(true);
    });

    test('mock client queryMessagesByTag returns array', async () => {
        // Arrange
        await benchmark.initialize();
        // Act
        const result = await benchmark.client.queryMessagesByTag('ITS_VEHICLE');
        // Assert
        expect(Array.isArray(result)).toBe(true);
    });
});
