# Hyperledger Fabric Implementation for ITS Security

This directory contains the Hyperledger Fabric implementation for V2X blockchain security in Intelligent Transportation Systems.

## Overview

Hyperledger Fabric provides a **permissioned blockchain** with:
- **PBFT/RAFT Consensus**: Byzantine fault tolerance
- **Private Channels**: Data isolation between organizations
- **Chaincode (Smart Contracts)**: V2X message validation and storage
- **MSP (Membership Service Provider)**: Identity management

This implementation serves as the **blockchain validator layer** that works with the RSU Gateway for complete V2X security.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Hyperledger Fabric Network                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Ordering Service (RAFT/Kafka)                               │
│      ↓                                                        │
│  Peer Nodes (Organizations)                                  │
│      ↓                                                        │
│  Chaincode (Smart Contract) - ITSContract                    │
│      • RegisterVehicle()                                     │
│      • SubmitV2XMessage()                                    │
│      • GetV2XMessage()                                       │
│      • QueryMessagesByType()                                 │
│      • SubmitSecurityAlert()                                 │
│                                                               │
│  World State (CouchDB/LevelDB)                               │
│      • Vehicles                                              │
│      • V2X Messages                                          │
│      • Security Alerts                                       │
└─────────────────────────────────────────────────────────────┘
```

## Structure

```
hyperledger-fabric/
├── chaincode/              # ✅ Blockchain Validator (Chaincode)
│   └── go/                 # Go chaincode implementation
│       ├── main.go         # ITSContract implementation
│       ├── main_test.go    # Comprehensive unit tests
│       └── go.mod          # Dependencies
├── client/                 # Client applications
│   └── nodejs/            # Node.js client SDK
├── config/                # Network configuration
│   ├── configtx.yaml      # Channel configuration
│   └── connection-profile.json  # Connection settings
└── test/                  # Integration tests
```

## Prerequisites

- Docker and Docker Compose
- Go 1.21+
- Node.js 16+
- Hyperledger Fabric binaries (v2.5+)

## Chaincode Implementation

### V2X Message Structure

```go
type V2XMessage struct {
    MessageID   string    `json:"messageId"`
    MessageHash string    `json:"messageHash"`
    MessageType string    `json:"messageType"`
    SenderID    string    `json:"senderId"`
    Timestamp   time.Time `json:"timestamp"`
    Priority    int       `json:"priority"`
    Location    Location  `json:"location"`
    Signature   string    `json:"signature"`
    Status      string    `json:"status"`
}
```

### Key Functions

#### 1. RegisterVehicle
```go
func RegisterVehicle(vehicleID string, publicKey string) error
```
Registers a vehicle in the network with its public key for signature validation.

#### 2. SubmitV2XMessage
```go
func SubmitV2XMessage(messageJSON string) error
```
Validates and stores V2X messages with:
- Replay attack prevention (duplicate check)
- Sender verification (vehicle must be registered)
- Immutable storage on blockchain

#### 3. GetV2XMessage
```go
func GetV2XMessage(messageID string) (*V2XMessage, error)
```
Retrieves a specific V2X message from the ledger.

#### 4. QueryMessagesByType
```go
func QueryMessagesByType(messageType string) ([]*V2XMessage, error)
```
Queries all messages of a specific type (e.g., "EMERGENCY_BRAKE").

#### 5. SubmitSecurityAlert
```go
func SubmitSecurityAlert(alertID, vehicleID, alertType, severity, description string, timestamp int64) error
```
Records security incidents in the immutable ledger.

## Setup and Deployment

### 1. Install Dependencies

#### Chaincode (Go)
```bash
cd chaincode/go
go mod download
go mod tidy
```

#### Client (Node.js)
```bash
cd client/nodejs
npm install
```

### 2. Run Chaincode Tests

```bash
cd chaincode/go
go test -v
```

**Expected Output:**
```
=== RUN   TestRegisterVehicle
=== RUN   TestSubmitV2XMessage
=== RUN   TestGetV2XMessage
...
PASS
ok      chaincode       2.456s
```

### 3. Build Chaincode

```bash
cd chaincode/go
go build
```

### 4. Deploy Network (Test Network)

```bash
# Navigate to Fabric test network
cd $FABRIC_SAMPLES/test-network

# Start network
./network.sh up createChannel -c itschannel -ca

# Deploy chaincode
./network.sh deployCC -ccn itscontract -ccp ../../v2v-blockchain-security/hyperledger-fabric/chaincode/go -ccl go
```

### 5. Interact with Chaincode

```bash
# Register a vehicle
peer chaincode invoke -o localhost:7050 \
  -C itschannel -n itscontract \
  --peerAddresses localhost:7051 \
  -c '{"function":"RegisterVehicle","Args":["VEHICLE-001","mock-public-key"]}'

# Submit V2X message
peer chaincode invoke -o localhost:7050 \
  -C itschannel -n itscontract \
  --peerAddresses localhost:7051 \
  -c '{"function":"SubmitV2XMessage","Args":["{\"messageId\":\"MSG-001\",\"messageHash\":\"hash123\",\"messageType\":\"EMERGENCY_BRAKE\",\"senderId\":\"VEHICLE-001\",\"timestamp\":\"2026-02-03T12:00:00Z\",\"priority\":0,\"location\":{\"lat\":-23.5505,\"lon\":-46.6333},\"signature\":\"sig\"}"]}'

# Query message
peer chaincode query -C itschannel -n itscontract \
  -c '{"function":"GetV2XMessage","Args":["MSG-001"]}'
```

```bash
# TODO: Add chaincode deployment commands
```

## Usage

### Client API

```javascript
const FabricClient = require('./client/nodejs/index');

const client = new FabricClient();
await client.connect();

// Register a vehicle
await client.registerVehicle('vehicle-001', 'publicKeyHex');

// Submit security alert
await client.submitSecurityAlert(
    'alert-001',
    'vehicle-001',
    'collision-warning',
    'high',
    'Potential collision detected',
    Date.now()
);

// Query vehicle
const vehicle = await client.queryVehicle('vehicle-001');

await client.disconnect();
```

## Testing

```bash
cd test
npm test
```

## Performance Characteristics

Based on `docs/06-comparacao-plataformas.puml`:

- **Consensus**: PBFT / RAFT
- **Transaction Rate**: High (1000-3500 TPS)
- **Network Type**: Private Consortium
- **Privacy**: Very High (Private Channels)
- **Operational Cost**: Low (no transaction fees)
- **Scalability**: Moderate/High
- **ITS Suitability**: ★★★★★ (Very Suitable)

## TODO

- [ ] Implement complete chaincode logic
- [ ] Add network deployment scripts (docker-compose)
- [ ] Implement client connection logic
- [ ] Add comprehensive tests
- [ ] Add performance benchmarking scripts
- [ ] Configure CA and identity management
- [ ] Add monitoring and logging
