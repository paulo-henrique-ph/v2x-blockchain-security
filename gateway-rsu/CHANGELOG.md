# Changelog - Gateway RSU

All notable changes to the V2X Gateway RSU module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-06

### Added - Initial Release
- **Hexagonal Architecture Implementation**
  - Clean separation of domain, application, and infrastructure layers
  - Port and adapter pattern for extensibility
  - Pure Go domain logic with no external dependencies

- **Core Features**
  - V2X message processing with validation
  - Digital signature validation (RSA/ECDSA)
  - Replay attack prevention with time-windowed cache
  - Message plausibility checks
  - Critical message detection and prioritization
  - Thread-safe statistics collection

- **API Endpoints**
  - REST API (`/api/v1/messages`, `/api/v1/stats`, `/health`)
  - gRPC API support for high-performance scenarios
  - Health check endpoint for monitoring

- **Security Services**
  - PKI integration for certificate validation
  - Certificate revocation checking
  - Replay attack detection with TTL-based cache
  - Signature verification for all messages

- **Blockchain Integration**
  - Abstract blockchain adapter interface
  - Support for multiple blockchain platforms
  - Asynchronous transaction submission
  - Batch processing capability

- **Observability**
  - OpenTelemetry instrumentation
  - Distributed tracing with OTLP exporter
  - Prometheus metrics endpoint (`http://localhost:3000/metrics`)
  - Request/response tracing
  - Performance monitoring

- **Testing**
  - Comprehensive unit test coverage
  - Integration tests for all major components
  - Test coverage for domain, application, and infrastructure layers

- **Documentation**
  - Complete README with architecture overview
  - API documentation
  - gRPC quickstart guide
  - Deployment instructions

### Performance
- Sub-5ms latency for domain logic
- Support for 10,000+ messages per second
- Native Go concurrency with goroutines
- Minimal memory footprint

### Technical Specifications
- **Language**: Go 1.21+
- **Architecture**: Hexagonal (Ports & Adapters)
- **Protocols**: REST (HTTP/HTTPS), gRPC
- **Metrics Port**: 3000
- **Health Check**: `/health`

---

## Future Enhancements

### Planned for v1.1.0
- Rate limiting per vehicle/sender
- Advanced analytics dashboard
- Message queue integration (Kafka/RabbitMQ)
- Enhanced monitoring with custom metrics
- Load balancing support

### Planned for v1.2.0
- Multi-region deployment support
- Advanced caching strategies
- Message persistence layer
- WebSocket support for real-time updates

---

**Project**: V2X Blockchain Security for ITS  
**Author**: Paulo Henrique Gomes Pinto  
**License**: GPL-2.0  
**Institution**: USP/Esalq MBA Research Project
