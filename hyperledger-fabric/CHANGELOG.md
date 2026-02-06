# Changelog - Hyperledger Fabric
**Advisor**: Lucas José de Souza
**Institution**: USP/Esalq MBA Research Project  
**License**: GPL-2.0  
**Author**: Paulo Henrique Gomes Pinto  
**Project**: V2X Blockchain Security for ITS  

---

- Privacy-preserving techniques evaluation
- Comparison with other consensus algorithms
- Performance optimization under high load
- Byzantine fault tolerance analysis
### Research Extensions

- Advanced endorsement policies
- Interoperability with other networks
- Enhanced privacy with Zero-Knowledge Proofs
- Smart contract-based governance
- Fabric Gateway (new SDK) migration
### Planned for v1.2.0

- Multi-channel support
- Chaincode upgrade procedures
- Enhanced query capabilities with indexes
- Event hub integration for real-time notifications
- Private data collections for sensitive information
### Planned for v1.1.0

## Future Enhancements

---

- Audit trail with provenance
- Immutable ledger
- Chaincode-level access control
- Endorsement policies
- Channel-based privacy
- PKI-based identity management
### Security Features

- **Metrics Port**: 9092
- **Consensus**: RAFT
- **State Database**: CouchDB (recommended) or LevelDB
- **SDK**: fabric-network 2.2.20
- **Client Language**: Node.js (JavaScript)
- **Chaincode Language**: Go
- **Platform**: Hyperledger Fabric 2.2+
### Technical Specifications

- **Privacy**: Private channels and collections
- **Scalability**: Horizontal scaling with peer nodes
- **Latency**: Sub-200ms for critical messages
- **Throughput**: 1000+ TPS capability
- **Consensus**: RAFT (crash fault tolerant)
### Performance Characteristics

- API examples and usage patterns
- Metrics implementation guide (Section 5)
- Research alignment documentation (Section 4.2)
- Architecture diagrams (Section 4.3)
- Complete implementation guide (IMPLEMENTATION_COMPLETE.md)
#### Documentation

- **Channel Structure**: Private channels for different use cases
- **Endorsement Policy**: Configurable multi-peer endorsement
- **World State**: CouchDB (rich queries) or LevelDB
- **Consensus**: RAFT ordering service
#### Network Architecture

  - Policies and capabilities
  - Organization definitions
  - Orderer configuration (RAFT consensus)
  - Channel configuration
- **ConfigTX** (`configtx.yaml`)

  - Channel and chaincode information
  - Certificate authority configuration
  - Peer and orderer endpoints
  - Network topology definition
- **Connection Profile** (`connection-profile.json`)
#### Configuration

  - Custom spans for fabric operations
  - OTLP exporter for Jaeger
  - Prometheus metrics endpoint (`http://localhost:9092/metrics`)
  - Transaction throughput monitoring
  - Endorsement and consensus latency tracking
  - Distributed tracing for chaincode invocations
- **OpenTelemetry Integration**
#### Observability

  - Integration test support
  - Mock-based unit testing
  - AAA (Arrange-Act-Assert) pattern throughout
  - MetricsCollector for all scenarios
  - FabricClient SDK integration tests
- **Client Tests (Node.js)** - 26+ passing tests

  - Error handling and edge cases
  - Security alert submission
  - Message retrieval and rich queries
  - V2X message submission (valid, replay, unregistered)
  - Vehicle registration (normal and duplicate)
- **Chaincode Tests (Go)** - 15+ unit tests
#### Testing

  - Environmental monitoring support
  - Target latency: <500ms
  - Priority: 2 (Normal)
  - Message types: WET_ROAD, LOW_VISIBILITY, ROAD_CONDITION
- **Scenario C - Condições Adversas**

  - V2I infrastructure integration
  - Target latency: <200ms
  - Priority: 1 (High)
  - Message types: TRAFFIC_LIGHT, PRIORITY_REQUEST
- **Scenario B - Semáforo Inteligente e Prioridade Dinâmica**

  - Validated through comprehensive tests
  - Target latency: <100ms
  - Priority: 0 (Critical)
  - Message types: EMERGENCY_BRAKE, ACCIDENT_ALERT
- **Scenario A - Alerta de Acidente/Frenagem Brusca**
#### Research Scenarios Implementation

  - Performance report generation
  - Percentile calculations (p50, p95, p99)
  - Replay attack detection counters
  - Reliability metrics (confirmation rate, rejection rate)
  - Resource usage monitoring (CPU/memory/network)
  - Throughput calculation (TPS)
  - Consensus latency tracking
  - End-to-end latency measurement
- **MetricsCollector** (Research Metrics)

  - Error handling and retry logic
  - Transaction proposal and endorsement handling
  - Security alert submission
  - Query operations (by ID, type, sender)
  - V2X message submission with latency tracking
  - Vehicle registration workflow
  - Contract interaction layer
  - Gateway and Network connection management
- **FabricClient** (Complete SDK Integration)
#### Node.js Client SDK

  - CouchDB rich queries support
  - Status tracking (pending/validated/rejected)
  - Immutable audit trail
  - Sender verification (registered vehicles only)
  - Replay attack prevention (duplicate detection)
- **Security Features**

  - Message hash storage (not full payload)
  - `SecurityAlert` struct for incident tracking
  - `V2XMessage` struct with complete message details
  - `Vehicle` struct with registration metadata
- **Data Structures**

  - `GetAllSecurityAlerts()` - Audit trail access
  - `GetAllVehicles()` - Administrative function for vehicle listing
  - `GetVehicle()` - Vehicle information retrieval
  - `SubmitSecurityAlert()` - Security incident logging
  - `QueryMessagesBySender()` - Filter messages by sender vehicle
  - `QueryMessagesByType()` - Filter messages by type (EMERGENCY_BRAKE, etc.)
  - `GetV2XMessage()` - Query message by ID
  - `SubmitV2XMessage()` - V2X message validation and storage
  - `RegisterVehicle()` - Vehicle registration with PKI integration
- **ITSContract Implementation**
#### Chaincode (Smart Contract - Go)

### Added - Initial Release

## [1.0.0] - 2026-02-06

and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),

All notable changes to the Hyperledger Fabric module will be documented in this file.

