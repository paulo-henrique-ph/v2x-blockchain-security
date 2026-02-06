import IOTAIdentityManager from './identity.js';

describe('IOTAIdentityManager', () => {
    let manager;
    beforeEach(() => {
        manager = new IOTAIdentityManager();
    });

    test('createVehicleDID creates and stores DID', async () => {
        // Arrange
        const vehicleId = 'V1';
        // Act
        const did = await manager.createVehicleDID(vehicleId);
        // Assert
        expect(did).toHaveProperty('id', 'did:iota:V1');
        expect(manager.identities.get(vehicleId)).toEqual(did);
    });

    test('resolveDID finds existing DID', async () => {
        // Arrange
        const vehicleId = 'V2';
        const did = await manager.createVehicleDID(vehicleId);
        // Act
        const resolved = await manager.resolveDID(did.id);
        // Assert
        expect(resolved).toEqual(did);
    });

    test('resolveDID returns null for unknown DID', async () => {
        // Arrange
        const unknownDid = 'did:iota:unknown';
        // Act
        const resolved = await manager.resolveDID(unknownDid);
        // Assert
        expect(resolved).toBeNull();
    });

    test('createVerifiableCredential returns credential for known vehicle', async () => {
        // Arrange
        const vehicleId = 'V3';
        await manager.createVehicleDID(vehicleId);
        const claims = { type: 'ITS', valid: true };
        // Act
        const credential = await manager.createVerifiableCredential(vehicleId, claims);
        // Assert
        expect(credential).toHaveProperty('subject', 'did:iota:V3');
        expect(credential).toHaveProperty('claims', claims);
        expect(credential).toHaveProperty('proof', 'mock-proof');
    });

    test('createVerifiableCredential returns null for unknown vehicle', async () => {
        // Arrange
        const vehicleId = 'V4';
        const claims = { type: 'ITS' };
        // Act
        const credential = await manager.createVerifiableCredential(vehicleId, claims);
        // Assert
        expect(credential).toBeNull();
    });

    test('verifyCredential returns true for valid mock proof', async () => {
        // Arrange
        const vehicleId = 'V5';
        await manager.createVehicleDID(vehicleId);
        const credential = await manager.createVerifiableCredential(vehicleId, { type: 'ITS' });
        // Act
        const verified = await manager.verifyCredential(credential);
        // Assert
        expect(verified).toBe(true);
    });

    test('verifyCredential returns false for invalid proof', async () => {
        // Arrange
        const credential = { proof: 'invalid-proof' };
        // Act
        const verified = await manager.verifyCredential(credential);
        // Assert
        expect(verified).toBe(false);
    });
});
