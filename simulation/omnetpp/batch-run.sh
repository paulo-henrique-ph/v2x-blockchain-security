#!/bin/bash
# Batch execution script for OMNeT++ simulation runs

PLATFORMS=(fabric ethereum iota)
SCENARIOS=(urban highway mixed)
VEHICLES=(50 100 200)

for platform in "${PLATFORMS[@]}"; do
  for scenario in "${SCENARIOS[@]}"; do
    for v in "${VEHICLES[@]}"; do
      echo "Running $platform $scenario $v vehicles"
      # Example OMNeT++ run command (replace with actual)
      ./run-veins -u Cmdenv -c "${scenario^}${v}V-${platform^}" > "../results/raw/${platform}_${scenario}_${v}v.log" 2>&1
    done
  done
done
