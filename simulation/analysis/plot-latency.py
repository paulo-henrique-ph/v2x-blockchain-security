# Plots latency CDFs and percentiles from processed results

import pandas as pd
import matplotlib.pyplot as plt

def plot_latency_cdf(input_file, output_file):
    df = pd.read_csv(input_file)
    df['latency'].plot.hist(cumulative=True, bins=100)
    plt.xlabel('Latency (ms)')
    plt.ylabel('CDF')
    plt.title('Latency CDF')
    plt.savefig(output_file)
    print(f"Latency CDF saved to {output_file}")

if __name__ == '__main__':
    plot_latency_cdf('../results/processed/latency.csv', '../results/figures/latency-cdf.pdf')
