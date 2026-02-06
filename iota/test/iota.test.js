import { jest } from '@jest/globals';
import IOTAClient from '../client/index.js';

// Mock @iota/sdk
jest.mock('@iota/sdk', () => ({
    Client: jest.fn(),
    utf8ToHex: jest.fn((str) => Buffer.from(str).toString('hex')),
    hexToUtf8: jest.fn((hex) => Buffer.from(hex, 'hex').toString('utf8'))
}));

describe('IOTAClient', () => {
    let iotaClient;
    let mockClient;

    beforeEach(() => {
        // Arrange - Setup mocks
        mockClient = {
            getInfo: jest.fn(),
            buildAndPostBlock: jest.fn(),
            getBlock: jest.fn(),
            getBlocksByTag: jest.fn()
        };

        const { Client } = require('@iota/sdk');
        Client.mockImplementation(() => mockClient);

        iotaClient = new IOTAClient('https://test.node.url');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should initialize IOTA client successfully', async () => {
            // Arrange
            const mockNodeInfo = {
                nodeInfo: {
                    name: 'Test Node',
                    protocol: {
                        networkName: 'testnet'
                    },
                    status: {
                        latestMilestone: {
                            index: 12345
                        }
                    }
                }
            };
            mockClient.getInfo.mockResolvedValue(mockNodeInfo);
            const mnemonic = 'test mnemonic phrase';

            // Act
            const result = await iotaClient.initialize(mnemonic);

            // Assert
            expect(result).toEqual(mockNodeInfo);
            expect(mockClient.getInfo).toHaveBeenCalled();
            expect(iotaClient.secretManager).toEqual({ mnemonic: mnemonic });
        });

        it('should throw error if connection fails', async () => {
            // Arrange
            mockClient.getInfo.mockRejectedValue(new Error('Connection failed'));

            // Act & Assert
            await expect(iotaClient.initialize('mnemonic')).rejects.toThrow('Connection failed');
        });
    });

    describe('registerVehicle', () => {
        beforeEach(async () => {
            mockClient.getInfo.mockResolvedValue({
                nodeInfo: {
                    name: 'Test',
                    protocol: { networkName: 'test' },
                    status: { latestMilestone: { index: 1 } }
                }
            });
            await iotaClient.initialize('test mnemonic');
        });

        it('should register a new vehicle successfully', async () => {
            // Arrange
            const vehicleId = 'VEHICLE-001';
            const publicKey = 'mock-public-key';
            const mockBlockId = 'block-id-12345';
            mockClient.buildAndPostBlock.mockResolvedValue([mockBlockId]);

            // Act
            const result = await iotaClient.registerVehicle(vehicleId, publicKey);

            // Assert
            expect(result.blockId).toBe(mockBlockId);
            expect(result.vehicleId).toBe(vehicleId);
            expect(result.timestamp).toBeDefined();
            expect(mockClient.buildAndPostBlock).toHaveBeenCalled();
        });

        it('should throw error if registration fails', async () => {
            // Arrange
            mockClient.buildAndPostBlock.mockRejectedValue(new Error('Post failed'));

            // Act & Assert
            await expect(iotaClient.registerVehicle('V1', 'key')).rejects.toThrow('Post failed');
        });
    });

    describe('submitV2XMessage', () => {
        beforeEach(async () => {
            mockClient.getInfo.mockResolvedValue({
                nodeInfo: {
                    name: 'Test',
                    protocol: { networkName: 'test' },
                    status: { latestMilestone: { index: 1 } }
                }
            });
            await iotaClient.initialize('test mnemonic');
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
            const mockBlockId = 'block-v2x-12345';
            mockClient.buildAndPostBlock.mockResolvedValue([mockBlockId]);

            // Act
            const result = await iotaClient.submitV2XMessage(message);

            // Assert
            expect(result.success).toBe(true);
            expect(result.blockId).toBe(mockBlockId);
            expect(result.messageId).toBe('MSG-001');
            expect(result.latency).toBeDefined();
            expect(typeof result.latency).toBe('number');
            expect(mockClient.buildAndPostBlock).toHaveBeenCalled();
        });

        it('should throw error for missing required fields', async () => {
            // Arrange
            const invalidMessage = {
                messageId: 'MSG-002'
                // Missing other required fields
            };

            // Act & Assert
            await expect(iotaClient.submitV2XMessage(invalidMessage))
                .rejects.toThrow('Missing required field');
        });

        it('should throw error for invalid priority', async () => {
            // Arrange
            const message = {
                messageId: 'MSG-003',
                messageHash: 'hash',
                messageType: 'TEST',
                senderId: 'V1',
                priority: 5 // Invalid
            };

            // Act & Assert
            await expect(iotaClient.submitV2XMessage(message))
                .rejects.toThrow('Invalid priority');
        });

        it('should accept valid scenario A message (critical)', async () => {
            // Arrange - Scenario A: Emergency brake
            const criticalMessage = {
                messageId: 'MSG-CRITICAL-001',
                messageHash: 'hash-critical',
                messageType: 'EMERGENCY_BRAKE',
                senderId: 'VEHICLE-001',
                timestamp: new Date().toISOString(),
                priority: 0,
                location: { lat: -23.5505, lon: -46.6333 }
            };
            mockClient.buildAndPostBlock.mockResolvedValue(['block-critical']);

            // Act
            const result = await iotaClient.submitV2XMessage(criticalMessage);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messageId).toBe('MSG-CRITICAL-001');
        });

        it('should accept valid scenario B message (V2I)', async () => {
            // Arrange - Scenario B: Traffic light
            const v2iMessage = {
                messageId: 'MSG-V2I-001',
                messageHash: 'hash-v2i',
                messageType: 'TRAFFIC_LIGHT',
                senderId: 'RSU-001',
                timestamp: new Date().toISOString(),
                priority: 1,
                location: { lat: -23.5505, lon: -46.6333 }
            };
            mockClient.buildAndPostBlock.mockResolvedValue(['block-v2i']);

            // Act
            const result = await iotaClient.submitV2XMessage(v2iMessage);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messageId).toBe('MSG-V2I-001');
        });

        it('should accept valid scenario C message (adverse conditions)', async () => {
            // Arrange - Scenario C: Road conditions
            const adverseMessage = {
                messageId: 'MSG-ADVERSE-001',
                messageHash: 'hash-adverse',
                messageType: 'WET_ROAD',
                senderId: 'VEHICLE-003',
                timestamp: new Date().toISOString(),
                priority: 2,
                location: { lat: -23.5505, lon: -46.6333 }
            };
            mockClient.buildAndPostBlock.mockResolvedValue(['block-adverse']);

            // Act
            const result = await iotaClient.submitV2XMessage(adverseMessage);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messageId).toBe('MSG-ADVERSE-001');
        });
    });

    describe('submitSecurityAlert', () => {
        beforeEach(async () => {
            mockClient.getInfo.mockResolvedValue({
                nodeInfo: {
                    name: 'Test',
                    protocol: { networkName: 'test' },
                    status: { latestMilestone: { index: 1 } }
                }
            });
            await iotaClient.initialize('test mnemonic');
        });

        it('should submit a security alert successfully', async () => {
            // Arrange
            const alertId = 'ALERT-001';
            const vehicleId = 'VEHICLE-001';
            const alertType = 'MALICIOUS_BEHAVIOR';
            const severity = 'HIGH';
            const description = 'Suspicious activity detected';
            mockClient.buildAndPostBlock.mockResolvedValue(['alert-block-123']);

            // Act
            const result = await iotaClient.submitSecurityAlert(
                alertId,
                vehicleId,
                alertType,
                severity,
                description
            );

            // Assert
            expect(result.blockId).toBe('alert-block-123');
            expect(result.alertId).toBe(alertId);
            expect(result.timestamp).toBeDefined();
        });
    });

    describe('queryBlock', () => {
        beforeEach(async () => {
            mockClient.getInfo.mockResolvedValue({
                nodeInfo: {
                    name: 'Test',
                    protocol: { networkName: 'test' },
                    status: { latestMilestone: { index: 1 } }
                }
            });
            await iotaClient.initialize('test mnemonic');
        });

        it('should query a block with tagged data successfully', async () => {
            // Arrange
            const blockId = 'block-123';
            const mockBlock = {
                payload: {
                    tag: Buffer.from('ITS_V2X').toString('hex'),
                    data: Buffer.from(JSON.stringify({
                        type: 'V2X_MESSAGE',
                        messageId: 'MSG-001'
                    })).toString('hex')
                }
            };
            mockClient.getBlock.mockResolvedValue(mockBlock);

            // Act
            const result = await iotaClient.queryBlock(blockId);

            // Assert
            expect(result.blockId).toBe(blockId);
            expect(result.tag).toBe('ITS_V2X');
            expect(result.data.messageId).toBe('MSG-001');
        });

        it('should query a block without tagged data', async () => {
            // Arrange
            const blockId = 'block-456';
            const mockBlock = {
                payload: {}
            };
            mockClient.getBlock.mockResolvedValue(mockBlock);

            // Act
            const result = await iotaClient.queryBlock(blockId);

            // Assert
            expect(result.blockId).toBe(blockId);
            expect(result.block).toBeDefined();
        });
    });

    describe('queryMessagesByTag', () => {
        beforeEach(async () => {
            mockClient.getInfo.mockResolvedValue({
                nodeInfo: {
                    name: 'Test',
                    protocol: { networkName: 'test' },
                    status: { latestMilestone: { index: 1 } }
                }
            });
            await iotaClient.initialize('test mnemonic');
        });

        it('should query messages by tag successfully', async () => {
            // Arrange
            const tag = 'ITS_V2X';
            const mockBlockIds = ['block-1', 'block-2'];
            mockClient.getBlocksByTag.mockResolvedValue(mockBlockIds);

            const mockBlock1 = {
                payload: {
                    tag: Buffer.from(tag).toString('hex'),
                    data: Buffer.from(JSON.stringify({ type: 'V2X_MESSAGE', messageId: 'MSG-1' })).toString('hex')
                }
            };
            const mockBlock2 = {
                payload: {
                    tag: Buffer.from(tag).toString('hex'),
                    data: Buffer.from(JSON.stringify({ type: 'V2X_MESSAGE', messageId: 'MSG-2' })).toString('hex')
                }
            };

            mockClient.getBlock.mockResolvedValueOnce(mockBlock1).mockResolvedValueOnce(mockBlock2);

            // Act
            const result = await iotaClient.queryMessagesByTag(tag);

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0].data.messageId).toBe('MSG-1');
            expect(result[1].data.messageId).toBe('MSG-2');
        });

        it('should return empty array for non-existent tag', async () => {
            // Arrange
            mockClient.getBlocksByTag.mockResolvedValue([]);

            // Act
            const result = await iotaClient.queryMessagesByTag('NONEXISTENT');

            // Assert
            expect(result).toHaveLength(0);
        });
    });

    describe('getV2XMessage', () => {
        beforeEach(async () => {
            mockClient.getInfo.mockResolvedValue({
                nodeInfo: {
                    name: 'Test',
                    protocol: { networkName: 'test' },
                    status: { latestMilestone: { index: 1 } }
                }
            });
            await iotaClient.initialize('test mnemonic');
        });

        it('should retrieve an existing V2X message', async () => {
            // Arrange
            const messageId = 'MSG-001';
            mockClient.getBlocksByTag.mockResolvedValue(['block-1']);
            mockClient.getBlock.mockResolvedValue({
                payload: {
                    tag: Buffer.from('ITS_V2X').toString('hex'),
                    data: Buffer.from(JSON.stringify({
                        type: 'V2X_MESSAGE',
                        messageId: messageId,
                        messageType: 'EMERGENCY_BRAKE'
                    })).toString('hex')
                }
            });

            // Act
            const result = await iotaClient.getV2XMessage(messageId);

            // Assert
            expect(result.success).toBe(true);
            expect(result.message.messageId).toBe(messageId);
        });

        it('should return error for non-existent message', async () => {
            // Arrange
            mockClient.getBlocksByTag.mockResolvedValue([]);

            // Act
            const result = await iotaClient.getV2XMessage('MSG-999');

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('MESSAGE_NOT_FOUND');
        });
    });

    describe('queryV2XMessagesByType', () => {
        beforeEach(async () => {
            mockClient.getInfo.mockResolvedValue({
                nodeInfo: {
                    name: 'Test',
                    protocol: { networkName: 'test' },
                    status: { latestMilestone: { index: 1 } }
                }
            });
            await iotaClient.initialize('test mnemonic');
        });

        it('should query messages by type successfully', async () => {
            // Arrange
            const messageType = 'EMERGENCY_BRAKE';
            mockClient.getBlocksByTag.mockResolvedValue(['block-1', 'block-2']);

            mockClient.getBlock
                .mockResolvedValueOnce({
                    payload: {
                        tag: Buffer.from('ITS_V2X').toString('hex'),
                        data: Buffer.from(JSON.stringify({
                            type: 'V2X_MESSAGE',
                            messageId: 'MSG-1',
                            messageType: 'EMERGENCY_BRAKE'
                        })).toString('hex')
                    }
                })
                .mockResolvedValueOnce({
                    payload: {
                        tag: Buffer.from('ITS_V2X').toString('hex'),
                        data: Buffer.from(JSON.stringify({
                            type: 'V2X_MESSAGE',
                            messageId: 'MSG-2',
                            messageType: 'ROAD_CONDITION'
                        })).toString('hex')
                    }
                });

            // Act
            const result = await iotaClient.queryV2XMessagesByType(messageType);

            // Assert
            expect(result.success).toBe(true);
            expect(result.count).toBe(1);
            expect(result.messages[0].messageType).toBe('EMERGENCY_BRAKE');
        });
    });

    describe('queryV2XMessagesBySender', () => {
        beforeEach(async () => {
            mockClient.getInfo.mockResolvedValue({
                nodeInfo: {
                    name: 'Test',
                    protocol: { networkName: 'test' },
                    status: { latestMilestone: { index: 1 } }
                }
            });
            await iotaClient.initialize('test mnemonic');
        });

        it('should query messages by sender successfully', async () => {
            // Arrange
            const senderId = 'VEHICLE-001';
            mockClient.getBlocksByTag.mockResolvedValue(['block-1', 'block-2']);

            mockClient.getBlock
                .mockResolvedValueOnce({
                    payload: {
                        tag: Buffer.from('ITS_V2X').toString('hex'),
                        data: Buffer.from(JSON.stringify({
                            type: 'V2X_MESSAGE',
                            messageId: 'MSG-1',
                            senderId: 'VEHICLE-001'
                        })).toString('hex')
                    }
                })
                .mockResolvedValueOnce({
                    payload: {
                        tag: Buffer.from('ITS_V2X').toString('hex'),
                        data: Buffer.from(JSON.stringify({
                            type: 'V2X_MESSAGE',
                            messageId: 'MSG-2',
                            senderId: 'VEHICLE-002'
                        })).toString('hex')
                    }
                });

            // Act
            const result = await iotaClient.queryV2XMessagesBySender(senderId);

            // Assert
            expect(result.success).toBe(true);
            expect(result.count).toBe(1);
            expect(result.messages[0].senderId).toBe('VEHICLE-001');
        });
    });

    describe('getAllVehicles', () => {
        beforeEach(async () => {
            mockClient.getInfo.mockResolvedValue({
                nodeInfo: {
                    name: 'Test',
                    protocol: { networkName: 'test' },
                    status: { latestMilestone: { index: 1 } }
                }
            });
            await iotaClient.initialize('test mnemonic');
        });

        it('should retrieve all registered vehicles', async () => {
            // Arrange
            mockClient.getBlocksByTag.mockResolvedValue(['block-1', 'block-2']);
            mockClient.getBlock
                .mockResolvedValueOnce({
                    payload: {
                        tag: Buffer.from('ITS_VEHICLE').toString('hex'),
                        data: Buffer.from(JSON.stringify({
                            type: 'VEHICLE_REGISTRATION',
                            vehicleId: 'VEHICLE-001',
                            publicKey: 'key1'
                        })).toString('hex')
                    }
                })
                .mockResolvedValueOnce({
                    payload: {
                        tag: Buffer.from('ITS_VEHICLE').toString('hex'),
                        data: Buffer.from(JSON.stringify({
                            type: 'VEHICLE_REGISTRATION',
                            vehicleId: 'VEHICLE-002',
                            publicKey: 'key2'
                        })).toString('hex')
                    }
                });

            // Act
            const result = await iotaClient.getAllVehicles();

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0].vehicleId).toBe('VEHICLE-001');
            expect(result[1].vehicleId).toBe('VEHICLE-002');
        });
    });

    describe('getNetworkHealth', () => {
        beforeEach(async () => {
            mockClient.getInfo.mockResolvedValue({
                nodeInfo: {
                    name: 'Test',
                    protocol: { networkName: 'test' },
                    status: {
                        isHealthy: true,
                        latestMilestone: { index: 12345 },
                        confirmedMilestone: { index: 12340 }
                    },
                    metrics: {
                        messagesPerSecond: 150.5,
                        referencedRate: 98.5
                    }
                }
            });
            await iotaClient.initialize('test mnemonic');
        });

        it('should retrieve network health metrics', async () => {
            // Arrange & Act
            const result = await iotaClient.getNetworkHealth();

            // Assert
            expect(result.isHealthy).toBe(true);
            expect(result.latestMilestone).toBe(12345);
            expect(result.confirmedMilestone).toBe(12340);
            expect(result.messagesPerSecond).toBe(150.5);
            expect(result.referencedRate).toBe(98.5);
        });
    });

    describe('getVehicle', () => {
        beforeEach(async () => {
            mockClient.getInfo.mockResolvedValue({
                nodeInfo: {
                    name: 'Test',
                    protocol: { networkName: 'test' },
                    status: { latestMilestone: { index: 1 } }
                }
            });
            await iotaClient.initialize('test mnemonic');
        });

        it('should retrieve a specific vehicle by ID', async () => {
            // Arrange
            const vehicleId = 'VEHICLE-001';
            mockClient.getBlocksByTag.mockResolvedValue(['block-1']);
            mockClient.getBlock.mockResolvedValue({
                payload: {
                    tag: Buffer.from('ITS_VEHICLE').toString('hex'),
                    data: Buffer.from(JSON.stringify({
                        type: 'VEHICLE_REGISTRATION',
                        vehicleId: vehicleId,
                        publicKey: 'key123'
                    })).toString('hex')
                }
            });

            // Act
            const result = await iotaClient.getVehicle(vehicleId);

            // Assert
            expect(result).toBeDefined();
            expect(result.vehicleId).toBe(vehicleId);
        });

        it('should return null for non-existent vehicle', async () => {
            // Arrange
            mockClient.getBlocksByTag.mockResolvedValue([]);

            // Act
            const result = await iotaClient.getVehicle('VEHICLE-999');

            // Assert
            expect(result).toBeNull();
        });
    });
});
