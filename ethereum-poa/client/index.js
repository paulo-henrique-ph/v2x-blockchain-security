const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
const EthereumTelemetry = require('./telemetry');

class EthereumPoAClient {
    constructor(providerUrl = 'http://localhost:8545', telemetryConfig = {}) {
        this.web3 = new Web3(providerUrl);
        this.contract = null;
        this.account = null;
        this.telemetry = null;
        this.telemetryConfig = telemetryConfig;
    }

    /**
     * Initialize the client with contract ABI and address
     */
    async initialize(contractAddress, accountPrivateKey) {
        try {
            // Initialize OpenTelemetry
            this.telemetry = new EthereumTelemetry(this.telemetryConfig);
            await this.telemetry.initialize();

            // Load contract ABI
            const contractPath = path.resolve(__dirname, '..', 'build', 'contracts', 'ITSRegistry.json');

            if (!fs.existsSync(contractPath)) {
                throw new Error('Contract ABI not found. Please compile contracts first.');
            }

            const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
            const abi = contractJson.abi;

            // Initialize contract
            this.contract = new this.web3.eth.Contract(abi, contractAddress);

            // Set up account
            if (accountPrivateKey) {
                const account = this.web3.eth.accounts.privateKeyToAccount(accountPrivateKey);
                this.web3.eth.accounts.wallet.add(account);
                this.account = account.address;
            } else {
                const accounts = await this.web3.eth.getAccounts();
                this.account = accounts[0];
            }

            this.telemetry.updateConnections(1);
            console.log(`Initialized with account: ${this.account}`);
        } catch (error) {
            console.error(`Failed to initialize: ${error.message}`);
            if (this.telemetry) {
                this.telemetry.recordError('initialization_error', 'ethereum_client', error.message);
            }
            throw error;
        }
    }

    /**
     * Register a new vehicle
     */
    async registerVehicle(vehicleId, publicKey) {
        const startTime = Date.now();
        let span = null;

        try {
            // Start tracing span
            span = this.telemetry?.startSpan('registerVehicle', {
                'vehicle.id': vehicleId,
                'blockchain.platform': 'ethereum-poa',
            });

            console.log(`Registering vehicle: ${vehicleId}`);

            const receipt = await this.contract.methods
                .registerVehicle(vehicleId, publicKey)
                .send({ from: this.account, gas: 500000 });

            const latencyMs = Date.now() - startTime;

            // Record metrics
            this.telemetry?.recordVehicleRegistration(vehicleId, true);
            this.telemetry?.recordContractCall('registerVehicle', true);
            this.telemetry?.recordTransaction('vehicle_registration', 0, true, receipt.gasUsed, latencyMs);

            // Update span
            this.telemetry?.addSpanEvent(span, 'vehicle.registered', {
                'tx.hash': receipt.transactionHash,
                'gas.used': receipt.gasUsed,
            });
            this.telemetry?.setSpanSuccess(span);

            console.log(`Vehicle registered. Transaction: ${receipt.transactionHash}`);
            return receipt;
        } catch (error) {
            console.error(`Failed to register vehicle: ${error.message}`);
            this.telemetry?.recordError('vehicle_registration_error', 'ethereum_client', error.message);
            this.telemetry?.recordContractCall('registerVehicle', false);
            this.telemetry?.recordSpanError(span, error);
            throw error;
        } finally {
            this.telemetry?.endSpan(span);
        }
    }

    /**
     * Submit a V2X message to the blockchain
     * Implements core V2X functionality for scenarios A, B, C
     */
    async submitV2XMessage(message) {
        try {
            console.log(`Submitting V2X message: ${message.messageId}`);

            // Validate message structure
            this._validateV2XMessage(message);

            // Convert coordinates to scaled integers (multiply by 1e6 for precision)
            const latitude = Math.floor((message.location?.lat || 0) * 1000000);
            const longitude = Math.floor((message.location?.lon || 0) * 1000000);

            const startTime = Date.now();

            const receipt = await this.contract.methods
                .submitV2XMessage(
                    message.messageId,
                    message.messageHash,
                    message.messageType,
                    message.priority,
                    latitude,
                    longitude,
                    message.signature || ''
                )
                .send({ from: this.account, gas: 500000 });

            const latency = Date.now() - startTime;

            console.log(`V2X message submitted. Transaction: ${receipt.transactionHash} (${latency}ms)`);

            return {
                success: true,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                messageId: message.messageId,
                latency: latency
            };
        } catch (error) {
            // Check for replay attack
            if (error.message.includes('replay attack')) {
                return {
                    success: false,
                    error: 'REPLAY_ATTACK_DETECTED',
                    message: error.message
                };
            }
            console.error(`Failed to submit V2X message: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get V2X message by ID
     */
    async getV2XMessage(messageId) {
        try {
            console.log(`Querying V2X message: ${messageId}`);

            const msg = await this.contract.methods
                .getV2XMessage(messageId)
                .call();

            return {
                success: true,
                message: {
                    messageId: msg.messageId,
                    messageHash: msg.messageHash,
                    messageType: msg.messageType,
                    senderId: msg.senderId,
                    timestamp: msg.timestamp,
                    priority: parseInt(msg.priority),
                    latitude: parseInt(msg.latitude) / 1000000,
                    longitude: parseInt(msg.longitude) / 1000000,
                    signature: msg.signature,
                    status: msg.status,
                    blockNumber: msg.blockNumber
                }
            };
        } catch (error) {
            if (error.message.includes('Message not found')) {
                return {
                    success: false,
                    error: 'MESSAGE_NOT_FOUND',
                    messageId: messageId
                };
            }
            console.error(`Failed to query V2X message: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all V2X messages
     */
    async getAllV2XMessages() {
        try {
            console.log('Getting all V2X messages');

            const messageIds = await this.contract.methods
                .getAllMessageIds()
                .call();

            const messages = [];
            for (const id of messageIds) {
                const result = await this.getV2XMessage(id);
                if (result.success) {
                    messages.push(result.message);
                }
            }

            return {
                success: true,
                count: messages.length,
                messages: messages
            };
        } catch (error) {
            console.error(`Failed to get all V2X messages: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check if message exists (replay attack prevention)
     */
    async messageExists(messageId) {
        try {
            return await this.contract.methods
                .messageExists(messageId)
                .call();
        } catch (error) {
            console.error(`Failed to check message existence: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get message count
     */
    async getMessageCount() {
        try {
            const count = await this.contract.methods.getMessageCount().call();
            return parseInt(count);
        } catch (error) {
            console.error(`Failed to get message count: ${error.message}`);
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
            'priority'
        ];

        for (const field of requiredFields) {
            if (message[field] === undefined && message[field] !== 0) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate message types according to scenarios
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

        // Validate priority
        if (message.priority < 0 || message.priority > 2) {
            throw new Error(`Invalid priority: ${message.priority}. Must be 0 (critical), 1 (high), or 2 (normal)`);
        }
    }

    /**
     * Submit a security alert
     */
    async submitSecurityAlert(alertId, alertType, severity, description) {
        try {
            console.log(`Submitting security alert: ${alertId}`);

            const receipt = await this.contract.methods
                .submitSecurityAlert(alertId, alertType, severity, description)
                .send({ from: this.account, gas: 500000 });

            console.log(`Alert submitted. Transaction: ${receipt.transactionHash}`);
            return receipt;
        } catch (error) {
            console.error(`Failed to submit alert: ${error.message}`);
            throw error;
        }
    }

    /**
     * Query a vehicle by ID
     */
    async getVehicle(vehicleId) {
        try {
            console.log(`Querying vehicle: ${vehicleId}`);

            const vehicle = await this.contract.methods
                .getVehicle(vehicleId)
                .call();

            return {
                vehicleAddress: vehicle.vehicleAddress,
                vehicleId: vehicle.vehicleId,
                publicKey: vehicle.publicKey,
                isRegistered: vehicle.isRegistered,
                registrationTime: vehicle.registrationTime
            };
        } catch (error) {
            console.error(`Failed to query vehicle: ${error.message}`);
            throw error;
        }
    }

    /**
     * Query a security alert by ID
     */
    async getSecurityAlert(alertId) {
        try {
            console.log(`Querying security alert: ${alertId}`);

            const alert = await this.contract.methods
                .getSecurityAlert(alertId)
                .call();

            return {
                alertId: alert.alertId,
                vehicleId: alert.vehicleId,
                alertType: alert.alertType,
                severity: alert.severity,
                description: alert.description,
                timestamp: alert.timestamp,
                submitter: alert.submitter
            };
        } catch (error) {
            console.error(`Failed to query alert: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all registered vehicles
     */
    async getAllVehicles() {
        try {
            console.log('Getting all vehicles');

            const vehicleIds = await this.contract.methods
                .getAllVehicleIds()
                .call();

            const vehicles = [];
            for (const id of vehicleIds) {
                const vehicle = await this.getVehicle(id);
                vehicles.push(vehicle);
            }

            return vehicles;
        } catch (error) {
            console.error(`Failed to get all vehicles: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all security alerts
     */
    async getAllSecurityAlerts() {
        try {
            console.log('Getting all security alerts');

            const alertIds = await this.contract.methods
                .getAllAlertIds()
                .call();

            const alerts = [];
            for (const id of alertIds) {
                const alert = await this.getSecurityAlert(id);
                alerts.push(alert);
            }

            return alerts;
        } catch (error) {
            console.error(`Failed to get all alerts: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get vehicle count
     */
    async getVehicleCount() {
        try {
            const count = await this.contract.methods.getVehicleCount().call();
            return parseInt(count);
        } catch (error) {
            console.error(`Failed to get vehicle count: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get alert count
     */
    async getAlertCount() {
        try {
            const count = await this.contract.methods.getAlertCount().call();
            return parseInt(count);
        } catch (error) {
            console.error(`Failed to get alert count: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check if vehicle is registered
     */
    async isVehicleRegistered(vehicleId) {
        try {
            return await this.contract.methods
                .isVehicleRegistered(vehicleId)
                .call();
        } catch (error) {
            console.error(`Failed to check vehicle registration: ${error.message}`);
            throw error;
        }
    }
}

module.exports = EthereumPoAClient;
