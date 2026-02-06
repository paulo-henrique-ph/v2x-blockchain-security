# IOTA Tangle Implementation for ITS Security

This directory contains the IOTA Tangle (DAG) implementation for the Vehicle-to-Vehicle (V2V) blockchain security system.

## Structure

```
iota/
├── client/            # JavaScript/TypeScript client SDK
│   ├── index.js      # Main IOTA client
│   └── identity.js   # DID management (placeholder)
├── config/           # Configuration files
├── test/             # Test files
└── package.json      # NPM dependencies
```

## Prerequisites

- Node.js 18+
- IOTA SDK v1.1+
- Access to IOTA/Shimmer node (mainnet, testnet, or local)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` and set:
- `NODE_URL`: IOTA node endpoint
- `NETWORK`: Network name (mainnet, testnet, devnet)
- `MNEMONIC`: Your BIP39 mnemonic phrase (for write operations)

### 3. Generate Mnemonic (if needed)

For testing, you can generate a new mnemonic:
- Visit: https://iancoleman.io/bip39/
- Generate a 24-word mnemonic
- **Keep it secret and secure**

## Usage

### Basic Client Usage

```javascript
import IOTAClient from './client/index.js';

// Initialize client
const client = new IOTAClient('https://api.testnet.shimmer.network');
await client.initialize(process.env.MNEMONIC);

// Register a vehicle
const registration = await client.registerVehicle(
    'vehicle-001',
    'publicKeyHex'
);
console.log(`Vehicle registered in block: ${registration.blockId}`);

// Submit security alert
const alert = await client.submitSecurityAlert(
    'alert-001',
    'vehicle-001',
    'collision-warning',
    'high',
    'Potential collision detected'
);
console.log(`Alert submitted in block: ${alert.blockId}`);

// Query vehicle
const vehicle = await client.getVehicle('vehicle-001');
console.log(vehicle);

// Query security alert
const alertData = await client.getSecurityAlert('alert-001');
console.log(alertData);

// Get all vehicles
const vehicles = await client.getAllVehicles();
console.log(`Total vehicles: ${vehicles.length}`);

// Get network health
const health = await client.getNetworkHealth();
console.log(`Network healthy: ${health.isHealthy}`);
console.log(`Messages per second: ${health.messagesPerSecond}`);
```

## Testing

Run tests:

```bash
npm test
```

**Note**: Some tests are skipped by default as they require write access (mnemonic). To run all tests:
1. Set up a valid mnemonic in `.env`
2. Remove `.skip` from test descriptions
3. Run `npm test`

## Architecture

### Data Structure

IOTA uses a Tagged Data payload format:

**Vehicle Registration:**
```json
{
  "tag": "ITS_VEHICLE",
  "data": {
    "type": "VEHICLE_REGISTRATION",
    "vehicleId": "vehicle-001",
    "publicKey": "0xabc...",
    "timestamp": 1234567890
  }
}
```

**Security Alert:**
```json
{
  "tag": "ITS_ALERT",
  "data": {
    "type": "SECURITY_ALERT",
    "alertId": "alert-001",
    "vehicleId": "vehicle-001",
    "alertType": "collision-warning",
    "severity": "high",
    "description": "...",
    "timestamp": 1234567890
  }
}
```

### Querying Data

IOTA doesn't have a traditional query system. Data is retrieved by:
1. **Block ID**: Direct lookup if you know the block ID
2. **Tags**: Query all blocks with a specific tag (e.g., `ITS_VEHICLE`)
3. **Indexation**: Custom indexing layer (not implemented in skeleton)

## Performance Characteristics

Based on `docs/06-comparacao-plataformas.puml`:

- **Consensus**: Tangle (DAG)
- **Transaction Rate**: Very High (1000+ TPS theoretical)
- **Network Type**: Public Distributed
- **Privacy**: Low (public data)
- **Operational Cost**: Zero (no transaction fees)
- **Scalability**: Very High
- **ITS Suitability**: ★★★★☆ (High Potential)

## Key Features

### Advantages
- ✅ **Feeless**: No transaction costs
- ✅ **High Throughput**: Scales with network activity
- ✅ **M2M Communication**: Ideal for IoT/V2V scenarios
- ✅ **Fast Confirmation**: Messages confirmed by milestones

### Limitations
- ⚠️ **Public Data**: All data is publicly visible
- ⚠️ **Query Complexity**: Tag-based queries can be slow for large datasets
- ⚠️ **Eventual Consistency**: Confirmation may take time
- ⚠️ **Limited Privacy**: Not suitable for sensitive data without encryption

## Network Options

### Mainnet (IOTA)
- Production network
- URL: `https://api.mainnet.iotaledger.net`
- Explorer: https://explorer.iota.org/mainnet

### Testnet (Shimmer)
- Testing network with test tokens
- URL: `https://api.testnet.shimmer.network`
- Explorer: https://explorer.shimmer.network/testnet
- Faucet: https://faucet.testnet.shimmer.network

### Devnet
- Development network
- URL: `https://api.devnet.iotaledger.net`
- Explorer: https://explorer.iota.org/devnet

### Local Node
- Run your own IOTA node using Hornet
- URL: `http://localhost:14265`
- Guide: https://wiki.iota.org/hornet/welcome

## Future Enhancements

### IOTA Identity Integration
The `client/identity.js` file is a placeholder for IOTA Identity (DID) integration:
- Decentralized Identifiers (DIDs) for vehicles
- Verifiable Credentials for vehicle authentication
- Zero-Knowledge Proofs for privacy

### Private Data Streams
- Implement encrypted data streams
- Use IOTA Streams for private communication channels
- Selective disclosure of data

## TODO

- [ ] Implement IOTA Identity (DID) integration
- [ ] Add encrypted data support
- [ ] Implement custom indexing layer for efficient queries
- [ ] Add IOTA Streams for private channels
- [ ] Implement performance benchmarking
- [ ] Add local node setup guide
- [ ] Implement MAM (Masked Authenticated Messaging) for private data
- [ ] Add monitoring and metrics collection

## Resources

- [IOTA Documentation](https://wiki.iota.org/)
- [IOTA SDK](https://github.com/iotaledger/iota-sdk)
- [IOTA Identity](https://wiki.iota.org/identity.rs/introduction)
- [Shimmer Network](https://shimmer.network/)
