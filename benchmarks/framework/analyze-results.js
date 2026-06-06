#!/usr/bin/env node

/**
 * Results Analysis Script
 * Analyzes and compares benchmark results
 */

import ComparativeAnalysis from './comparative-analysis.js';

async function main() {
    console.log('Starting comparative analysis...\n');

    const analyzer = new ComparativeAnalysis();

    try {
        await analyzer.analyze();
        console.log('\n✅ Analysis completed!');
        console.log('\nNext step: npm run report');
    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        process.exit(1);
    }
}

main();
