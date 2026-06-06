/**
 * ITS Test Scenarios
 * Based on Section 4.2 from BlockchainSecurityArchitectureITS.md
 */

export const ITSScenarios = {
    /**
     * Scenario A: Critical Safety Message
     * Accident/Emergency Braking Alert
     */
    criticalSafetyMessage: {
        name: 'Critical Safety Message (Accident Alert)',
        description: 'High-priority collision warning or emergency braking event',
        criticality: 'CRITICAL',
        frequency: 'EVENT_DRIVEN',
        messageSize: 256, // bytes
        maxLatency: 100, // ms
        reliability: 0.999, // 99.9%

        generateMessage: (vehicleId, sequence) => ({
            type: 'CRITICAL_SAFETY_ALERT',
            alertId: `CRIT-${vehicleId}-${sequence}`,
            vehicleId: vehicleId,
            alertType: 'collision-warning',
            severity: 'critical',
            description: 'Emergency braking detected ahead',
            location: {
                lat: 40.7128 + (Math.random() * 0.01),
                lon: -74.0060 + (Math.random() * 0.01)
            },
            speed: Math.floor(Math.random() * 30) + 40, // 40-70 km/h
            timestamp: Date.now(),
            ttl: 30000 // 30 seconds
        }),

        validation: {
            requiresAuthentication: true,
            requiresSignature: true,
            requiresReplay: Protection,
            requiresGeolocation: true
        }
    },

    /**
     * Scenario B: V2I Infrastructure Communication
     * Smart Traffic Light / Dynamic Priority
     */
    v2iInfrastructure: {
        name: 'V2I Infrastructure Communication',
        description: 'Traffic signal coordination and dynamic priority assignment',
        criticality: 'HIGH',
        frequency: 'PERIODIC', // Every 1-5 seconds
        messageSize: 512, // bytes
        maxLatency: 500, // ms
        reliability: 0.99, // 99%

        generateMessage: (infrastructureId, sequence) => ({
            type: 'V2I_COORDINATION',
            messageId: `V2I-${infrastructureId}-${sequence}`,
            infrastructureId: infrastructureId,
            signalPhase: ['GREEN', 'YELLOW', 'RED'][Math.floor(Math.random() * 3)],
            timeToChange: Math.floor(Math.random() * 30) + 5, // 5-35 seconds
            priority: {
                emergency: false,
                publicTransport: Math.random() > 0.8
            },
            location: {
                intersection: `INT-${Math.floor(Math.random() * 100)}`,
                lat: 40.7128 + (Math.random() * 0.01),
                lon: -74.0060 + (Math.random() * 0.01)
            },
            timestamp: Date.now(),
            validUntil: Date.now() + 60000 // 1 minute
        }),

        validation: {
            requiresAuthentication: true,
            requiresSignature: true,
            requiresTimestamp: true,
            requiresGeolocation: true
        }
    },

    /**
     * Scenario C: Environmental Conditions
     * Road Conditions / Weather Alerts
     */
    environmentalConditions: {
        name: 'Environmental Conditions Alert',
        description: 'Adverse weather, wet road, low visibility warnings',
        criticality: 'MEDIUM',
        frequency: 'PERIODIC', // Every 30-60 seconds
        messageSize: 384, // bytes
        maxLatency: 1000, // ms
        reliability: 0.95, // 95%

        generateMessage: (vehicleId, sequence) => ({
            type: 'ENVIRONMENTAL_ALERT',
            alertId: `ENV-${vehicleId}-${sequence}`,
            vehicleId: vehicleId,
            conditions: {
                weather: ['clear', 'rain', 'fog', 'snow'][Math.floor(Math.random() * 4)],
                roadSurface: ['dry', 'wet', 'icy', 'flooded'][Math.floor(Math.random() * 4)],
                visibility: Math.floor(Math.random() * 500) + 50, // 50-550 meters
                temperature: Math.floor(Math.random() * 40) - 10 // -10 to 30°C
            },
            location: {
                segment: `ROAD-${Math.floor(Math.random() * 1000)}`,
                lat: 40.7128 + (Math.random() * 0.01),
                lon: -74.0060 + (Math.random() * 0.01)
            },
            timestamp: Date.now(),
            validFor: 300000 // 5 minutes
        }),

        validation: {
            requiresAuthentication: true,
            requiresPlausibility: true,
            requiresGeolocation: true
        }
    },

    /**
     * Scenario D: Vehicle Registration
     * Vehicle identity and credential registration
     */
    vehicleRegistration: {
        name: 'Vehicle Registration',
        description: 'Register vehicle identity and public key in the network',
        criticality: 'LOW',
        frequency: 'ONE_TIME',
        messageSize: 1024, // bytes
        maxLatency: 5000, // ms
        reliability: 1.0, // 100%

        generateMessage: (vehicleId, publicKey) => ({
            type: 'VEHICLE_REGISTRATION',
            vehicleId: vehicleId,
            publicKey: publicKey || `0x${Math.random().toString(16).substr(2, 64)}`,
            vehicleType: ['car', 'truck', 'bus', 'motorcycle'][Math.floor(Math.random() * 4)],
            manufacturer: ['OEM-A', 'OEM-B', 'OEM-C'][Math.floor(Math.random() * 3)],
            model: `Model-${Math.floor(Math.random() * 10)}`,
            year: 2020 + Math.floor(Math.random() * 5),
            credentials: {
                certificate: 'CERT-' + Math.random().toString(36).substr(2, 16),
                issuer: 'PKI-Authority',
                validUntil: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year
            },
            timestamp: Date.now()
        }),

        validation: {
            requiresAuthentication: true,
            requiresSignature: true,
            requiresCertificateValidation: true,
            requiresUniqueness: true
        }
    },

    /**
     * Scenario E: Telemetry Data
     * Periodic vehicle status and telemetry
     */
    telemetryData: {
        name: 'Vehicle Telemetry',
        description: 'Periodic vehicle status updates and sensor data',
        criticality: 'LOW',
        frequency: 'PERIODIC', // Every 10-30 seconds
        messageSize: 2048, // bytes
        maxLatency: 2000, // ms
        reliability: 0.90, // 90%

        generateMessage: (vehicleId, sequence) => ({
            type: 'TELEMETRY_DATA',
            messageId: `TEL-${vehicleId}-${sequence}`,
            vehicleId: vehicleId,
            telemetry: {
                speed: Math.floor(Math.random() * 120), // 0-120 km/h
                acceleration: (Math.random() * 4) - 2, // -2 to +2 m/s²
                heading: Math.floor(Math.random() * 360), // 0-360 degrees
                fuelLevel: Math.floor(Math.random() * 100), // 0-100%
                engineTemp: Math.floor(Math.random() * 50) + 70, // 70-120°C
                tirePressure: [
                    2.2 + Math.random() * 0.4,
                    2.2 + Math.random() * 0.4,
                    2.2 + Math.random() * 0.4,
                    2.2 + Math.random() * 0.4
                ] // bar
            },
            sensors: {
                abs: Math.random() > 0.95,
                tcs: Math.random() > 0.97,
                esp: Math.random() > 0.98,
                airbag: Math.random() > 0.99
            },
            location: {
                lat: 40.7128 + (Math.random() * 0.01),
                lon: -74.0060 + (Math.random() * 0.01)
            },
            timestamp: Date.now()
        }),

        validation: {
            requiresAuthentication: true,
            requiresPlausibility: true
        }
    }
};

/**
 * Scenario Generator
 * Generates test scenarios with configurable parameters
 */
export class ScenarioGenerator {
    constructor(scenario, count = 100) {
        this.scenario = ITSScenarios[scenario];
        this.count = count;
        this.generated = [];
    }

    /**
     * Generate messages for the scenario
     */
    generate() {
        console.log(`Generating ${this.count} messages for scenario: ${this.scenario.name}`);

        for (let i = 0; i < this.count; i++) {
            const vehicleId = `VEHICLE-${Math.floor(Math.random() * 1000)}`;
            const message = this.scenario.generateMessage(vehicleId, i);
            this.generated.push(message);
        }

        return this.generated;
    }

    /**
     * Generate with specific rate (messages per second)
     */
    async generateWithRate(messagesPerSecond, duration) {
        const interval = 1000 / messagesPerSecond;
        const totalMessages = Math.floor((duration / 1000) * messagesPerSecond);

        console.log(`Generating messages at ${messagesPerSecond} msg/s for ${duration}ms`);
        console.log(`Expected total: ${totalMessages} messages`);

        const messages = [];
        const startTime = Date.now();

        while (Date.now() - startTime < duration) {
            const vehicleId = `VEHICLE-${Math.floor(Math.random() * 100)}`;
            const message = this.scenario.generateMessage(vehicleId, messages.length);
            messages.push(message);

            await this.sleep(interval);
        }

        console.log(`Generated ${messages.length} messages`);
        return messages;
    }

    /**
     * Get scenario statistics
     */
    getStats() {
        return {
            name: this.scenario.name,
            description: this.scenario.description,
            criticality: this.scenario.criticality,
            frequency: this.scenario.frequency,
            messageSize: this.scenario.messageSize,
            maxLatency: this.scenario.maxLatency,
            reliability: this.scenario.reliability,
            messagesGenerated: this.generated.length
        };
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default { ITSScenarios, ScenarioGenerator };
