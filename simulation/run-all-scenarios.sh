#!/bin/bash
# Runs all simulation scenarios in batch mode

python3 scenarios/generate-urban-scenario.py --vehicles 100 --duration 600 --network urban-grid
python3 scenarios/generate-highway-scenario.py --vehicles 200 --duration 600 --length 5000
python3 scenarios/generate-mixed-scenario.py --vehicles 150 --duration 600 --urban_ratio 0.5

cd omnetpp
bash batch-run.sh
cd ..
