const MetricsCollector = require('../MetricsCollector');

describe('MetricsCollector', () => {
    let metricsCollector;

    beforeEach(() => {
        metricsCollector = new MetricsCollector();
    });

    describe('recordE2ELatency', () => {
        it('should record end-to-end latency for critical messages', () => {
            // Arrange
            const latencyMs = 75;
            const priority = 0; // Critical

            // Act
            metricsCollector.recordE2ELatency(latencyMs, priority);

            // Assert
            expect(metricsCollector.metrics.latency.e2e).toHaveLength(1);
            expect(metricsCollector.metrics.latency.e2e[0].value).toBe(75);
            expect(metricsCollector.metrics.latency.e2e[0].priority).toBe(0);
        });

        it('should record multiple latency measurements', () => {
            // Arrange & Act
            metricsCollector.recordE2ELatency(50, 0);
            metricsCollector.recordE2ELatency(100, 1);
            metricsCollector.recordE2ELatency(200, 2);

            // Assert
            expect(metricsCollector.metrics.latency.e2e).toHaveLength(3);
        });
    });

    describe('recordConsensusLatency', () => {
        it('should record consensus latency', () => {
            // Arrange
            const latencyMs = 150;

            // Act
            metricsCollector.recordConsensusLatency(latencyMs);

            // Assert
            expect(metricsCollector.metrics.latency.consensus).toHaveLength(1);
            expect(metricsCollector.metrics.latency.consensus[0].value).toBe(150);
        });
    });

    describe('recordValidationLatency', () => {
        it('should record validation latency', () => {
            // Arrange
            const latencyMs = 25;

            // Act
            metricsCollector.recordValidationLatency(latencyMs);

            // Assert
            expect(metricsCollector.metrics.latency.validation).toHaveLength(1);
            expect(metricsCollector.metrics.latency.validation[0].value).toBe(25);
        });
    });

    describe('recordTransaction', () => {
        it('should record confirmed transaction', () => {
            // Arrange
            const messageType = 'EMERGENCY_BRAKE';
            const confirmed = true;

            // Act
            metricsCollector.recordTransaction(messageType, confirmed);

            // Assert
            expect(metricsCollector.metrics.reliability.submitted).toBe(1);
            expect(metricsCollector.metrics.reliability.confirmed).toBe(1);
            expect(metricsCollector.metrics.messageTypes['EMERGENCY_BRAKE']).toBe(1);
        });

        it('should record unconfirmed transaction', () => {
            // Arrange
            const messageType = 'ROAD_CONDITION';
            const confirmed = false;

            // Act
            metricsCollector.recordTransaction(messageType, confirmed);

            // Assert
            expect(metricsCollector.metrics.reliability.submitted).toBe(1);
            expect(metricsCollector.metrics.reliability.confirmed).toBe(0);
        });

        it('should count messages by type', () => {
            // Arrange & Act
            metricsCollector.recordTransaction('EMERGENCY_BRAKE', true);
            metricsCollector.recordTransaction('EMERGENCY_BRAKE', true);
            metricsCollector.recordTransaction('ROAD_CONDITION', true);

            // Assert
            expect(metricsCollector.metrics.messageTypes['EMERGENCY_BRAKE']).toBe(2);
            expect(metricsCollector.metrics.messageTypes['ROAD_CONDITION']).toBe(1);
        });
    });

    describe('recordRejection', () => {
        it('should record replay attack detection', () => {
            // Arrange
            const reason = 'REPLAY_ATTACK';

            // Act
            metricsCollector.recordRejection(reason);

            // Assert
            expect(metricsCollector.metrics.reliability.rejected).toBe(1);
            expect(metricsCollector.metrics.reliability.replayDetected).toBe(1);
        });

        it('should record other rejections', () => {
            // Arrange
            const reason = 'INVALID_SIGNATURE';

            // Act
            metricsCollector.recordRejection(reason);

            // Assert
            expect(metricsCollector.metrics.reliability.rejected).toBe(1);
            expect(metricsCollector.metrics.reliability.replayDetected).toBe(0);
        });
    });

    describe('recordResourceUsage', () => {
        it('should record CPU, memory and network usage', () => {
            // Arrange
            const cpu = 45.5;
            const memory = 1024;
            const network = { bytesIn: 5000, bytesOut: 3000 };

            // Act
            metricsCollector.recordResourceUsage(cpu, memory, network);

            // Assert
            expect(metricsCollector.metrics.resources.cpu).toHaveLength(1);
            expect(metricsCollector.metrics.resources.cpu[0].value).toBe(45.5);
            expect(metricsCollector.metrics.resources.memory[0].value).toBe(1024);
            expect(metricsCollector.metrics.resources.network[0].bytesIn).toBe(5000);
            expect(metricsCollector.metrics.resources.network[0].bytesOut).toBe(3000);
        });
    });

    describe('calculateTPS', () => {
        it('should calculate transactions per second', () => {
            // Arrange - Record 10 transactions
            for (let i = 0; i < 10; i++) {
                metricsCollector.recordTransaction('TEST', true);
            }

            // Act
            const tps = metricsCollector.calculateTPS(1000);

            // Assert
            expect(tps).toBeGreaterThan(0);
            expect(tps).toBeLessThanOrEqual(10);
        });

        it('should return 0 for no transactions', () => {
            // Arrange
            // (no transactions recorded)

            // Act
            const tps = metricsCollector.calculateTPS(1000);

            // Assert
            expect(tps).toBe(0);
        });
    });

    describe('calculateLatencyPercentiles', () => {
        it('should calculate percentiles correctly', () => {
            // Arrange
            const latencies = [
                { value: 50, timestamp: Date.now() },
                { value: 75, timestamp: Date.now() },
                { value: 100, timestamp: Date.now() },
                { value: 125, timestamp: Date.now() },
                { value: 150, timestamp: Date.now() },
                { value: 200, timestamp: Date.now() },
                { value: 300, timestamp: Date.now() }
            ];

            // Act
            const percentiles = metricsCollector.calculateLatencyPercentiles(latencies);

            // Assert
            expect(percentiles.min).toBe(50);
            expect(percentiles.max).toBe(300);
            expect(percentiles.p50).toBeDefined();
            expect(percentiles.p95).toBeDefined();
            expect(percentiles.p99).toBeDefined();
            expect(percentiles.avg).toBeGreaterThan(0);
        });

        it('should handle empty array', () => {
            // Arrange
            const latencies = [];

            // Act
            const percentiles = metricsCollector.calculateLatencyPercentiles(latencies);

            // Assert
            expect(percentiles.p50).toBe(0);
            expect(percentiles.p95).toBe(0);
            expect(percentiles.p99).toBe(0);
            expect(percentiles.avg).toBe(0);
        });
    });

    describe('generateReport', () => {
        it('should generate comprehensive performance report', () => {
            // Arrange - Simulate scenario A (critical messages)
            metricsCollector.recordE2ELatency(75, 0);
            metricsCollector.recordE2ELatency(85, 0);
            metricsCollector.recordE2ELatency(95, 0);
            metricsCollector.recordConsensusLatency(150);
            metricsCollector.recordTransaction('EMERGENCY_BRAKE', true);
            metricsCollector.recordTransaction('EMERGENCY_BRAKE', true);
            metricsCollector.recordResourceUsage(45.5, 1024, { bytesIn: 5000, bytesOut: 3000 });

            // Act
            const report = metricsCollector.generateReport();

            // Assert
            expect(report).toHaveProperty('summary');
            expect(report).toHaveProperty('latency');
            expect(report).toHaveProperty('throughput');
            expect(report).toHaveProperty('reliability');
            expect(report).toHaveProperty('resources');
            expect(report).toHaveProperty('messageTypes');

            expect(report.summary.totalTransactions).toBe(2);
            expect(report.summary.confirmedTransactions).toBe(2);
            expect(report.latency.critical).toBeDefined();
            expect(report.latency.critical.unit).toBe('ms');
            expect(report.throughput.unit).toBe('tx/s');
        });

        it('should check if critical latency meets target (<100ms)', () => {
            // Arrange - Scenario A: Critical messages should have <100ms latency
            metricsCollector.recordE2ELatency(75, 0);
            metricsCollector.recordE2ELatency(85, 0);
            metricsCollector.recordE2ELatency(95, 0);

            // Act
            const report = metricsCollector.generateReport();

            // Assert
            expect(report.latency.critical.target).toBe(100);
            expect(report.latency.critical.meetsTarget).toBe(true);
            expect(report.latency.critical.p95).toBeLessThan(100);
        });

        it('should detect when critical latency does not meet target', () => {
            // Arrange - Simulating poor performance
            metricsCollector.recordE2ELatency(150, 0);
            metricsCollector.recordE2ELatency(200, 0);
            metricsCollector.recordE2ELatency(250, 0);

            // Act
            const report = metricsCollector.generateReport();

            // Assert
            expect(report.latency.critical.meetsTarget).toBe(false);
            expect(report.latency.critical.p95).toBeGreaterThanOrEqual(100);
        });

        it('should calculate confirmation rate correctly', () => {
            // Arrange
            metricsCollector.recordTransaction('TEST', true);
            metricsCollector.recordTransaction('TEST', true);
            metricsCollector.recordTransaction('TEST', true);
            metricsCollector.recordTransaction('TEST', false);

            // Act
            const report = metricsCollector.generateReport();

            // Assert
            expect(report.reliability.confirmationRate).toBe(75); // 3 of 4 confirmed
        });

        it('should calculate rejection rate correctly', () => {
            // Arrange
            metricsCollector.recordTransaction('TEST', true);
            metricsCollector.recordTransaction('TEST', true);
            metricsCollector.recordRejection('REPLAY_ATTACK');
            metricsCollector.recordRejection('INVALID_SIGNATURE');

            // Act
            const report = metricsCollector.generateReport();

            // Assert
            expect(report.reliability.rejectionRate).toBe(100); // 2 rejected out of 2 total
            expect(report.summary.replayAttacksDetected).toBe(1);
        });
    });

    describe('exportForAnalysis', () => {
        it('should export data for statistical analysis', () => {
            // Arrange
            metricsCollector.recordE2ELatency(100, 0);
            metricsCollector.recordTransaction('TEST', true);

            // Act
            const exported = metricsCollector.exportForAnalysis();

            // Assert
            expect(exported).toHaveProperty('raw');
            expect(exported).toHaveProperty('report');
            expect(exported.raw).toHaveProperty('latency');
            expect(exported.raw).toHaveProperty('throughput');
            expect(exported.raw).toHaveProperty('resources');
            expect(exported.raw).toHaveProperty('reliability');
        });
    });

    describe('reset', () => {
        it('should reset all metrics', () => {
            // Arrange - Record some data
            metricsCollector.recordE2ELatency(100, 0);
            metricsCollector.recordTransaction('TEST', true);
            metricsCollector.recordRejection('REPLAY_ATTACK');

            // Act
            metricsCollector.reset();

            // Assert
            expect(metricsCollector.metrics.latency.e2e).toHaveLength(0);
            expect(metricsCollector.metrics.reliability.submitted).toBe(0);
            expect(metricsCollector.metrics.reliability.rejected).toBe(0);
            expect(Object.keys(metricsCollector.metrics.messageTypes)).toHaveLength(0);
        });
    });

    describe('getDashboard', () => {
        it('should return real-time dashboard data', () => {
            // Arrange - Scenario A: Critical messages
            metricsCollector.recordE2ELatency(75, 0);
            metricsCollector.recordE2ELatency(85, 0);
            metricsCollector.recordTransaction('EMERGENCY_BRAKE', true);

            // Act
            const dashboard = metricsCollector.getDashboard();

            // Assert
            expect(dashboard).toHaveProperty('realtime');
            expect(dashboard).toHaveProperty('targets');
            expect(dashboard).toHaveProperty('summary');
            expect(dashboard.realtime).toHaveProperty('tps');
            expect(dashboard.realtime).toHaveProperty('avgLatency');
            expect(dashboard.realtime).toHaveProperty('confirmationRate');
            expect(dashboard.targets.criticalLatency).toBeDefined();
            expect(dashboard.targets.tps).toBeDefined();
        });

        it('should check if TPS meets target', () => {
            // Arrange - Record enough transactions for good TPS
            for (let i = 0; i < 150; i++) {
                metricsCollector.recordTransaction('TEST', true);
            }

            // Act
            const dashboard = metricsCollector.getDashboard();

            // Assert
            expect(dashboard.targets.tps.target).toBe(100);
            expect(dashboard.targets.tps.meetsTarget).toBeDefined();
        });
    });

    describe('Scenario A - Emergency Brake (Critical)', () => {
        it('should meet performance targets for critical messages', () => {
            // Arrange - Section 4.2: Scenario A
            const criticalMessages = [
                { latency: 65, type: 'EMERGENCY_BRAKE' },
                { latency: 75, type: 'EMERGENCY_BRAKE' },
                { latency: 85, type: 'ACCIDENT_ALERT' },
                { latency: 95, type: 'EMERGENCY_BRAKE' }
            ];

            // Act
            criticalMessages.forEach(msg => {
                metricsCollector.recordE2ELatency(msg.latency, 0);
                metricsCollector.recordTransaction(msg.type, true);
            });
            const report = metricsCollector.generateReport();

            // Assert - All critical messages should be <100ms
            expect(report.latency.critical.p95).toBeLessThan(100);
            expect(report.latency.critical.meetsTarget).toBe(true);
            expect(report.summary.totalTransactions).toBe(4);
            expect(report.reliability.confirmationRate).toBe(100);
        });
    });

    describe('Scenario B - Traffic Light (V2I)', () => {
        it('should track V2I message performance', () => {
            // Arrange - Section 4.2: Scenario B
            const v2iMessages = [
                { latency: 150, type: 'TRAFFIC_LIGHT', priority: 1 },
                { latency: 175, type: 'PRIORITY_REQUEST', priority: 1 },
                { latency: 160, type: 'TRAFFIC_LIGHT', priority: 1 }
            ];

            // Act
            v2iMessages.forEach(msg => {
                metricsCollector.recordE2ELatency(msg.latency, msg.priority);
                metricsCollector.recordTransaction(msg.type, true);
            });
            const report = metricsCollector.generateReport();

            // Assert
            expect(report.messageTypes['TRAFFIC_LIGHT']).toBe(2);
            expect(report.messageTypes['PRIORITY_REQUEST']).toBe(1);
            expect(report.summary.totalTransactions).toBe(3);
        });
    });

    describe('Scenario C - Adverse Conditions', () => {
        it('should track road condition messages', () => {
            // Arrange - Section 4.2: Scenario C
            const adverseMessages = [
                { latency: 250, type: 'WET_ROAD', priority: 2 },
                { latency: 300, type: 'LOW_VISIBILITY', priority: 2 },
                { latency: 275, type: 'ROAD_CONDITION', priority: 2 }
            ];

            // Act
            adverseMessages.forEach(msg => {
                metricsCollector.recordE2ELatency(msg.latency, msg.priority);
                metricsCollector.recordTransaction(msg.type, true);
            });
            const report = metricsCollector.generateReport();

            // Assert - Normal priority messages have higher latency tolerance
            expect(report.summary.totalTransactions).toBe(3);
            expect(report.messageTypes['WET_ROAD']).toBe(1);
            expect(report.messageTypes['LOW_VISIBILITY']).toBe(1);
            expect(report.messageTypes['ROAD_CONDITION']).toBe(1);
        });
    });
});
