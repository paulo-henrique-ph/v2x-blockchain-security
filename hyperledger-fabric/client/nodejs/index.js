const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const FabricTelemetry = require('./telemetry');

/**
 * FabricClient - Hyperledger Fabric SDK Client for V2X ITS
 *
 * Implements the client-side interaction with the Hyperledger Fabric network
 * for V2V/V2I message validation and storage.
 *
 * Architecture: RSU Gateway → Fabric Client → Chaincode → Ledger
 */
class FabricClient {
    constructor(config = {}) {
        this.gateway = null;
        this.network = null;
        this.contract = null;
        this.channelName = config.channelName || 'itschannel';
        this.chaincodeName = config.chaincodeName || 'itscontract';
        this.connectionProfile = config.connectionProfile || path.resolve(__dirname, '..', '..', 'config', 'connection-profile.json');
        this.walletPath = config.walletPath || path.join(process.cwd(), 'wallet');
        this.identity = config.identity || 'rsuUser';
        this.telemetry = null;
        this.telemetryConfig = config.telemetry || {};
    }

    /**
     * Connect to the Hyperledger Fabric network
     * Establishes gateway connection and retrieves contract instance
     */
    async connect() {
        try {
            // Initialize OpenTelemetry
            this.telemetry = new FabricTelemetry(this.telemetryConfig);
            await this.telemetry.initialize();

            // Load connection profile
            if (!fs.existsSync(this.connectionProfile)) {
                throw new Error(`Connection profile not found: ${this.connectionProfile}`);
            }

            const ccp = JSON.parse(fs.readFileSync(this.connectionProfile, 'utf8'));

            // Create/load wallet
            const wallet = await Wallets.newFileSystemWallet(this.walletPath);

            // Check for identity in wallet
            const identity = await wallet.get(this.identity);
            if (!identity) {
                throw new Error(`Identity ${this.identity} not found in wallet. Run enrollment first.`);
            }

            // Create gateway connection
            this.gateway = new Gateway();
            await this.gateway.connect(ccp, {
                wallet,
                identity: this.identity,
                discovery: { enabled: true, asLocalhost: true }
            });

            // Get network and contract
            this.network = await this.gateway.getNetwork(this.channelName);
            this.contract = this.network.getContract(this.chaincodeName);

            this.telemetry.updateGatewayConnections(1);
            console.log(`Connected to Hyperledger Fabric network - Channel: ${this.channelName}, Chaincode: ${this.chaincodeName}`);

            return true;
        } catch (error) {
            console.error(`Failed to connect to Fabric network: ${error.message}`);
            if (this.telemetry) {
                this.telemetry.recordError('connection_error', 'fabric_client', error.message);
            }
            throw error;
        }
    }

    /**
     * Disconnect from the network
     */
    async disconnect() {
        try {
            if (this.gateway) {
                await this.gateway.disconnect();
                this.gateway = null;
                this.network = null;
                this.contract = null;
                if (this.telemetry) {
                    this.telemetry.updateGatewayConnections(-1);
                    await this.telemetry.shutdown();
                }
                console.log('Disconnected from Hyperledger Fabric network');
            }
        } catch (error) {
            console.error(`Failed to disconnect: ${error.message}`);
            throw error;
        }
    }

    /**
     * Register a new vehicle in the network
     *
     * @param {string} vehicleId - Unique vehicle identifier
     * @param {string} publicKey - Vehicle's public key for signature verification
     * @returns {Promise<Object>} Registration result
     */
    async registerVehicle(vehicleId, publicKey) {
        try {
            this._ensureConnected();

            console.log(`Registering vehicle: ${vehicleId}`);

            const result = await this.contract.submitTransaction(
                'RegisterVehicle',
                vehicleId,
                publicKey
            );

            console.log(`Vehicle registered successfully: ${vehicleId}`);

            return {
                success: true,
                vehicleId,
                transactionId: result.toString()
            };
        } catch (error) {
            console.error(`Failed to register vehicle ${vehicleId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Submit a V2X message to the blockchain
     *
     * Implements the core functionality described in section 4.3:
     * - Registers hash/receipt/evidence on ledger (not full payload)
     * - Provides immutable audit trail
     * - Enables replay attack prevention
     *
     * @param {Object} message - V2X message object
     * @returns {Promise<Object>} Submission result with transaction ID
     */
    async submitV2XMessage(message) {
        try {
            this._ensureConnected();

            // Validate message structure
            this._validateV2XMessage(message);

            console.log(`Submitting V2X message: ${message.messageId}`);

            const messageJSON = JSON.stringify(message);
            const startTime = Date.now();

            const result = await this.contract.submitTransaction(
                'SubmitV2XMessage',
                messageJSON
            );

            const latency = Date.now() - startTime;

            console.log(`V2X message submitted successfully: ${message.messageId} (${latency}ms)`);

            return {
                success: true,
                messageId: message.messageId,
                transactionId: result.toString(),
                latency,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`Failed to submit V2X message: ${error.message}`);

            // Check for replay attack
            if (error.message.includes('already exists') || error.message.includes('replay attack')) {
                return {
                    success: false,
                    error: 'REPLAY_ATTACK_DETECTED',
                    message: error.message
                };
            }

            throw error;
        }
    }

    /**
     * Get a V2X message from the ledger
     *
     * @param {string} messageId - Message identifier
     * @returns {Promise<Object>} Message data
     */
    async getV2XMessage(messageId) {
        try {
            this._ensureConnected();

            const result = await this.contract.evaluateTransaction(
                'GetV2XMessage',
                messageId
            );

            const message = JSON.parse(result.toString());

            return {
                success: true,
                message
            };
        } catch (error) {
            if (error.message.includes('does not exist')) {
                return {
                    success: false,
                    error: 'MESSAGE_NOT_FOUND',
                    messageId
                };
            }

            console.error(`Failed to get V2X message: ${error.message}`);
            throw error;
        }
    }

    /**
     * Query messages by type (for analysis and auditing)
     *
     * @param {string} messageType - Type of message (e.g., 'EMERGENCY_BRAKE')
     * @returns {Promise<Array>} Array of messages
     */
    async queryMessagesByType(messageType) {
        try {
            this._ensureConnected();

            const result = await this.contract.evaluateTransaction(
                'QueryMessagesByType',
                messageType
            );

            const messages = JSON.parse(result.toString());

            return {
                success: true,
                count: messages.length,
                messages
            };
        } catch (error) {
            console.error(`Failed to query messages by type: ${error.message}`);
            throw error;
        }
    }

    /**
     * Query messages by sender (for analysis and auditing)
     *
     * @param {string} senderId - Sender vehicle ID
     * @returns {Promise<Array>} Array of messages
     */
    async queryMessagesBySender(senderId) {
        try {
            this._ensureConnected();

            const result = await this.contract.evaluateTransaction(
                'QueryMessagesBySender',
                senderId
            );

            const messages = JSON.parse(result.toString());

            return {
                success: true,
                count: messages.length,
                messages
            };
        } catch (error) {
            console.error(`Failed to query messages by sender: ${error.message}`);
            throw error;
        }
    }

    /**
     * Submit a security alert
     *
     * Logs security incidents for audit trail as specified in section 4.3
     *
     * @param {string} alertId - Unique alert identifier
     * @param {string} vehicleId - Vehicle involved
     * @param {string} alertType - Type of alert (e.g., 'MALICIOUS_BEHAVIOR')
     * @param {string} severity - Severity level (e.g., 'HIGH', 'MEDIUM', 'LOW')
     * @param {string} description - Alert description
     * @param {number} timestamp - Unix timestamp
     * @returns {Promise<Object>} Submission result
     */
    async submitSecurityAlert(alertId, vehicleId, alertType, severity, description, timestamp) {
        try {
            this._ensureConnected();

            console.log(`Submitting security alert: ${alertId}`);

            const result = await this.contract.submitTransaction(
                'SubmitSecurityAlert',
                alertId,
                vehicleId,
                alertType,
                severity,
                description,
                timestamp.toString()
            );

            console.log(`Security alert submitted successfully: ${alertId}`);

            return {
                success: true,
                alertId,
                transactionId: result.toString()
            };
        } catch (error) {
            console.error(`Failed to submit security alert: ${error.message}`);
            throw error;
        }
    }

    /**
     * Query a vehicle by ID
     *
     * @param {string} vehicleId - Vehicle identifier
     * @returns {Promise<Object>} Vehicle data
     */
    async getVehicle(vehicleId) {
        try {
            this._ensureConnected();

            const result = await this.contract.evaluateTransaction(
                'GetVehicle',
                vehicleId
            );

            const vehicle = JSON.parse(result.toString());

            return {
                success: true,
                vehicle
            };
        } catch (error) {
            if (error.message.includes('does not exist')) {
                return {
                    success: false,
                    error: 'VEHICLE_NOT_FOUND',
                    vehicleId
                };
            }

            console.error(`Failed to get vehicle: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all vehicles (for administrative purposes)
     *
     * @returns {Promise<Array>} Array of vehicles
     */
    async getAllVehicles() {
        try {
            this._ensureConnected();

            const result = await this.contract.evaluateTransaction('GetAllVehicles');
            const vehicles = JSON.parse(result.toString());

            return {
                success: true,
                count: vehicles.length,
                vehicles
            };
        } catch (error) {
            console.error(`Failed to get all vehicles: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all security alerts (for administrative purposes)
     *
     * @returns {Promise<Array>} Array of security alerts
     */
    async getAllSecurityAlerts() {
        try {
            this._ensureConnected();

            const result = await this.contract.evaluateTransaction('GetAllSecurityAlerts');
            const alerts = JSON.parse(result.toString());

            return {
                success: true,
                count: alerts.length,
                alerts
            };
        } catch (error) {
            console.error(`Failed to get all security alerts: ${error.message}`);
            throw error;
        }
    }

    /**
     * Collect performance metrics (for research - section 5)
     *
     * Measures:
     * - End-to-end latency
     * - Transaction throughput
     * - Success/failure rates
     *
     * @returns {Promise<Object>} Performance metrics
     */
    async collectMetrics() {
        try {
            this._ensureConnected();

            // Get channel information for metrics
            const channel = this.network.getChannel();
            const peers = channel.getPeers();

            return {
                success: true,
                metrics: {
                    channelName: this.channelName,
                    chaincodeName: this.chaincodeName,
                    peerCount: peers.length,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error(`Failed to collect metrics: ${error.message}`);
            throw error;
        }
    }

    /**
     * Ensure client is connected to the network
     * @private
     */
    _ensureConnected() {
        if (!this.gateway || !this.contract) {
            throw new Error('Not connected to Fabric network. Call connect() first.');
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
            'timestamp',
            'priority'
        ];

        for (const field of requiredFields) {
            if (!message[field] && message[field] !== 0) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate message types according to scenarios (section 4.2)
        const validTypes = [
            'EMERGENCY_BRAKE',      // Scenario A: Critical
            'ACCIDENT_ALERT',       // Scenario A: Critical
            'TRAFFIC_LIGHT',        // Scenario B: V2I
            'PRIORITY_REQUEST',     // Scenario B: V2I
            'ROAD_CONDITION',       // Scenario C: Adverse conditions
            'LOW_VISIBILITY',       // Scenario C: Adverse conditions
            'WET_ROAD',            // Scenario C: Adverse conditions
            'GENERAL_INFO'         // Non-critical information
        ];

        if (!validTypes.includes(message.messageType)) {
            console.warn(`Unknown message type: ${message.messageType}`);
        }

        // Validate priority levels (0 = critical, 1 = high, 2 = normal)
        if (message.priority < 0 || message.priority > 2) {
            throw new Error(`Invalid priority: ${message.priority}. Must be 0 (critical), 1 (high), or 2 (normal)`);
        }
    }
}

module.exports = FabricClient;
