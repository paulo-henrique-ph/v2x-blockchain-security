# Changelog - IOTA Tangle

All notable changes to the IOTA Tangle module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-06

### Added - Initial Release

#### IOTA Client (JavaScript/ES6)
- **IOTAClient Implementation** (520+ lines)
  - Client initialization with Shimmer testnet support
  - Secret manager integration for secure key handling
  - Block-based data storage in Tangle
  - Tagged data for organized message retrieval
  - UTF-8 encoding/decoding utilities
  - Comprehensive error handling

#### Core Features
- **Vehicle Registration**
  - Register vehicles in the Tangle with PKI
  - Store vehicle ID and public key
  - Tagged with `ITS_VEHICLE` for easy retrieval
  - Immutable registration records

- **V2X Message Submission**
  - Submit V2V/V2I messages to the Tangle
  - Support for all message types (EMERGENCY_BRAKE, TRAFFIC_LIGHT, etc.)
  - Priority-based classification (0=critical, 1=high, 2=normal)
  - Latency tracking for performance analysis
  - Tagged with `ITS_V2X` for indexing
  - Digital signature inclusion
  - GPS coordinates (latitude/longitude)

- **Security Alert Submission**
  - Log security incidents in the Tangle
  - Alert type and severity classification
  - Tagged with `ITS_ALERT` for monitoring
  - Immutable incident records

- **Query Operations**
  - Query blocks by block ID
  - Query messages by tag (`ITS_V2X`, `ITS_VEHICLE`, `ITS_ALERT`)
  - Query messages by type (EMERGENCY_BRAKE, etc.)
  - Query messages by sender ID
  - Query vehicle information
  - Empty result handling

- **Network Health Monitoring**
  - Tangle health metrics
  - Network status checking
  - Confirmation rate monitoring
  - Milestone tracking

#### DAG Architecture Benefits
- **Feeless Transactions** - No transaction fees
- **Parallel Processing** - Multiple transactions simultaneously
- **Infinite Scalability** - More users = more throughput
- **Fast Confirmation** - Milestone-based finality
- **Lightweight PoW** - Minimal computational requirements

#### Research Scenarios
- **Scenario A - Emergency Brake (Critical)**
  - Message types: EMERGENCY_BRAKE, ACCIDENT_ALERT
  - Priority: 0 (Critical)
  - Fast propagation in the Tangle
  - Latency tracking validated

- **Scenario B - Traffic Light V2I**
  - Message types: TRAFFIC_LIGHT, PRIORITY_REQUEST
  - Priority: 1 (High)
  - V2I infrastructure coordination
  - Infrastructure message handling

- **Scenario C - Road Conditions**
  - Message types: WET_ROAD, LOW_VISIBILITY, ROAD_CONDITION
  - Priority: 2 (Normal)
  - Environmental condition sharing
  - Adverse weather alerts

#### Testing
- **26+ Comprehensive Tests**
  - Initialization tests (connection, error handling)
  - Vehicle registration tests
  - V2X message submission for all scenarios (A, B, C)
  - Security alert tests
  - Query operations (block, tag, type, sender)
  - Network health tests
  - Vehicle operation tests
  - Edge cases and validation errors
  - AAA (Arrange-Act-Assert) pattern throughout
  - 100% mock coverage for offline testing

#### Message Structure
- **Tagged Data Organization**
  - `ITS_V2X` - V2X messages (emergency, traffic, conditions)
  - `ITS_VEHICLE` - Vehicle registry
  - `ITS_ALERT` - Security alerts

- **V2X Message Fields**
  - type: "V2X_MESSAGE"
  - messageId: Unique identifier
  - messageHash: SHA-256 hash
  - messageType: EMERGENCY_BRAKE, TRAFFIC_LIGHT, etc.
  - senderId: Vehicle or RSU ID
  - timestamp: ISO 8601 format
  - priority: 0 (critical), 1 (high), 2 (normal)
  - location: {lat, lon}
  - signature: Digital signature
  - status: "submitted", "validated", "rejected"

#### Observability
- **OpenTelemetry Integration**
  - Distributed tracing for Tangle operations
  - PoW latency metrics
  - Message submission tracking
  - Confirmation time monitoring
  - Network health metrics
  - Prometheus endpoint (`http://localhost:9093/metrics`)
  - OTLP exporter for Jaeger integration

#### Identity Management
- **IOTA Identity (DID)**
  - Decentralized identifier support
  - Self-sovereign identity for vehicles
  - Verifiable credentials
  - Privacy-preserving authentication
  - Integration with @iota/identity-wasm

#### Configuration
- **Config File** (`config/config.json`)
  - Network endpoint (Shimmer testnet/mainnet)
  - Node URLs
  - PoW settings
  - Timeout configurations
  - Retry policies

#### Documentation
- Complete implementation guide (IMPLEMENTATION_COMPLETE.md)
- DAG architecture explanation
- API usage examples
- Test coverage report
- Comparison with traditional blockchain

### Performance Characteristics
- **Confirmation Time**: ~10 seconds (milestone-based)
- **Transaction Fees**: Zero (feeless)
- **Scalability**: Increases with network activity
- **Throughput**: 1000+ TPS potential
- **PoW**: Lightweight (client-side)
- **Parallelism**: High (DAG structure)

### Technical Specifications
- **Platform**: IOTA Tangle (Shimmer)
- **Language**: JavaScript (ES6 modules)
- **SDK**: @iota/sdk v1.1.0
- **Identity**: @iota/identity-wasm v1.0.0
- **Testing**: Jest with ES module support
- **Network**: Shimmer testnet (api.testnet.shimmer.network)
- **Metrics Port**: 9093

### Security Features
- Digital signature verification
- Immutable message storage
- Decentralized identity (DID)
- No single point of failure
- Distributed consensus via milestones
- Cryptographic message linking

---

## Future Enhancements

### Planned for v1.1.0
- IOTA Streams for encrypted data channels
- Advanced indexing for faster queries
- Local snapshot support
- Message expiration handling
- Enhanced DID integration

### Planned for v1.2.0
- Smart contract support (IOTA Smart Contracts)
- Layer 2 data availability
- Cross-Tangle communication
- Enhanced privacy with Masked Authenticated Messaging (MAM)
- Tokenization of assets

### Research Extensions
- Performance comparison with blockchain under various loads
- Confirmation time analysis with different Tangle congestion levels
- Energy consumption measurements
- Scalability testing with increasing vehicle density

---

**Project**: V2X Blockchain Security for ITS  
**Author**: Paulo Henrique Gomes Pinto  
**License**: GPL-2.0  
**Institution**: USP/Esalq MBA Research Project  
**Network**: IOTA Tangle (Shimmer)
