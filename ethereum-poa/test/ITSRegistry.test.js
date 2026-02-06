const ITSRegistry = artifacts.require("ITSRegistry");

contract("ITSRegistry", (accounts) => {
    let registry;
    const owner = accounts[0];
    const vehicle1 = accounts[1];
    const vehicle2 = accounts[2];
    const vehicle3 = accounts[3];

    beforeEach(async () => {
        // Arrange - Deploy fresh contract for each test
        registry = await ITSRegistry.new({ from: owner });
    });

    describe("Vehicle Registration", () => {
        it("should register a new vehicle successfully", async () => {
            // Arrange
            const vehicleId = "VEHICLE-001";
            const publicKey = "0x1234567890abcdef";

            // Act
            const result = await registry.registerVehicle(vehicleId, publicKey, {
                from: vehicle1
            });

            // Assert
            assert.equal(result.logs[0].event, "VehicleRegistered");
            assert.equal(result.logs[0].args.vehicleId, vehicleId);
            assert.equal(result.logs[0].args.vehicleAddress, vehicle1);

            const isRegistered = await registry.isVehicleRegistered(vehicleId);
            assert.equal(isRegistered, true);

            const vehicle = await registry.getVehicle(vehicleId);
            assert.equal(vehicle.vehicleId, vehicleId);
            assert.equal(vehicle.publicKey, publicKey);
            assert.equal(vehicle.vehicleAddress, vehicle1);
            assert.equal(vehicle.isRegistered, true);
        });

        it("should reject duplicate vehicle ID registration", async () => {
            // Arrange
            const vehicleId = "VEHICLE-001";
            const publicKey = "0x1234567890abcdef";
            await registry.registerVehicle(vehicleId, publicKey, { from: vehicle1 });

            // Act & Assert
            try {
                await registry.registerVehicle(vehicleId, publicKey, { from: vehicle2 });
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("Vehicle already registered"));
            }
        });

        it("should reject duplicate address registration", async () => {
            // Arrange
            const vehicleId1 = "VEHICLE-001";
            const vehicleId2 = "VEHICLE-002";
            const publicKey = "0x1234567890abcdef";
            await registry.registerVehicle(vehicleId1, publicKey, { from: vehicle1 });

            // Act & Assert
            try {
                await registry.registerVehicle(vehicleId2, publicKey, { from: vehicle1 });
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("Address already registered"));
            }
        });

        it("should return correct vehicle count", async () => {
            // Arrange & Act
            await registry.registerVehicle("VEHICLE-001", "key1", { from: vehicle1 });
            await registry.registerVehicle("VEHICLE-002", "key2", { from: vehicle2 });
            await registry.registerVehicle("VEHICLE-003", "key3", { from: vehicle3 });

            // Assert
            const count = await registry.getVehicleCount();
            assert.equal(count.toNumber(), 3);
        });

        it("should get all vehicle IDs", async () => {
            // Arrange
            await registry.registerVehicle("VEHICLE-001", "key1", { from: vehicle1 });
            await registry.registerVehicle("VEHICLE-002", "key2", { from: vehicle2 });

            // Act
            const vehicleIds = await registry.getAllVehicleIds();

            // Assert
            assert.equal(vehicleIds.length, 2);
            assert.equal(vehicleIds[0], "VEHICLE-001");
            assert.equal(vehicleIds[1], "VEHICLE-002");
        });
    });

    describe("V2X Message Submission", () => {
        beforeEach(async () => {
            // Register a vehicle for V2X tests
            await registry.registerVehicle("VEHICLE-001", "public-key-1", { from: vehicle1 });
        });

        it("should submit a valid V2X message successfully (Scenario A - Critical)", async () => {
            // Arrange - Scenario A: Emergency brake
            const messageId = "MSG-001";
            const messageHash = "hash123";
            const messageType = "EMERGENCY_BRAKE";
            const priority = 0; // Critical
            const latitude = -23550500; // -23.5505 * 1e6
            const longitude = -46633300; // -46.6333 * 1e6
            const signature = "signature";

            // Act
            const result = await registry.submitV2XMessage(
                messageId,
                messageHash,
                messageType,
                priority,
                latitude,
                longitude,
                signature,
                { from: vehicle1 }
            );

            // Assert
            assert.equal(result.logs[0].event, "V2XMessageSubmitted");
            assert.equal(result.logs[0].args.messageId, messageId);
            assert.equal(result.logs[0].args.messageType, messageType);
            assert.equal(result.logs[0].args.senderId, "VEHICLE-001");
            assert.equal(result.logs[0].args.priority.toNumber(), 0);

            const message = await registry.getV2XMessage(messageId);
            assert.equal(message.messageId, messageId);
            assert.equal(message.messageType, messageType);
            assert.equal(message.priority, 0);
            assert.equal(message.status, "validated");
        });

        it("should submit V2I message (Scenario B)", async () => {
            // Arrange - Scenario B: Traffic light
            const messageId = "MSG-V2I-001";
            const messageHash = "hash-v2i";
            const messageType = "TRAFFIC_LIGHT";
            const priority = 1; // High

            // Act
            const result = await registry.submitV2XMessage(
                messageId,
                messageHash,
                messageType,
                priority,
                0,
                0,
                "sig",
                { from: vehicle1 }
            );

            // Assert
            const message = await registry.getV2XMessage(messageId);
            assert.equal(message.messageType, "TRAFFIC_LIGHT");
            assert.equal(message.priority, 1);
        });

        it("should submit road condition message (Scenario C)", async () => {
            // Arrange - Scenario C: Adverse conditions
            const messageId = "MSG-ADVERSE-001";
            const messageHash = "hash-adverse";
            const messageType = "WET_ROAD";
            const priority = 2; // Normal

            // Act
            const result = await registry.submitV2XMessage(
                messageId,
                messageHash,
                messageType,
                priority,
                0,
                0,
                "sig",
                { from: vehicle1 }
            );

            // Assert
            const message = await registry.getV2XMessage(messageId);
            assert.equal(message.messageType, "WET_ROAD");
            assert.equal(message.priority, 2);
        });

        it("should reject duplicate message ID (replay attack prevention)", async () => {
            // Arrange
            const messageId = "MSG-001";
            await registry.submitV2XMessage(
                messageId,
                "hash",
                "EMERGENCY_BRAKE",
                0,
                0,
                0,
                "sig",
                { from: vehicle1 }
            );

            // Act & Assert
            try {
                await registry.submitV2XMessage(
                    messageId,
                    "hash2",
                    "ACCIDENT_ALERT",
                    0,
                    0,
                    0,
                    "sig2",
                    { from: vehicle1 }
                );
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("replay attack detected"));
            }
        });

        it("should reject message from unregistered vehicle", async () => {
            // Arrange
            const messageId = "MSG-002";

            // Act & Assert
            try {
                await registry.submitV2XMessage(
                    messageId,
                    "hash",
                    "TEST",
                    0,
                    0,
                    0,
                    "sig",
                    { from: vehicle2 } // Not registered
                );
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("Vehicle not registered"));
            }
        });

        it("should reject invalid priority level", async () => {
            // Arrange
            const messageId = "MSG-003";
            const invalidPriority = 5;

            // Act & Assert
            try {
                await registry.submitV2XMessage(
                    messageId,
                    "hash",
                    "TEST",
                    invalidPriority,
                    0,
                    0,
                    "sig",
                    { from: vehicle1 }
                );
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("Invalid priority level"));
            }
        });

        it("should check if message exists", async () => {
            // Arrange
            const messageId = "MSG-001";
            await registry.submitV2XMessage(
                messageId,
                "hash",
                "EMERGENCY_BRAKE",
                0,
                0,
                0,
                "sig",
                { from: vehicle1 }
            );

            // Act
            const exists = await registry.messageExists(messageId);
            const notExists = await registry.messageExists("MSG-999");

            // Assert
            assert.equal(exists, true);
            assert.equal(notExists, false);
        });

        it("should return correct message count", async () => {
            // Arrange & Act
            await registry.submitV2XMessage("MSG-001", "h1", "EMERGENCY_BRAKE", 0, 0, 0, "s1", { from: vehicle1 });
            await registry.submitV2XMessage("MSG-002", "h2", "ACCIDENT_ALERT", 0, 0, 0, "s2", { from: vehicle1 });
            await registry.submitV2XMessage("MSG-003", "h3", "WET_ROAD", 2, 0, 0, "s3", { from: vehicle1 });

            // Assert
            const count = await registry.getMessageCount();
            assert.equal(count.toNumber(), 3);
        });

        it("should get all message IDs", async () => {
            // Arrange
            await registry.submitV2XMessage("MSG-001", "h1", "EMERGENCY_BRAKE", 0, 0, 0, "s1", { from: vehicle1 });
            await registry.submitV2XMessage("MSG-002", "h2", "TRAFFIC_LIGHT", 1, 0, 0, "s2", { from: vehicle1 });

            // Act
            const messageIds = await registry.getAllMessageIds();

            // Assert
            assert.equal(messageIds.length, 2);
            assert.equal(messageIds[0], "MSG-001");
            assert.equal(messageIds[1], "MSG-002");
        });
    });

    describe("Security Alerts", () => {
        beforeEach(async () => {
            // Register a vehicle for alert tests
            await registry.registerVehicle("VEHICLE-001", "public-key-1", { from: vehicle1 });
        });

        it("should submit a security alert successfully", async () => {
            // Arrange
            const alertId = "ALERT-001";
            const alertType = "MALICIOUS_BEHAVIOR";
            const severity = "HIGH";
            const description = "Suspicious activity detected";

            // Act
            const result = await registry.submitSecurityAlert(
                alertId,
                alertType,
                severity,
                description,
                { from: vehicle1 }
            );

            // Assert
            assert.equal(result.logs[0].event, "SecurityAlertSubmitted");
            assert.equal(result.logs[0].args.alertId, alertId);
            assert.equal(result.logs[0].args.vehicleId, "VEHICLE-001");
            assert.equal(result.logs[0].args.alertType, alertType);

            const alert = await registry.getSecurityAlert(alertId);
            assert.equal(alert.alertId, alertId);
            assert.equal(alert.vehicleId, "VEHICLE-001");
            assert.equal(alert.alertType, alertType);
            assert.equal(alert.severity, severity);
            assert.equal(alert.description, description);
        });

        it("should reject alert from unregistered vehicle", async () => {
            // Arrange
            const alertId = "ALERT-002";

            // Act & Assert
            try {
                await registry.submitSecurityAlert(
                    alertId,
                    "TEST",
                    "LOW",
                    "Test",
                    { from: vehicle2 } // Not registered
                );
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("Vehicle not registered"));
            }
        });

        it("should reject duplicate alert ID", async () => {
            // Arrange
            const alertId = "ALERT-001";
            await registry.submitSecurityAlert(
                alertId,
                "TEST1",
                "LOW",
                "Test",
                { from: vehicle1 }
            );

            // Act & Assert
            try {
                await registry.submitSecurityAlert(
                    alertId,
                    "TEST2",
                    "HIGH",
                    "Test",
                    { from: vehicle1 }
                );
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("Alert ID already exists"));
            }
        });

        it("should return correct alert count", async () => {
            // Arrange & Act
            await registry.submitSecurityAlert("ALERT-001", "TYPE1", "HIGH", "Desc1", { from: vehicle1 });
            await registry.submitSecurityAlert("ALERT-002", "TYPE2", "MEDIUM", "Desc2", { from: vehicle1 });

            // Assert
            const count = await registry.getAlertCount();
            assert.equal(count.toNumber(), 2);
        });

        it("should get all alert IDs", async () => {
            // Arrange
            await registry.submitSecurityAlert("ALERT-001", "TYPE1", "HIGH", "Desc1", { from: vehicle1 });
            await registry.submitSecurityAlert("ALERT-002", "TYPE2", "LOW", "Desc2", { from: vehicle1 });

            // Act
            const alertIds = await registry.getAllAlertIds();

            // Assert
            assert.equal(alertIds.length, 2);
            assert.equal(alertIds[0], "ALERT-001");
            assert.equal(alertIds[1], "ALERT-002");
        });
    });

    describe("Query Operations", () => {
        beforeEach(async () => {
            // Setup test data
            await registry.registerVehicle("VEHICLE-001", "key1", { from: vehicle1 });
            await registry.registerVehicle("VEHICLE-002", "key2", { from: vehicle2 });
        });

        it("should return error when querying non-existent vehicle", async () => {
            // Act & Assert
            try {
                await registry.getVehicle("VEHICLE-999");
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("Vehicle not found"));
            }
        });

        it("should return error when querying non-existent message", async () => {
            // Act & Assert
            try {
                await registry.getV2XMessage("MSG-999");
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("Message not found"));
            }
        });

        it("should return error when querying non-existent alert", async () => {
            // Act & Assert
            try {
                await registry.getSecurityAlert("ALERT-999");
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("Alert not found"));
            }
        });
    });
});
