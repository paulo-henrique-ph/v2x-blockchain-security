import { Client, utf8ToHex, hexToUtf8 } from '@iota/sdk';

/**
 * IOTA Client for ITS Security System
 * Uses IOTA Tangle (DAG) for vehicle registration and security alerts
 */
class IOTAClient {
    constructor(nodeUrl = 'https://api.testnet.shimmer.network') {
        this.nodeUrl = nodeUrl;
        this.client = null;
        this.secretManager = null;
    }

    /**
     * Initialize the IOTA client
     * @param {string} mnemonic - BIP39 mnemonic phrase for wallet
     */
    async initialize(mnemonic) {
        try {
            // Initialize client
            this.client = new Client({
                nodes: [this.nodeUrl],
                localPow: true,
            });

            // Initialize secret manager with mnemonic
            if (mnemonic) {
                this.secretManager = {
                    mnemonic: mnemonic
                };
            }

            // Get node info to verify connection
            const nodeInfo = await this.client.getInfo();
            console.log(`Connected to IOTA node: ${nodeInfo.nodeInfo.name}`);
            console.log(`Network: ${nodeInfo.nodeInfo.protocol.networkName}`);
            console.log(`Latest milestone: ${nodeInfo.nodeInfo.status.latestMilestone.index}`);

            return nodeInfo;
        } catch (error) {
            console.error(`Failed to initialize IOTA client: ${error.message}`);
            throw error;
        }
    }

    /**
     * Register a new vehicle by creating a tagged data message
     * @param {string} vehicleId - Unique vehicle identifier
     * @param {string} publicKey - Vehicle's public key
     * @returns {Object} Block ID and message details
     */
    async registerVehicle(vehicleId, publicKey) {
        const startTime = Date.now();
        let span = null;

        try {
            // Start tracing span
            span = this.telemetry?.startSpan('registerVehicle', {
                'vehicle.id': vehicleId,
                'blockchain.platform': 'iota-tangle',
            });

            console.log(`Registering vehicle: ${vehicleId}`);

            const vehicleData = {
                type: 'VEHICLE_REGISTRATION',
                vehicleId: vehicleId,
                publicKey: publicKey,
                timestamp: Date.now(),
            };

            // Convert data to tagged data payload
            const tag = utf8ToHex('ITS_VEHICLE');
            const data = utf8ToHex(JSON.stringify(vehicleData));

            // Build and submit block
            const block = await this.client.buildAndPostBlock(
                this.secretManager,
                {
                    tag: tag,
                    data: data,
                }
            );

            console.log(`Vehicle registered. Block ID: ${block[0]}`);

            return {
                blockId: block[0],
                vehicleId: vehicleId,
                timestamp: vehicleData.timestamp
            };
        } catch (error) {
            console.error(`Failed to register vehicle: ${error.message}`);
            throw error;
        }
    }

    /**
     * Submit a V2X message to the Tangle
     * Implements the core functionality for V2V/V2I communication
     *
     * @param {Object} message - V2X message object
     * @returns {Object} Block ID and message details
     */
    async submitV2XMessage(message) {
        try {
            console.log(`Submitting V2X message: ${message.messageId}`);

            // Validate message structure
            this._validateV2XMessage(message);

            const messageData = {
                type: 'V2X_MESSAGE',
                messageId: message.messageId,
                messageHash: message.messageHash,
                messageType: message.messageType,
                senderId: message.senderId,
                timestamp: message.timestamp || new Date().toISOString(),
                priority: message.priority,
                location: message.location,
                signature: message.signature,
                status: 'submitted'
            };

            // Convert data to tagged data payload
            const tag = utf8ToHex('ITS_V2X');
            const data = utf8ToHex(JSON.stringify(messageData));

            const startTime = Date.now();

            // Build and submit block
            const block = await this.client.buildAndPostBlock(
                this.secretManager,
                {
                    tag: tag,
                    data: data,
                }
            );

            const latency = Date.now() - startTime;

            console.log(`V2X message submitted. Block ID: ${block[0]} (${latency}ms)`);

            return {
                success: true,
                blockId: block[0],
                messageId: message.messageId,
                latency: latency,
                timestamp: messageData.timestamp
            };
        } catch (error) {
            console.error(`Failed to submit V2X message: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get V2X message by message ID
     * @param {string} messageId - Message identifier
     * @returns {Object} Message data or null
     */
    async getV2XMessage(messageId) {
        try {
            const messages = await this.getAllV2XMessages();
            const found = messages.find(m => m.messageId === messageId);

            if (found) {
                return {
                    success: true,
                    message: found
                };
            }

            return {
                success: false,
                error: 'MESSAGE_NOT_FOUND',
                messageId: messageId
            };
        } catch (error) {
            console.error(`Failed to get V2X message: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all V2X messages
     * @returns {Array} Array of V2X messages
     */
    async getAllV2XMessages() {
        try {
            console.log('Getting all V2X messages');

            const messages = await this.queryMessagesByTag('ITS_V2X');

            return messages
                .filter(msg => msg.data && msg.data.type === 'V2X_MESSAGE')
                .map(msg => ({
                    blockId: msg.blockId,
                    messageId: msg.data.messageId,
                    messageHash: msg.data.messageHash,
                    messageType: msg.data.messageType,
                    senderId: msg.data.senderId,
                    timestamp: msg.data.timestamp,
                    priority: msg.data.priority,
                    location: msg.data.location,
                    status: msg.data.status
                }));
        } catch (error) {
            console.error(`Failed to get all V2X messages: ${error.message}`);
            throw error;
        }
    }

    /**
     * Query V2X messages by type (for analysis)
     * @param {string} messageType - Type of message
     * @returns {Array} Array of messages
     */
    async queryV2XMessagesByType(messageType) {
        try {
            const allMessages = await this.getAllV2XMessages();
            const filtered = allMessages.filter(m => m.messageType === messageType);

            return {
                success: true,
                count: filtered.length,
                messages: filtered
            };
        } catch (error) {
            console.error(`Failed to query messages by type: ${error.message}`);
            throw error;
        }
    }

    /**
     * Query V2X messages by sender (for analysis)
     * @param {string} senderId - Sender vehicle ID
     * @returns {Array} Array of messages
     */
    async queryV2XMessagesBySender(senderId) {
        try {
            const allMessages = await this.getAllV2XMessages();
            const filtered = allMessages.filter(m => m.senderId === senderId);

            return {
                success: true,
                count: filtered.length,
                messages: filtered
            };
        } catch (error) {
            console.error(`Failed to query messages by sender: ${error.message}`);
            throw error;
        }
    }

    /**
     * Validate V2X message structure
     * @private
     */
    _validateV2XMessage(message) {
        const requiredFields = [
            'messageId',
            'messageHash',
            'messageType',
            'senderId',
            'priority'
        ];

        for (const field of requiredFields) {
            if (message[field] === undefined && message[field] !== 0) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate message types according to scenarios (section 4.2)
        const validTypes = [
            'EMERGENCY_BRAKE',
            'ACCIDENT_ALERT',
            'TRAFFIC_LIGHT',
            'PRIORITY_REQUEST',
            'ROAD_CONDITION',
            'LOW_VISIBILITY',
            'WET_ROAD',
            'GENERAL_INFO'
        ];

        if (!validTypes.includes(message.messageType)) {
            console.warn(`Unknown message type: ${message.messageType}`);
        }

        // Validate priority levels
        if (message.priority < 0 || message.priority > 2) {
            throw new Error(`Invalid priority: ${message.priority}. Must be 0 (critical), 1 (high), or 2 (normal)`);
        }
    }

    /**
     * Submit a security alert to the Tangle
     * @param {string} alertId - Unique alert identifier
     * @param {string} vehicleId - Vehicle submitting the alert
     * @param {string} alertType - Type of security alert
     * @param {string} severity - Severity level
     * @param {string} description - Alert description
     * @returns {Object} Block ID and message details
     */
    async submitSecurityAlert(alertId, vehicleId, alertType, severity, description) {
        try {
            console.log(`Submitting security alert: ${alertId}`);

            const alertData = {
                type: 'SECURITY_ALERT',
                alertId: alertId,
                vehicleId: vehicleId,
                alertType: alertType,
                severity: severity,
                description: description,
                timestamp: Date.now(),
            };

            // Convert data to tagged data payload
            const tag = utf8ToHex('ITS_ALERT');
            const data = utf8ToHex(JSON.stringify(alertData));

            // Build and submit block
            const block = await this.client.buildAndPostBlock(
                this.secretManager,
                {
                    tag: tag,
                    data: data,
                }
            );

            console.log(`Security alert submitted. Block ID: ${block[0]}`);

            return {
                blockId: block[0],
                alertId: alertId,
                timestamp: alertData.timestamp
            };
        } catch (error) {
            console.error(`Failed to submit security alert: ${error.message}`);
            throw error;
        }
    }

    /**
     * Query a block by ID
     * @param {string} blockId - Block identifier
     * @returns {Object} Block data
     */
    async queryBlock(blockId) {
        try {
            console.log(`Querying block: ${blockId}`);

            const block = await this.client.getBlock(blockId);

            // Extract tagged data if present
            if (block.payload?.tag && block.payload?.data) {
                const tag = hexToUtf8(block.payload.tag);
                const data = JSON.parse(hexToUtf8(block.payload.data));

                return {
                    blockId: blockId,
                    tag: tag,
                    data: data,
                    block: block
                };
            }

            return {
                blockId: blockId,
                block: block
            };
        } catch (error) {
            console.error(`Failed to query block: ${error.message}`);
            throw error;
        }
    }

    /**
     * Query all messages with a specific tag
     * @param {string} tag - Tag to search for (e.g., 'ITS_VEHICLE', 'ITS_ALERT')
     * @returns {Array} Array of messages with the specified tag
     */
    async queryMessagesByTag(tag) {
        try {
            console.log(`Querying messages with tag: ${tag}`);

            const hexTag = utf8ToHex(tag);
            const blockIds = await this.client.getBlocksByTag(hexTag);

            console.log(`Found ${blockIds.length} blocks with tag ${tag}`);

            const messages = [];
            for (const blockId of blockIds) {
                try {
                    const blockData = await this.queryBlock(blockId);
                    messages.push(blockData);
                } catch (error) {
                    console.error(`Failed to fetch block ${blockId}: ${error.message}`);
                }
            }

            return messages;
        } catch (error) {
            console.error(`Failed to query messages by tag: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all registered vehicles
     * @returns {Array} Array of vehicle registrations
     */
    async getAllVehicles() {
        try {
            console.log('Getting all registered vehicles');

            const messages = await this.queryMessagesByTag('ITS_VEHICLE');

            return messages
                .filter(msg => msg.data && msg.data.type === 'VEHICLE_REGISTRATION')
                .map(msg => ({
                    blockId: msg.blockId,
                    vehicleId: msg.data.vehicleId,
                    publicKey: msg.data.publicKey,
                    timestamp: msg.data.timestamp
                }));
        } catch (error) {
            console.error(`Failed to get all vehicles: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all security alerts
     * @returns {Array} Array of security alerts
     */
    async getAllSecurityAlerts() {
        try {
            console.log('Getting all security alerts');

            const messages = await this.queryMessagesByTag('ITS_ALERT');

            return messages
                .filter(msg => msg.data && msg.data.type === 'SECURITY_ALERT')
                .map(msg => ({
                    blockId: msg.blockId,
                    alertId: msg.data.alertId,
                    vehicleId: msg.data.vehicleId,
                    alertType: msg.data.alertType,
                    severity: msg.data.severity,
                    description: msg.data.description,
                    timestamp: msg.data.timestamp
                }));
        } catch (error) {
            console.error(`Failed to get all security alerts: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get vehicle by ID
     * @param {string} vehicleId - Vehicle identifier
     * @returns {Object} Vehicle data or null
     */
    async getVehicle(vehicleId) {
        try {
            const vehicles = await this.getAllVehicles();
            return vehicles.find(v => v.vehicleId === vehicleId) || null;
        } catch (error) {
            console.error(`Failed to get vehicle: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get security alert by ID
     * @param {string} alertId - Alert identifier
     * @returns {Object} Alert data or null
     */
    async getSecurityAlert(alertId) {
        try {
            const alerts = await this.getAllSecurityAlerts();
            return alerts.find(a => a.alertId === alertId) || null;
        } catch (error) {
            console.error(`Failed to get security alert: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get node information
     * @returns {Object} Node info
     */
    async getNodeInfo() {
        try {
            const info = await this.client.getInfo();
            return info.nodeInfo;
        } catch (error) {
            console.error(`Failed to get node info: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get network health
     * @returns {Object} Network health metrics
     */
    async getNetworkHealth() {
        try {
            const info = await this.client.getInfo();
            return {
                isHealthy: info.nodeInfo.status.isHealthy,
                latestMilestone: info.nodeInfo.status.latestMilestone.index,
                confirmedMilestone: info.nodeInfo.status.confirmedMilestone.index,
                messagesPerSecond: info.nodeInfo.metrics.messagesPerSecond,
                referencedRate: info.nodeInfo.metrics.referencedRate
            };
        } catch (error) {
            console.error(`Failed to get network health: ${error.message}`);
            throw error;
        }
    }
}

export default IOTAClient;
