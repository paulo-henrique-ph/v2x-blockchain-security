# Makefile for v2x-blockchain-security
# Supports running tests for multiple platforms (Fabric, Ethereum, IOTA)

.PHONY: test test-fabric test-ethereum test-iota test-all

test:
	@echo "Run tests in specific platform directories"

# Run Hyperledger Fabric tests

test-fabric:
	cd hyperledger-fabric/test && npm test

# Run Ethereum PoA tests

test-ethereum:
	cd ethereum-poa && npm test

# Run IOTA tests

test-iota:
	cd iota && npm test

# Run all tests sequentially

test-all: test-fabric test-ethereum test-iota
