# Generates LaTeX report and publication-ready figures

import pandas as pd
from jinja2 import Template

def generate_latex_report(results_file, template_file, output_file):
    df = pd.read_csv(results_file)
    p50 = df['latency'].quantile(0.50)
    p95 = df['latency'].quantile(0.95)
    p99 = df['latency'].quantile(0.99)
    with open(template_file) as f:
        template = Template(f.read())
    report = template.render(p50=p50, p95=p95, p99=p99)
    with open(output_file, 'w') as f:
        f.write(report)
    print(f"LaTeX report generated at {output_file}")

if __name__ == '__main__':
    generate_latex_report('../results/processed/latency.csv', '../results/processed/report-template.tex', '../results/processed/comparison-report.tex')
