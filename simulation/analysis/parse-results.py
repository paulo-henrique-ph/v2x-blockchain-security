# Parses OMNeT++/Veins simulation results for metrics extraction

import os
import pandas as pd
import glob

def parse_results(input_dir, output_file):
    # Find all OMNeT++ result files
    files = glob.glob(os.path.join(input_dir, '*.sca'))
    results = []
    for f in files:
        # Parse .sca file (stub: extract latency values)
        with open(f) as fin:
            for line in fin:
                if 'e2eLatency' in line:
                    # Example: extract value
                    parts = line.strip().split()
                    if len(parts) > 2:
                        results.append(float(parts[-1]))
    df = pd.DataFrame({'latency': results})
    df.to_csv(output_file, index=False)
    print(f"Parsed results saved to {output_file}")

if __name__ == '__main__':
    parse_results('../omnetpp/results/', '../results/processed/latency.csv')
