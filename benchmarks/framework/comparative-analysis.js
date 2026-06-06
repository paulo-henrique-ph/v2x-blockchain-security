/**
 * Comparative Analysis Tool
 * Analyzes and compares benchmark results across platforms
 */

import fs from 'fs';
import path from 'path';

export class ComparativeAnalysis {
    constructor() {
        this.platforms = ['hyperledger-fabric', 'ethereum-poa', 'iota'];
        this.results = new Map();
    }

    /**
     * Load results for all platforms
     */
    loadResults(resultsDir = 'benchmarks/results') {
        console.log('Loading benchmark results...');

        for (const platform of this.platforms) {
            const platformDir = path.resolve(resultsDir, platform);

            if (!fs.existsSync(platformDir)) {
                console.warn(`No results found for ${platform}`);
                continue;
            }

            // Find most recent summary file
            const files = fs.readdirSync(platformDir)
                .filter(f => f.startsWith('summary-') && f.endsWith('.json'))
                .sort()
                .reverse();

            if (files.length === 0) {
                console.warn(`No summary files found for ${platform}`);
                continue;
            }

            const summaryFile = path.join(platformDir, files[0]);
            const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
            this.results.set(platform, summary);

            console.log(`  Loaded ${platform}: ${files[0]}`);
        }

        return this.results;
    }

    /**
     * Compare latency metrics across platforms
     */
    compareLatency() {
        console.log('\n📊 Latency Comparison (milliseconds)\n');

        const comparison = {
            e2e: {},
            consensus: {},
            query: {}
        };

        for (const [platform, result] of this.results) {
            comparison.e2e[platform] = {
                avg: result.latency.e2e.avg,
                p95: result.latency.e2e.p95,
                p99: result.latency.e2e.p99,
                min: result.latency.e2e.min,
                max: result.latency.e2e.max
            };

            comparison.consensus[platform] = {
                avg: result.latency.consensus.avg,
                p95: result.latency.consensus.p95,
                p99: result.latency.consensus.p99
            };

            comparison.query[platform] = {
                avg: result.latency.query.avg,
                p95: result.latency.query.p95,
                p99: result.latency.query.p99
            };
        }

        // Print comparison table
        console.log('End-to-End Latency (E2E):');
        this.printComparisonTable(comparison.e2e, ['avg', 'p95', 'p99', 'min', 'max']);

        console.log('\nConsensus Latency:');
        this.printComparisonTable(comparison.consensus, ['avg', 'p95', 'p99']);

        console.log('\nQuery Latency:');
        this.printComparisonTable(comparison.query, ['avg', 'p95', 'p99']);

        return comparison;
    }

    /**
     * Compare throughput metrics across platforms
     */
    compareThroughput() {
        console.log('\n⚡ Throughput Comparison\n');

        const comparison = {};

        for (const [platform, result] of this.results) {
            comparison[platform] = {
                avgTPS: result.throughput.tps.avg,
                maxTPS: result.throughput.tps.max,
                confirmationRate: result.throughput.confirmationRate.avg
            };
        }

        this.printComparisonTable(comparison, ['avgTPS', 'maxTPS', 'confirmationRate']);

        return comparison;
    }

    /**
     * Compare robustness metrics across platforms
     */
    compareRobustness() {
        console.log('\n🛡️  Robustness Comparison\n');

        const comparison = {};

        for (const [platform, result] of this.results) {
            comparison[platform] = {
                rejectionRate: result.robustness.rejectionRate.avg,
                availability: result.robustness.availability.avg,
                errorRate: result.robustness.errorRate.avg
            };
        }

        this.printComparisonTable(comparison, ['rejectionRate', 'availability', 'errorRate']);

        return comparison;
    }

    /**
     * Calculate overall score for each platform
     * Based on weighted criteria from docs
     */
    calculateOverallScore() {
        console.log('\n🏆 Overall Score Calculation\n');
        console.log('Criteria weights (from research):');
        console.log('  - Performance (latency + TPS): 30%');
        console.log('  - Privacy: 25%');
        console.log('  - Control/Governance: 20%');
        console.log('  - Cost: 15%');
        console.log('  - Maturity: 10%\n');

        const scores = {};

        // Define criteria weights (from docs/06-comparacao-plataformas.puml)
        const weights = {
            performance: 0.30,
            privacy: 0.25,
            governance: 0.20,
            cost: 0.15,
            maturity: 0.10
        };

        // Platform characteristics (from documentation)
        const characteristics = {
            'hyperledger-fabric': {
                performance: 0.9,      // High TPS (1000-3500), low latency
                privacy: 1.0,          // Very high (private channels)
                governance: 1.0,       // Full control (consortium)
                cost: 1.0,             // Zero transaction fees
                maturity: 0.9          // Enterprise grade
            },
            'ethereum-poa': {
                performance: 0.6,      // Moderate TPS (100-500)
                privacy: 0.5,          // Low-moderate
                governance: 0.7,       // Permissioned but limited
                cost: 0.6,             // Gas costs
                maturity: 0.9          // Mature ecosystem
            },
            'iota': {
                performance: 0.9,      // High TPS (1000+)
                privacy: 0.3,          // Low (public)
                governance: 0.5,       // Limited for consortiums
                cost: 1.0,             // Zero fees
                maturity: 0.6          // Growing but less mature
            }
        };

        for (const platform of this.platforms) {
            if (!characteristics[platform]) continue;

            const char = characteristics[platform];
            const score =
                (char.performance * weights.performance) +
                (char.privacy * weights.privacy) +
                (char.governance * weights.governance) +
                (char.cost * weights.cost) +
                (char.maturity * weights.maturity);

            scores[platform] = {
                overall: score * 100,
                breakdown: {
                    performance: char.performance * weights.performance * 100,
                    privacy: char.privacy * weights.privacy * 100,
                    governance: char.governance * weights.governance * 100,
                    cost: char.cost * weights.cost * 100,
                    maturity: char.maturity * weights.maturity * 100
                }
            };
        }

        // Print scores
        for (const [platform, score] of Object.entries(scores)) {
            console.log(`${platform}:`);
            console.log(`  Overall Score: ${score.overall.toFixed(1)}%`);
            console.log(`  Breakdown:`);
            for (const [criterion, value] of Object.entries(score.breakdown)) {
                console.log(`    ${criterion}: ${value.toFixed(1)}%`);
            }
            console.log();
        }

        // Rank platforms
        const ranked = Object.entries(scores)
            .sort(([, a], [, b]) => b.overall - a.overall)
            .map(([platform, score], index) => ({
                rank: index + 1,
                platform,
                score: score.overall
            }));

        console.log('Final Ranking:');
        ranked.forEach(({ rank, platform, score }) => {
            const stars = '★'.repeat(Math.round(score / 20));
            console.log(`  ${rank}. ${platform}: ${score.toFixed(1)}% ${stars}`);
        });

        return { scores, ranked };
    }

    /**
     * Generate trade-off analysis
     */
    analyzeTradeoffs() {
        console.log('\n⚖️  Trade-off Analysis\n');

        const tradeoffs = {
            'hyperledger-fabric': {
                advantages: [
                    'Very high privacy (private channels)',
                    'Zero transaction costs',
                    'High performance (1000-3500 TPS)',
                    'Full control over participants',
                    'Enterprise maturity'
                ],
                disadvantages: [
                    'Complex setup and operation',
                    'Requires consortium governance',
                    'Higher infrastructure requirements'
                ],
                bestFor: 'Private consortium with strict privacy requirements'
            },
            'ethereum-poa': {
                advantages: [
                    'Mature ecosystem with extensive tooling',
                    'Smart contract flexibility',
                    'Well-documented and supported',
                    'Permissioned control'
                ],
                disadvantages: [
                    'Lower performance (100-500 TPS)',
                    'Gas costs for operations',
                    'Limited privacy (unless private network)',
                    'Block time constraints (5s)'
                ],
                bestFor: 'Scenarios requiring smart contract flexibility with moderate performance needs'
            },
            'iota': {
                advantages: [
                    'Very high scalability (1000+ TPS)',
                    'Zero transaction fees',
                    'Ideal for M2M communication',
                    'Fast message submission',
                    'Feeless microtransactions'
                ],
                disadvantages: [
                    'Low privacy (public network)',
                    'Complex query mechanisms (tag-based)',
                    'Longer confirmation times (milestones)',
                    'Less mature for consortium governance'
                ],
                bestFor: 'High-frequency, low-cost data exchange with public auditability'
            }
        };

        for (const [platform, analysis] of Object.entries(tradeoffs)) {
            console.log(`${platform.toUpperCase()}:\n`);
            console.log('✅ Advantages:');
            analysis.advantages.forEach(adv => console.log(`   - ${adv}`));
            console.log('\n⚠️  Disadvantages:');
            analysis.disadvantages.forEach(dis => console.log(`   - ${dis}`));
            console.log(`\n📌 Best for: ${analysis.bestFor}\n`);
            console.log('-'.repeat(60) + '\n');
        }

        return tradeoffs;
    }

    /**
     * Generate recommendations based on use cases
     */
    generateRecommendations() {
        console.log('\n💡 Recommendations by Use Case\n');

        const recommendations = {
            'Critical Safety Messages': {
                description: 'Collision warnings, emergency braking alerts',
                requirements: 'Low latency (<100ms), high reliability, auditability',
                recommended: 'Hyperledger Fabric',
                rationale: 'Best latency characteristics, high reliability, private channels for sensitive data',
                alternative: 'IOTA (if feeless operation is critical)'
            },
            'Infrastructure Communication (V2I)': {
                description: 'Traffic signal coordination, road condition updates',
                requirements: 'Moderate latency, high throughput, controlled access',
                recommended: 'Hyperledger Fabric',
                rationale: 'Consortium control, adequate performance, private coordination',
                alternative: 'Ethereum PoA (if smart contract logic is needed)'
            },
            'Public Audit Trail': {
                description: 'Event logging for regulatory compliance',
                requirements: 'Immutability, public verifiability, low cost',
                recommended: 'IOTA',
                rationale: 'Zero fees, public auditability, high scalability',
                alternative: 'Hyperledger Fabric (if privacy is also required)'
            },
            'Fleet Management': {
                description: 'Vehicle telemetry, status updates',
                requirements: 'High frequency, low cost, scalability',
                recommended: 'IOTA',
                rationale: 'Feeless transactions, handles high message volume',
                alternative: 'Hyperledger Fabric (for private fleet data)'
            },
            'Incident Resolution': {
                description: 'Accident evidence, dispute resolution',
                requirements: 'Strong non-repudiation, privacy, auditability',
                recommended: 'Hyperledger Fabric',
                rationale: 'Private channels, strong auditability, enterprise-grade',
                alternative: 'Ethereum PoA (for smart contract-based resolution)'
            }
        };

        for (const [useCase, rec] of Object.entries(recommendations)) {
            console.log(`${useCase}:`);
            console.log(`  Description: ${rec.description}`);
            console.log(`  Requirements: ${rec.requirements}`);
            console.log(`  ✅ Recommended: ${rec.recommended}`);
            console.log(`  Rationale: ${rec.rationale}`);
            console.log(`  Alternative: ${rec.alternative}\n`);
        }

        return recommendations;
    }

    /**
     * Print comparison table
     */
    printComparisonTable(data, metrics) {
        const platforms = Object.keys(data);
        const columnWidth = 20;

        // Header
        let header = 'Metric'.padEnd(columnWidth);
        platforms.forEach(p => {
            header += p.padEnd(columnWidth);
        });
        console.log(header);
        console.log('-'.repeat(header.length));

        // Data rows
        metrics.forEach(metric => {
            let row = metric.padEnd(columnWidth);
            platforms.forEach(platform => {
                const value = data[platform][metric];
                const formatted = typeof value === 'number' ? value.toFixed(2) : String(value);
                row += formatted.padEnd(columnWidth);
            });
            console.log(row);
        });
        console.log();
    }

    /**
     * Run complete comparative analysis
     */
    async analyze() {
        console.log('\n' + '='.repeat(80));
        console.log('COMPARATIVE ANALYSIS - Blockchain Platforms for ITS');
        console.log('='.repeat(80));

        this.loadResults();

        if (this.results.size === 0) {
            console.error('\n❌ No results found. Please run benchmarks first.');
            return null;
        }

        const analysis = {
            latency: this.compareLatency(),
            throughput: this.compareThroughput(),
            robustness: this.compareRobustness(),
            scores: this.calculateOverallScore(),
            tradeoffs: this.analyzeTradeoffs(),
            recommendations: this.generateRecommendations()
        };

        // Save analysis
        const outputFile = path.resolve('benchmarks', 'reports', `comparative-analysis-${Date.now()}.json`);
        const outputDir = path.dirname(outputFile);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
        console.log(`\n📄 Analysis saved to: ${outputFile}`);

        return analysis;
    }
}

export default ComparativeAnalysis;
