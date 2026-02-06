# Ethereum PoA Implementation for ITS Security

This directory contains the Ethereum Proof of Authority (PoA) implementation for the Vehicle-to-Vehicle (V2V) blockchain security system.

## Structure

```
ethereum-poa/
├── contracts/         # Solidity smart contracts
├── client/           # JavaScript client SDK
├── migrations/       # Truffle migration scripts
├── config/           # Network configuration (genesis.json)
├── test/             # Smart contract tests
├── truffle-config.js # Truffle configuration
└── package.json      # NPM dependencies
```

## Prerequisites

- Node.js 16+
- Truffle v5.11+
- Geth or compatible Ethereum client
- Web3.js v4+

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure PoA Network

Edit `config/genesis.json` and replace placeholders:
- `[SIGNER_ADDRESS]`: Address of the authority node (without 0x prefix)
- `[ACCOUNT_1]`, `[ACCOUNT_2]`, `[ACCOUNT_3]`: Pre-funded accounts

### 3. Initialize PoA Network

```bash
# Initialize the network with genesis block
geth init --datadir ./data config/genesis.json

# Start the network
geth --datadir ./data \
  --networkid 1337 \
  --http \
  --http.addr "0.0.0.0" \
  --http.port 8545 \
  --http.api "eth,net,web3,personal,admin,miner" \
  --mine \
  --miner.etherbase [SIGNER_ADDRESS] \
  --unlock [SIGNER_ADDRESS] \
  --password password.txt \
  --allow-insecure-unlock
```

### 4. Compile Smart Contracts

```bash
npm run compile
```

### 5. Deploy Smart Contracts

```bash
npm run migrate
```

## Usage

### Client API

```javascript
const EthereumPoAClient = require('./client/index');

const client = new EthereumPoAClient('http://localhost:8545');

// Initialize with contract address and private key
await client.initialize(
    '0xContractAddress',
    '0xYourPrivateKey'
);

// Register a vehicle
await client.registerVehicle('vehicle-001', 'publicKeyHex');

// Submit security alert
await client.submitSecurityAlert(
    'alert-001',
    'collision-warning',
    'high',
    'Potential collision detected'
);

// Query vehicle
const vehicle = await client.getVehicle('vehicle-001');

// Query security alert
const alert = await client.getSecurityAlert('alert-001');

// Get all vehicles
const vehicles = await client.getAllVehicles();

// Get statistics
const vehicleCount = await client.getVehicleCount();
const alertCount = await client.getAlertCount();
```

## Testing

Run smart contract tests:

```bash
npm test
```

## Smart Contracts

### ITSRegistry.sol

Main contract for managing vehicles and security alerts in the ITS network.

**Key Functions:**
- `registerVehicle(vehicleId, publicKey)`: Register a new vehicle
- `submitSecurityAlert(alertId, alertType, severity, description)`: Submit a security alert
- `getVehicle(vehicleId)`: Query vehicle information
- `getSecurityAlert(alertId)`: Query security alert
- `getAllVehicleIds()`: Get all registered vehicle IDs
- `getAllAlertIds()`: Get all submitted alert IDs

## Performance Characteristics

Based on `docs/06-comparacao-plataformas.puml`:

- **Consensus**: Proof of Authority (PoA)
- **Transaction Rate**: Moderate (100-500 TPS)
- **Network Type**: Public/Permissioned
- **Privacy**: Low (public) / Moderate (private)
- **Operational Cost**: Moderate (gas fees)
- **Scalability**: Moderate
- **ITS Suitability**: ★★★☆☆ (Moderate)

## PoA Configuration

Proof of Authority consensus parameters:
- **Block Time**: 5 seconds (configurable in genesis.json)
- **Epoch Length**: 30000 blocks
- **Gas Limit**: 8,000,000
- **Network ID**: 1337

## TODO

- [ ] Complete genesis.json configuration with actual addresses
- [ ] Add Docker Compose for multi-node PoA network
- [ ] Implement performance benchmarking scripts
- [ ] Add gas optimization analysis
- [ ] Configure multiple authority nodes
- [ ] Add monitoring and metrics collection
- [ ] Implement private transaction support
