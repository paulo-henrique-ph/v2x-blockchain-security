const { describe, test, expect, beforeEach } = require('@jest/globals');

// Mock chaincode logic
class MockChaincode {
    constructor() {
        this.vehicles = new Map();
        this.alerts = new Map();
    }
    async registerVehicle(id, publicKey) {
        if (this.vehicles.has(id)) throw new Error('Vehicle already exists');
        const vehicle = { id, publicKey, status: 'active', timestamp: Date.now() };
        this.vehicles.set(id, vehicle);
        return vehicle;
    }
    async queryVehicle(id) {
        return this.vehicles.get(id) || null;
    }
    async submitSecurityAlert(id, vehicleId, alertType, severity, description) {
        if (this.alerts.has(id)) throw new Error('Alert already exists');
        const alert = { id, vehicleId, alertType, severity, description, timestamp: Date.now() };
        this.alerts.set(id, alert);
        return alert;
    }
    async querySecurityAlert(id) {
        return this.alerts.get(id) || null;
    }
    async getAllSecurityAlerts() {
        return Array.from(this.alerts.values());
    }
    async measureThroughput(count) {
        const start = Date.now();
        for (let i = 0; i < count; i++) {
            await this.registerVehicle(`V${i}`, `PK${i}`);
        }
        const end = Date.now();
        return { txCount: count, durationMs: end - start };
    }
    async measureLatency() {
        const start = Date.now();
        await this.registerVehicle('LATENCY', 'PKLATENCY');
        const end = Date.now();
        return end - start;
    }
}

let chaincode;

beforeEach(() => {
    chaincode = new MockChaincode();
});

describe('Hyperledger Fabric ITS Chaincode Tests', () => {
    describe('Vehicle Registration', () => {
        test('should register a new vehicle', async () => {
            // Arrange
            const id = 'V1';
            const publicKey = 'PK1';
            // Act
            const vehicle = await chaincode.registerVehicle(id, publicKey);
            // Assert
            expect(vehicle).toHaveProperty('id', id);
            expect(vehicle).toHaveProperty('publicKey', publicKey);
        });

        test('should fail to register duplicate vehicle', async () => {
            // Arrange
            const id = 'V2';
            await chaincode.registerVehicle(id, 'PK2');
            // Act & Assert
            await expect(chaincode.registerVehicle(id, 'PK2')).rejects.toThrow('Vehicle already exists');
        });

        test('should query registered vehicle', async () => {
            // Arrange
            const id = 'V3';
            await chaincode.registerVehicle(id, 'PK3');
            // Act
            const vehicle = await chaincode.queryVehicle(id);
            // Assert
            expect(vehicle).not.toBeNull();
            expect(vehicle.id).toBe(id);
        });
    });

    describe('Security Alerts', () => {
        test('should submit a security alert', async () => {
            // Arrange
            const alertId = 'A1';
            const vehicleId = 'V4';
            await chaincode.registerVehicle(vehicleId, 'PK4');
            // Act
            const alert = await chaincode.submitSecurityAlert(alertId, vehicleId, 'TYPE', 'HIGH', 'desc');
            // Assert
            expect(alert).toHaveProperty('id', alertId);
            expect(alert).toHaveProperty('vehicleId', vehicleId);
        });

        test('should query security alert by ID', async () => {
            // Arrange
            const alertId = 'A2';
            const vehicleId = 'V5';
            await chaincode.registerVehicle(vehicleId, 'PK5');
            await chaincode.submitSecurityAlert(alertId, vehicleId, 'TYPE', 'LOW', 'desc');
            // Act
            const alert = await chaincode.querySecurityAlert(alertId);
            // Assert
            expect(alert).not.toBeNull();
            expect(alert.id).toBe(alertId);
        });

        test('should get all security alerts', async () => {
            // Arrange
            const vehicleId = 'V6';
            await chaincode.registerVehicle(vehicleId, 'PK6');
            await chaincode.submitSecurityAlert('A3', vehicleId, 'TYPE', 'MEDIUM', 'desc');
            await chaincode.submitSecurityAlert('A4', vehicleId, 'TYPE', 'HIGH', 'desc');
            // Act
            const alerts = await chaincode.getAllSecurityAlerts();
            // Assert
            expect(alerts.length).toBe(2);
            expect(alerts.map(a => a.id)).toEqual(expect.arrayContaining(['A3', 'A4']));
        });
    });

    describe('Performance Tests', () => {
        test('should measure transaction throughput', async () => {
            // Arrange
            const txCount = 10;
            // Act
            const result = await chaincode.measureThroughput(txCount);
            // Assert
            expect(result.txCount).toBe(txCount);
            expect(result.durationMs).toBeGreaterThanOrEqual(0);
        });

        test('should measure transaction latency', async () => {
            // Arrange
            // Act
            const latency = await chaincode.measureLatency();
            // Assert
            expect(latency).toBeGreaterThanOrEqual(0);
        });
    });
});
