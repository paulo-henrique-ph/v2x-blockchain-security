### Benchmarking Framework for ITS Blockchain Comparison

This directory contains a comprehensive benchmarking and comparative analysis framework for evaluating blockchain platforms in Intelligent Transportation Systems (ITS).

## Overview

The framework implements the metrics and methodology defined in the research document (`docs/BlockchainSecurityArchitectureITS.md`, Section 5: Quadro de métricas).

## Structure

```
benchmarks/
├── framework/              # Core benchmarking framework
│   ├── metrics.js         # Metrics collection
│   ├── benchmark-runner.js # Benchmark orchestration
│   ├── comparative-analysis.js # Cross-platform analysis
│   ├── run-benchmark.js   # CLI runner
│   ├── analyze-results.js # Analysis script
│   └── generate-report.js # Report generation
├── collectors/            # Platform-specific collectors
│   ├── fabric-collector.js
│   ├── ethereum-collector.js
│   └── iota-collector.js
├── scenarios/             # Test scenarios
│   ├── its-scenarios.js   # ITS use case scenarios
│   └── load-generator.js  # Load pattern generator
├── results/               # Benchmark results (generated)
│   ├── hyperledger-fabric/
│   ├── ethereum-poa/
│   └── iota/
├── reports/               # Generated reports
└── package.json
```

## Metrics Collected

Based on Section 5 of the research document:

### 1. Latency Metrics
- **E2E Latency**: OBU → confirmation/acceptance (ms)
- **Consensus Latency**: Proposal → commit/finality (ms)
- **Query Latency**: Read operation response time (ms)

### 2. Throughput Metrics
- **TPS (Transactions Per Second)**: Confirmed transactions per second
- **Confirmation Rate**: % of submitted transactions confirmed

### 3. Resource Metrics
- **CPU Usage**: % utilization per node
- **Memory Usage**: MB per node
- **Network Overhead**: Bytes sent/received

### 4. Robustness Metrics
- **Rejection Rate**: % malicious messages rejected
- **Error Rate**: % failed transactions
- **Availability**: % uptime under load

### 5. Scalability Metrics
- **TPS vs Validators**: Performance with varying validator count
- **TPS vs Load**: Performance under different load levels

## Test Scenarios

Based on Section 4.2 of the research:

### Scenario A: Critical Safety Message
- **Type**: Accident/emergency braking alert
- **Criticality**: CRITICAL
- **Max Latency**: 100ms
- **Reliability**: 99.9%

### Scenario B: V2I Infrastructure
- **Type**: Traffic signal coordination
- **Criticality**: HIGH
- **Max Latency**: 500ms
- **Reliability**: 99%

### Scenario C: Environmental Conditions
- **Type**: Road conditions, weather alerts
- **Criticality**: MEDIUM
- **Max Latency**: 1000ms
- **Reliability**: 95%

### Scenario D: Vehicle Registration
- **Type**: Identity and credential registration
- **Criticality**: LOW
- **Max Latency**: 5000ms
- **Reliability**: 100%

### Scenario E: Telemetry Data
- **Type**: Periodic vehicle status
- **Criticality**: LOW
- **Max Latency**: 2000ms
- **Reliability**: 90%

## Usage

### Installation

```bash
cd benchmarks
npm install
```

### Running Benchmarks

#### Single Platform

```bash
# Hyperledger Fabric
npm run benchmark:fabric

# Ethereum PoA
npm run benchmark:ethereum

# IOTA Tangle
npm run benchmark:iota
```

#### All Platforms

```bash
npm run benchmark:all
```

#### Custom Configuration

```bash
node framework/run-benchmark.js \
  --platform fabric \
  --transactions 1000 \
  --concurrency 10 \
  --duration 120 \
  --warmup 20
```

### Options

- `--platform <type>`: Platform to benchmark (fabric, ethereum, iota, all)
- `--transactions <number>`: Number of test transactions (default: 100)
- `--concurrency <number>`: Concurrency level (default: 1)
- `--duration <number>`: Test duration in seconds (default: 60)
- `--warmup <number>`: Number of warmup transactions (default: 10)

### Analyzing Results

```bash
# Run comparative analysis
npm run analyze

# Generate comprehensive report
npm run report
```

## Load Patterns

The framework supports multiple load patterns:

### 1. Constant Load
- Steady message rate throughout test duration
- Best for baseline performance measurement

### 2. Ramp-Up Load
- Linear increase from base rate to 5x
- Tests platform scalability limits

### 3. Spike Load
- Sudden 10x traffic burst
- Simulates emergency situations (mass accident alerts)

### 4. Wave Load
- Sinusoidal traffic pattern
- Simulates traffic flow variations

## Results

### Output Files

After running benchmarks, the following files are generated:

```
results/<platform>/
  ├── summary-<timestamp>.json    # Statistical summary
  └── raw-<timestamp>.json        # Raw metrics data

reports/
  ├── comparative-analysis-<timestamp>.json  # Cross-platform analysis
  ├── benchmark-report-<timestamp>.md        # Markdown report
  └── comparison-results.csv                 # CSV export
```

### Summary Format

```json
{
  "platform": "hyperledger-fabric",
  "timestamp": "2024-...",
  "duration": 60000,
  "latency": {
    "e2e": { "min": 45.2, "avg": 78.3, "p95": 120.5, "p99": 145.8, "max": 180.2 },
    "consensus": { "min": 40.1, "avg": 72.4, "p95": 110.3 },
    "query": { "min": 5.2, "avg": 12.8, "p95": 25.1 }
  },
  "throughput": {
    "tps": { "avg": 1250.3, "max": 2100.5 },
    "confirmationRate": { "avg": 99.8 }
  },
  "robustness": {
    "rejectionRate": { "avg": 100.0 },
    "errorRate": { "avg": 0.2 }
  }
}
```

## Platform-Specific Tests

### Hyperledger Fabric
- PBFT/RAFT consensus latency measurement
- Private channel performance
- Endorsement policy impact

### Ethereum PoA
- Gas cost analysis
- Block confirmation time
- Smart contract call overhead

### IOTA
- Message attachment time (PoW)
- Milestone confirmation latency
- Tag-based query performance
- Feeless transaction characteristics

## Comparative Analysis

The framework provides:

1. **Latency Comparison**: Cross-platform latency analysis
2. **Throughput Comparison**: TPS and confirmation rates
3. **Robustness Comparison**: Error handling and resilience
4. **Overall Scoring**: Weighted score based on research criteria
5. **Trade-off Analysis**: Advantages/disadvantages per platform
6. **Use Case Recommendations**: Best platform for specific scenarios

### Scoring Criteria

Based on research requirements:
- **Performance**: 30% (latency + TPS)
- **Privacy**: 25%
- **Control/Governance**: 20%
- **Cost**: 15%
- **Maturity**: 10%

## Example Workflow

```bash
# 1. Install dependencies
npm install

# 2. Run benchmarks for all platforms
npm run benchmark:all

# 3. Analyze results
npm run analyze

# 4. Generate report
npm run report

# 5. View results
cat reports/benchmark-report-*.md
```

## Integration with Platforms

The benchmark framework integrates with platform clients:

```javascript
// Hyperledger Fabric
import FabricClient from '../hyperledger-fabric/client/nodejs/index.js';

// Ethereum PoA
import EthereumClient from '../ethereum-poa/client/index.js';

// IOTA
import IOTAClient from '../iota/client/index.js';
```

**Note**: Currently uses mock clients for testing. Uncomment and configure actual client imports when platform implementations are complete.

## Extending the Framework

### Adding New Metrics

```javascript
// In metrics.js
recordCustomMetric(value) {
    this.metrics.custom.push({
        timestamp: Date.now(),
        value: value
    });
}
```

### Adding New Scenarios

```javascript
// In its-scenarios.js
export const ITSScenarios = {
    customScenario: {
        name: 'Custom Scenario',
        description: '...',
        generateMessage: (id, seq) => ({ /* ... */ })
    }
};
```

### Adding New Load Patterns

```javascript
// In load-generator.js
async generateCustomPattern() {
    // Custom load generation logic
}
```

## TODO

- [ ] Integrate with actual platform clients
- [ ] Add real-time monitoring dashboard
- [ ] Implement distributed load testing
- [ ] Add security attack simulation
- [ ] Generate visual charts (latency graphs, TPS plots)
- [ ] Add database storage for historical results
- [ ] Implement CI/CD integration
- [ ] Add performance regression detection

## References

- Research Document: `docs/BlockchainSecurityArchitectureITS.md`
- Platform Comparison: `docs/06-comparacao-plataformas.puml`
- Latency Model: `docs/04-modelo-avaliacao-latencia.puml`
- Throughput Model: `docs/05-modelo-avaliacao-throughput.puml`

## License

Part of V2V Blockchain Security research project (MBA USP/Esalq)
