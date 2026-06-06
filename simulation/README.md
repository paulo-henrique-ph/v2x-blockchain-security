# Simulation Framework for ITS Blockchain Evaluation

## Overview

This simulation framework integrates **SUMO + OMNeT++ + Veins** to evaluate blockchain platforms for V2V/V2I communication in realistic ITS scenarios.

## Why SUMO + OMNeT++ + Veins?

### Academic Justification

1. **Industry Standard**: Most cited framework in vehicular network research
2. **Realistic Modeling**:
   - SUMO provides realistic traffic simulation
   - OMNeT++ provides network stack simulation
   - Veins bridges vehicular mobility with network communication
3. **Reproducibility**: Open-source tools with extensive documentation
4. **Validation**: Used in hundreds of IEEE/ACM papers
5. **Flexibility**: Can integrate custom blockchain modules

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OMNeT++ (Network Simulator)              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Veins Framework (V2X)                    │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  Application Layer                             │  │  │
│  │  │  - V2V/V2I Message Generation                  │  │  │
│  │  │  - Security Alert Processing                   │  │  │
│  │  │  - Blockchain Transaction Submission           │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  Blockchain Integration Layer                  │  │  │
│  │  │  - Fabric Client Module                        │  │  │
│  │  │  - Ethereum Client Module                      │  │  │
│  │  │  - IOTA Client Module                          │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  802.11p / DSRC Communication                  │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│              SUMO (Traffic Simulator)                       │
│  - Vehicle Mobility Models                                  │
│  - Road Network Topology                                    │
│  - Traffic Flow Simulation                                  │
└─────────────────────────────────────────────────────────────┘
```

## Tools Overview

### 1. SUMO (Simulation of Urban MObility)
- **Purpose**: Realistic traffic simulation
- **Provides**: Vehicle mobility, traffic patterns, road networks
- **Version**: Latest stable (1.19.0+)
- **License**: Eclipse Public License 2.0

### 2. OMNeT++
- **Purpose**: Discrete event network simulator
- **Provides**: Network protocol stack, packet transmission, delays
- **Version**: 6.0+
- **License**: Academic Public License

### 3. Veins (Vehicles in Network Simulation)
- **Purpose**: V2X communication framework
- **Provides**: V2V/V2I protocols, 802.11p/DSRC, integration SUMO↔OMNeT++
- **Version**: 5.3+
- **License**: GPL

## Installation

### Prerequisites

- Linux (Ubuntu 22.04 LTS recommended) or macOS
- 8GB+ RAM, 4+ cores
- Python 3.8+
- C++ compiler (g++, clang)

### Step 1: Install SUMO

```bash
# Ubuntu
sudo add-apt-repository ppa:sumo/stable
sudo apt-get update
sudo apt-get install sumo sumo-tools sumo-doc

# Verify installation
sumo --version
```

### Step 2: Install OMNeT++

```bash
# Download OMNeT++ 6.0
wget https://github.com/omnetpp/omnetpp/releases/download/omnetpp-6.0/omnetpp-6.0-linux-x86_64.tgz
tar xvf omnetpp-6.0-linux-x86_64.tgz
cd omnetpp-6.0

# Configure and build
. setenv
./configure
make

# Add to PATH
echo 'export PATH=$PATH:~/omnetpp-6.0/bin' >> ~/.bashrc
source ~/.bashrc
```

### Step 3: Install Veins

```bash
# Download Veins
git clone https://github.com/sommer/veins.git
cd veins

# Configure
./configure
make

# Test
cd examples/veins
./run -u Cmdenv
```

## Simulation Scenarios

Based on research Section 4.2:

### Scenario 1: Urban Intersection (Critical Safety)
- **Location**: Urban grid with signalized intersections
- **Vehicles**: 50-200 vehicles
- **Events**: Emergency braking, collision warnings
- **Blockchain**: Test critical message latency (<100ms requirement)

### Scenario 2: Highway Segment (V2I Communication)
- **Location**: 5km highway with RSUs
- **Vehicles**: 100-500 vehicles
- **Events**: Traffic coordination, speed advisories
- **Blockchain**: Test V2I infrastructure communication

### Scenario 3: Adverse Conditions (Environmental)
- **Location**: Mixed urban/highway
- **Vehicles**: Variable
- **Events**: Weather alerts, road condition warnings
- **Blockchain**: Test medium-priority messages

## Integration with Blockchain Platforms

### Architecture

```
Veins Application (C++)
        ↓
    JSON-RPC / REST API
        ↓
Blockchain Client (Node.js/Go)
        ↓
Blockchain Network
```

### Implementation Approach

1. **Veins C++ Module** → Generates V2V/V2I messages
2. **Bridge Process** → Converts to blockchain transactions
3. **Blockchain Client** → Submits to Fabric/Ethereum/IOTA
4. **Metrics Collection** → Record latency, TPS, etc.

## Metrics Collection

Implements Section 5 (Quadro de métricas):

### In OMNeT++/Veins

```ini
# omnetpp.ini
[General]
# Statistics collection
**.scalar-recording = true
**.vector-recording = true

# Latency measurement
**.app.messageLatency.statistic = histogram
**.app.e2eLatency.statistic = histogram

# Throughput
**.app.messagesGenerated.statistic = count
**.app.messagesConfirmed.statistic = count

# Network overhead
**.nic.mac.throughput.statistic = mean
```

### Collected Metrics

| Metric | Collection Point | Export Format |
|--------|------------------|---------------|
| E2E Latency | Veins App → Blockchain confirmation | CSV, Vector |
| Consensus Latency | Blockchain client timing | JSON |
| TPS | Message rate / confirmation rate | Scalar |
| CPU/Memory | System monitoring (top/htop) | CSV |
| Network Overhead | OMNeT++ NIC statistics | Vector |
| Packet Loss | OMNeT++ MAC layer | Scalar |

## Experimental Design

Based on Section 4.4:

### Variables

- **Independent**:
  - Number of vehicles: [50, 100, 200, 500]
  - Number of RSUs: [5, 10, 20]
  - Number of validators: [4, 7, 10]
  - Message rate: [10, 50, 100, 200] msg/s
  - Blockchain platform: [Fabric, Ethereum, IOTA]

- **Dependent**:
  - E2E latency (percentiles: p50, p95, p99)
  - Consensus latency
  - TPS
  - CPU/Memory usage
  - Network overhead
  - Message loss rate

### Experimental Runs

```
Total configurations: 4 × 3 × 3 × 4 × 3 = 432 configurations
Repetitions per config: 5 (for statistical validity)
Total simulation runs: 2,160 runs
```

### Simulation Duration
- **Warmup**: 100 seconds
- **Measurement**: 500 seconds
- **Cooldown**: 100 seconds
- **Total per run**: ~12 minutes

## Directory Structure

```
simulation/
├── sumo/                      # SUMO scenarios
│   ├── networks/             # Road networks (.net.xml)
│   ├── routes/               # Vehicle routes (.rou.xml)
│   ├── configs/              # SUMO configs (.sumocfg)
│   └── maps/                 # OSM map files
├── omnetpp/                   # OMNeT++ projects
│   ├── simulations/          # .ini configuration files
│   ├── src/                  # C++ source code
│   │   ├── blockchain/      # Blockchain integration modules
│   │   ├── apps/            # Application layer
│   │   └── utils/           # Helper utilities
│   └── results/             # Simulation results (.sca, .vec)
├── scenarios/                 # Scenario definitions
│   ├── scenario1-urban.py
│   ├── scenario2-highway.py
│   └── scenario3-mixed.py
├── integration/              # Blockchain integration
│   ├── fabric-bridge.js
│   ├── ethereum-bridge.js
│   └── iota-bridge.js
├── analysis/                 # Result analysis scripts
│   ├── parse-results.py
│   ├── plot-latency.py
│   └── generate-report.py
└── results/                  # Processed results
    ├── raw/
    ├── processed/
    └── figures/
```

## Running Simulations

### 1. Generate SUMO Scenario

```bash
cd simulation/scenarios
python3 generate-urban-scenario.py \
  --vehicles 100 \
  --duration 600 \
  --network urban-grid

# Output: simulation/sumo/scenarios/urban-100v/
```

### 2. Run OMNeT++ Simulation

```bash
cd simulation/omnetpp
./run-veins -u Cmdenv -c Urban100V-Fabric

# Or batch mode
./batch-run.sh --platform fabric --scenario urban --vehicles 100
```

### 3. Collect Results

```bash
cd simulation/analysis
python3 parse-results.py \
  --input ../omnetpp/results/ \
  --output ../results/processed/ \
  --platform fabric
```

### 4. Generate Report

```bash
python3 generate-report.py \
  --results ../results/processed/ \
  --output ../results/comparison-report.pdf
```

## Validation

### Model Validation Steps

1. **SUMO Validation**:
   - Compare vehicle densities with real traffic data
   - Validate speed distributions
   - Check traffic flow patterns

2. **Network Validation**:
   - Verify 802.11p parameters (range, datarate)
   - Validate packet loss rates
   - Check propagation models

3. **Blockchain Validation**:
   - Benchmark standalone blockchain performance
   - Compare with native client measurements
   - Validate integration overhead

## Analysis Scripts

### Latency Analysis (Python)

```python
import pandas as pd
import matplotlib.pyplot as plt

# Load results
df = pd.read_csv('results/latency.csv')

# Calculate percentiles
p50 = df['latency'].quantile(0.50)
p95 = df['latency'].quantile(0.95)
p99 = df['latency'].quantile(0.99)

# Plot CDF
df['latency'].plot.hist(cumulative=True, bins=100)
plt.xlabel('Latency (ms)')
plt.ylabel('CDF')
plt.savefig('latency-cdf.pdf')
```

### Comparative Analysis

```python
import pandas as pd
from scipy import stats

# Load data for all platforms
fabric = pd.read_csv('results/fabric-latency.csv')
ethereum = pd.read_csv('results/ethereum-latency.csv')
iota = pd.read_csv('results/iota-latency.csv')

# Statistical test (Kruskal-Wallis)
h_stat, p_value = stats.kruskal(
    fabric['latency'],
    ethereum['latency'],
    iota['latency']
)

print(f"H-statistic: {h_stat}, p-value: {p_value}")
```

## Integration with Existing Benchmarks

The simulation results can be cross-validated with the standalone benchmarks:

```bash
# Run simulation-based benchmarks
cd simulation
./run-all-scenarios.sh

# Compare with standalone benchmarks
cd ../benchmarks
npm run benchmark:all

# Generate comparison report
python3 ../simulation/analysis/compare-approaches.py
```

## Expected Outputs for Research

1. **Performance Metrics** (Section 5):
   - Latency CDFs and percentiles
   - TPS time series
   - Resource utilization graphs

2. **Statistical Analysis**:
   - ANOVA/Kruskal-Wallis tests
   - Confidence intervals (95%)
   - Effect sizes (Cohen's d)

3. **Visualizations**:
   - Latency box plots per platform
   - TPS bar charts
   - Scalability curves (vehicles vs latency)
   - Heat maps (validators × load → performance)

4. **Academic Report**:
   - LaTeX-formatted tables
   - Publication-ready figures
   - Statistical significance markers

## Publications Using This Approach

- Raya, M., & Hubaux, J. P. (2007). Securing vehicular ad hoc networks. *Journal of Computer Security*
- Mejri, M. N., et al. (2014). Survey on VANET security challenges and possible cryptographic solutions. *Vehicular Communications*
- Sharma, P. K., & Park, J. H. (2018). Blockchain based hybrid network architecture for the smart city. *Future Generation Computer Systems*

## Advantages for Academic Research

✅ **Reproducibility**: Open-source tools, documented configurations
✅ **Validation**: Cross-validation with standalone benchmarks
✅ **Credibility**: Industry-standard tools for V2X research
✅ **Realism**: Actual vehicle mobility and network constraints
✅ **Statistical Rigor**: Multiple runs, confidence intervals, hypothesis testing
✅ **Publication Ready**: IEEE/ACM accepted methodology

## Alternative: Caliper for Blockchain-Only Testing

If vehicle simulation is not required, **Hyperledger Caliper** can be used for blockchain-only benchmarks:

```bash
# Install Caliper
npm install -g @hyperledger/caliper-cli

# Run benchmark
caliper launch manager \
  --caliper-workspace ./ \
  --caliper-benchconfig benchmark-config.yaml \
  --caliper-networkconfig network-config.yaml
```

However, **SUMO+OMNeT+++Veins is recommended** for ITS research as it provides:
- Realistic V2V/V2I scenarios
- Network constraints (packet loss, interference)
- Mobility patterns affecting communication
- Geographic distribution (RSU coverage)

## TODO

- [ ] Create OMNeT++ blockchain integration modules
- [ ] Implement Veins application with blockchain client
- [ ] Generate SUMO scenarios for all test cases
- [ ] Create automated batch execution scripts
- [ ] Develop result parsing and analysis scripts
- [ ] Create LaTeX report templates
- [ ] Add statistical analysis automation
- [ ] Generate publication-ready figures

## References

- SUMO Documentation: https://sumo.dlr.de/docs/
- OMNeT++ Manual: https://doc.omnetpp.org/
- Veins Tutorial: https://veins.car2x.org/tutorial/
- Sommer, C., et al. (2011). "Bidirectionally Coupled Network and Road Traffic Simulation for Improved IVC Analysis." *IEEE TMC*

## Implementation Progress

All steps except package installation have been scaffolded:
- OMNeT++ blockchain integration modules (Fabric, Ethereum, IOTA)
- Veins application layer for V2V/V2I and blockchain client
- SUMO scenario generators for urban, highway, mixed
- Batch execution scripts for large-scale runs
- Python scripts for result parsing, analysis, and reporting
- LaTeX report template and figure placeholders
- Scenario definitions for all test cases
- Directory structure for raw, processed results, and figures
- Integration bridge stubs for Fabric, Ethereum, IOTA

Refer to the respective directories and files for further development.

## Next Steps
- Implement the logic in each stub file
- Install required packages and dependencies
- Run and validate the simulation
- Complete documentation and reproducibility steps
