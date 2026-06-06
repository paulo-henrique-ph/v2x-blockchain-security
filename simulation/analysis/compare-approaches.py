# Compares simulation results with standalone benchmarks
# ...implementation stub...

import pandas as pd
from scipy import stats

def compare_platforms(fabric_file, ethereum_file, iota_file):
    fabric = pd.read_csv(fabric_file)
    ethereum = pd.read_csv(ethereum_file)
    iota = pd.read_csv(iota_file)
    h_stat, p_value = stats.kruskal(
        fabric['latency'],
        ethereum['latency'],
        iota['latency']
    )
    print(f"Kruskal-Wallis H-statistic: {h_stat}, p-value: {p_value}")

if __name__ == '__main__':
    compare_platforms('../results/processed/fabric-latency.csv', '../results/processed/ethereum-latency.csv', '../results/processed/iota-latency.csv')
