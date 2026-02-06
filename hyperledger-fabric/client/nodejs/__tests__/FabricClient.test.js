const FabricClient = require('../index');
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');

// Mock Fabric SDK
jest.mock('fabric-network');
jest.mock('fs');

describe('FabricClient', () => {
    let fabricClient;
    let mockGateway;
    let mockNetwork;
    let mockContract;
    let mockWallet;

    beforeEach(() => {
        // Arrange - Setup mocks
        mockContract = {
            submitTransaction: jest.fn(),
            evaluateTransaction: jest.fn()
        };

        mockNetwork = {
            getContract: jest.fn().mockReturnValue(mockContract),
            getChannel: jest.fn().mockReturnValue({
                getPeers: jest.fn().mockReturnValue([{}, {}, {}])
            })
        };

        mockGateway = {
            connect: jest.fn(),
            getNetwork: jest.fn().mockReturnValue(mockNetwork),
            disconnect: jest.fn()
        };

        mockWallet = {
            get: jest.fn().mockResolvedValue({ certificate: 'mock-cert' })
        };

        Gateway.mockImplementation(() => mockGateway);
        Wallets.newFileSystemWallet = jest.fn().mockResolvedValue(mockWallet);

        fs.existsSync = jest.fn().mockReturnValue(true);
        fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
            name: 'test-network',
            version: '1.0.0'
        }));

        fabricClient = new FabricClient({
            channelName: 'testchannel',
            chaincodeName: 'testchaincode'
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('connect', () => {
        it('should connect to Fabric network successfully', async () => {
            // Arrange
            // (mocks already arranged in beforeEach)

            // Act
            const result = await fabricClient.connect();

            // Assert
            expect(result).toBe(true);
            expect(mockGateway.connect).toHaveBeenCalled();
            expect(mockGateway.getNetwork).toHaveBeenCalledWith('testchannel');
            expect(mockNetwork.getContract).toHaveBeenCalledWith('testchaincode');
        });

        it('should throw error if connection profile not found', async () => {
            // Arrange
            fs.existsSync.mockReturnValue(false);

            // Act & Assert
            await expect(fabricClient.connect()).rejects.toThrow('Connection profile not found');
        });

        it('should throw error if identity not found in wallet', async () => {
            // Arrange
            mockWallet.get.mockResolvedValue(null);

            // Act & Assert
            await expect(fabricClient.connect()).rejects.toThrow('Identity');
            await expect(fabricClient.connect()).rejects.toThrow('not found in wallet');
        });
    });

    describe('registerVehicle', () => {
        beforeEach(async () => {
            await fabricClient.connect();
        });

        it('should register a new vehicle successfully', async () => {
            // Arrange
            const vehicleId = 'VEHICLE-001';
            const publicKey = 'mock-public-key';
            mockContract.submitTransaction.mockResolvedValue(Buffer.from('tx-123'));

            // Act
            const result = await fabricClient.registerVehicle(vehicleId, publicKey);

            // Assert
            expect(result.success).toBe(true);
            expect(result.vehicleId).toBe(vehicleId);
            expect(result.transactionId).toBe('tx-123');
            expect(mockContract.submitTransaction).toHaveBeenCalledWith(
                'RegisterVehicle',
                vehicleId,
                publicKey
            );
        });

        it('should throw error when not connected', async () => {
            // Arrange
            const disconnectedClient = new FabricClient();

            // Act & Assert
            await expect(disconnectedClient.registerVehicle('V1', 'key'))
                .rejects.toThrow('Not connected to Fabric network');
        });
    });

    describe('submitV2XMessage', () => {
        beforeEach(async () => {
            await fabricClient.connect();
        });

        it('should submit a valid V2X message successfully', async () => {
            // Arrange
            const message = {
                messageId: 'MSG-001',
                messageHash: 'hash123',
                messageType: 'EMERGENCY_BRAKE',
                senderId: 'VEHICLE-001',
                timestamp: new Date().toISOString(),
                priority: 0,
                location: { lat: -23.5505, lon: -46.6333 },
                signature: 'signature'
            };
            mockContract.submitTransaction.mockResolvedValue(Buffer.from('tx-456'));

            // Act
            const result = await fabricClient.submitV2XMessage(message);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messageId).toBe('MSG-001');
            expect(result.transactionId).toBe('tx-456');
            expect(result.latency).toBeDefined();
            expect(typeof result.latency).toBe('number');
            expect(mockContract.submitTransaction).toHaveBeenCalledWith(
                'SubmitV2XMessage',
                expect.any(String)
            );
        });

        it('should detect replay attack', async () => {
            // Arrange
            const message = {
                messageId: 'MSG-002',
                messageHash: 'hash456',
                messageType: 'ACCIDENT_ALERT',
                senderId: 'VEHICLE-002',
                timestamp: new Date().toISOString(),
                priority: 0
            };
            mockContract.submitTransaction.mockRejectedValue(
                new Error('message already exists (potential replay attack)')
            );

            // Act
            const result = await fabricClient.submitV2XMessage(message);

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('REPLAY_ATTACK_DETECTED');
        });

        it('should throw error for missing required fields', async () => {
            // Arrange
            const invalidMessage = {
                messageId: 'MSG-003'
                // Missing other required fields
            };

            // Act & Assert
            await expect(fabricClient.submitV2XMessage(invalidMessage))
                .rejects.toThrow('Missing required field');
        });

        it('should throw error for invalid priority', async () => {
            // Arrange
            const message = {
                messageId: 'MSG-004',
                messageHash: 'hash789',
                messageType: 'GENERAL_INFO',
                senderId: 'VEHICLE-004',
                timestamp: new Date().toISOString(),
                priority: 5 // Invalid priority
            };

            // Act & Assert
            await expect(fabricClient.submitV2XMessage(message))
                .rejects.toThrow('Invalid priority');
        });

        it('should accept valid scenario A message (critical)', async () => {
            // Arrange - Scenario A: Emergency brake (section 4.2)
            const criticalMessage = {
                messageId: 'MSG-CRITICAL-001',
                messageHash: 'hash-critical',
                messageType: 'EMERGENCY_BRAKE',
                senderId: 'VEHICLE-001',
                timestamp: new Date().toISOString(),
                priority: 0, // Critical priority
                location: { lat: -23.5505, lon: -46.6333 }
            };
            mockContract.submitTransaction.mockResolvedValue(Buffer.from('tx-critical'));

            // Act
            const result = await fabricClient.submitV2XMessage(criticalMessage);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messageId).toBe('MSG-CRITICAL-001');
        });

        it('should accept valid scenario B message (V2I)', async () => {
            // Arrange - Scenario B: Traffic light (section 4.2)
            const v2iMessage = {
                messageId: 'MSG-V2I-001',
                messageHash: 'hash-v2i',
                messageType: 'TRAFFIC_LIGHT',
                senderId: 'RSU-001',
                timestamp: new Date().toISOString(),
                priority: 1, // High priority
                location: { lat: -23.5505, lon: -46.6333 }
            };
            mockContract.submitTransaction.mockResolvedValue(Buffer.from('tx-v2i'));

            // Act
            const result = await fabricClient.submitV2XMessage(v2iMessage);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messageId).toBe('MSG-V2I-001');
        });

        it('should accept valid scenario C message (adverse conditions)', async () => {
            // Arrange - Scenario C: Road conditions (section 4.2)
            const adverseMessage = {
                messageId: 'MSG-ADVERSE-001',
                messageHash: 'hash-adverse',
                messageType: 'WET_ROAD',
                senderId: 'VEHICLE-003',
                timestamp: new Date().toISOString(),
                priority: 2, // Normal priority
                location: { lat: -23.5505, lon: -46.6333 }
            };
            mockContract.submitTransaction.mockResolvedValue(Buffer.from('tx-adverse'));

            // Act
            const result = await fabricClient.submitV2XMessage(adverseMessage);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messageId).toBe('MSG-ADVERSE-001');
        });
    });

    describe('getV2XMessage', () => {
        beforeEach(async () => {
            await fabricClient.connect();
        });

        it('should retrieve an existing message', async () => {
            // Arrange
            const messageId = 'MSG-001';
            const mockMessage = {
                messageId: 'MSG-001',
                messageType: 'EMERGENCY_BRAKE',
                status: 'validated'
            };
            mockContract.evaluateTransaction.mockResolvedValue(
                Buffer.from(JSON.stringify(mockMessage))
            );

            // Act
            const result = await fabricClient.getV2XMessage(messageId);

            // Assert
            expect(result.success).toBe(true);
            expect(result.message.messageId).toBe(messageId);
            expect(mockContract.evaluateTransaction).toHaveBeenCalledWith(
                'GetV2XMessage',
                messageId
            );
        });

        it('should return error for non-existent message', async () => {
            // Arrange
            const messageId = 'MSG-999';
            mockContract.evaluateTransaction.mockRejectedValue(
                new Error('message does not exist')
            );

            // Act
            const result = await fabricClient.getV2XMessage(messageId);

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('MESSAGE_NOT_FOUND');
            expect(result.messageId).toBe(messageId);
        });
    });

    describe('queryMessagesByType', () => {
        beforeEach(async () => {
            await fabricClient.connect();
        });

        it('should query messages by type successfully', async () => {
            // Arrange
            const messageType = 'EMERGENCY_BRAKE';
            const mockMessages = [
                { messageId: 'MSG-001', messageType: 'EMERGENCY_BRAKE' },
                { messageId: 'MSG-002', messageType: 'EMERGENCY_BRAKE' }
            ];
            mockContract.evaluateTransaction.mockResolvedValue(
                Buffer.from(JSON.stringify(mockMessages))
            );

            // Act
            const result = await fabricClient.queryMessagesByType(messageType);

            // Assert
            expect(result.success).toBe(true);
            expect(result.count).toBe(2);
            expect(result.messages).toHaveLength(2);
            expect(mockContract.evaluateTransaction).toHaveBeenCalledWith(
                'QueryMessagesByType',
                messageType
            );
        });
    });

    describe('queryMessagesBySender', () => {
        beforeEach(async () => {
            await fabricClient.connect();
        });

        it('should query messages by sender successfully', async () => {
            // Arrange
            const senderId = 'VEHICLE-001';
            const mockMessages = [
                { messageId: 'MSG-001', senderId: 'VEHICLE-001' },
                { messageId: 'MSG-002', senderId: 'VEHICLE-001' },
                { messageId: 'MSG-003', senderId: 'VEHICLE-001' }
            ];
            mockContract.evaluateTransaction.mockResolvedValue(
                Buffer.from(JSON.stringify(mockMessages))
            );

            // Act
            const result = await fabricClient.queryMessagesBySender(senderId);

            // Assert
            expect(result.success).toBe(true);
            expect(result.count).toBe(3);
            expect(result.messages).toHaveLength(3);
        });
    });

    describe('submitSecurityAlert', () => {
        beforeEach(async () => {
            await fabricClient.connect();
        });

        it('should submit a security alert successfully', async () => {
            // Arrange
            const alertId = 'ALERT-001';
            const vehicleId = 'VEHICLE-001';
            const alertType = 'MALICIOUS_BEHAVIOR';
            const severity = 'HIGH';
            const description = 'Suspicious activity detected';
            const timestamp = Date.now();
            mockContract.submitTransaction.mockResolvedValue(Buffer.from('tx-alert'));

            // Act
            const result = await fabricClient.submitSecurityAlert(
                alertId,
                vehicleId,
                alertType,
                severity,
                description,
                timestamp
            );

            // Assert
            expect(result.success).toBe(true);
            expect(result.alertId).toBe(alertId);
            expect(result.transactionId).toBe('tx-alert');
            expect(mockContract.submitTransaction).toHaveBeenCalledWith(
                'SubmitSecurityAlert',
                alertId,
                vehicleId,
                alertType,
                severity,
                description,
                timestamp.toString()
            );
        });
    });

    describe('getVehicle', () => {
        beforeEach(async () => {
            await fabricClient.connect();
        });

        it('should retrieve a vehicle successfully', async () => {
            // Arrange
            const vehicleId = 'VEHICLE-001';
            const mockVehicle = {
                id: vehicleId,
                publicKey: 'key123',
                status: 'active'
            };
            mockContract.evaluateTransaction.mockResolvedValue(
                Buffer.from(JSON.stringify(mockVehicle))
            );

            // Act
            const result = await fabricClient.getVehicle(vehicleId);

            // Assert
            expect(result.success).toBe(true);
            expect(result.vehicle.id).toBe(vehicleId);
        });

        it('should return error for non-existent vehicle', async () => {
            // Arrange
            const vehicleId = 'VEHICLE-999';
            mockContract.evaluateTransaction.mockRejectedValue(
                new Error('vehicle does not exist')
            );

            // Act
            const result = await fabricClient.getVehicle(vehicleId);

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('VEHICLE_NOT_FOUND');
        });
    });

    describe('getAllVehicles', () => {
        beforeEach(async () => {
            await fabricClient.connect();
        });

        it('should retrieve all vehicles successfully', async () => {
            // Arrange
            const mockVehicles = [
                { id: 'VEHICLE-001', status: 'active' },
                { id: 'VEHICLE-002', status: 'active' },
                { id: 'VEHICLE-003', status: 'active' }
            ];
            mockContract.evaluateTransaction.mockResolvedValue(
                Buffer.from(JSON.stringify(mockVehicles))
            );

            // Act
            const result = await fabricClient.getAllVehicles();

            // Assert
            expect(result.success).toBe(true);
            expect(result.count).toBe(3);
            expect(result.vehicles).toHaveLength(3);
        });
    });

    describe('getAllSecurityAlerts', () => {
        beforeEach(async () => {
            await fabricClient.connect();
        });

        it('should retrieve all security alerts successfully', async () => {
            // Arrange
            const mockAlerts = [
                { id: 'ALERT-001', severity: 'HIGH' },
                { id: 'ALERT-002', severity: 'MEDIUM' }
            ];
            mockContract.evaluateTransaction.mockResolvedValue(
                Buffer.from(JSON.stringify(mockAlerts))
            );

            // Act
            const result = await fabricClient.getAllSecurityAlerts();

            // Assert
            expect(result.success).toBe(true);
            expect(result.count).toBe(2);
            expect(result.alerts).toHaveLength(2);
        });
    });

    describe('collectMetrics', () => {
        beforeEach(async () => {
            await fabricClient.connect();
        });

        it('should collect performance metrics successfully', async () => {
            // Arrange - Section 5: Metrics collection
            // (network and channel mocks already set up)

            // Act
            const result = await fabricClient.collectMetrics();

            // Assert
            expect(result.success).toBe(true);
            expect(result.metrics).toBeDefined();
            expect(result.metrics.channelName).toBe('testchannel');
            expect(result.metrics.chaincodeName).toBe('testchaincode');
            expect(result.metrics.peerCount).toBe(3);
            expect(result.metrics.timestamp).toBeDefined();
        });
    });

    describe('disconnect', () => {
        it('should disconnect from network successfully', async () => {
            // Arrange
            await fabricClient.connect();

            // Act
            await fabricClient.disconnect();

            // Assert
            expect(mockGateway.disconnect).toHaveBeenCalled();
            expect(fabricClient.gateway).toBeNull();
            expect(fabricClient.network).toBeNull();
            expect(fabricClient.contract).toBeNull();
        });

        it('should handle disconnect when not connected', async () => {
            // Arrange
            // (client not connected)

            // Act & Assert
            await expect(fabricClient.disconnect()).resolves.not.toThrow();
        });
    });
});
