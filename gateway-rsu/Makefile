.PHONY: build run test clean fmt vet coverage

# Build the application
build:
	go build -o bin/v2x-gateway cmd/server/main.go

# Run the application
run:
	go run cmd/server/main.go

# Run tests
test:
	go test ./... -v

# Run tests with coverage
coverage:
	go test ./... -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

# Format code
fmt:
	go fmt ./...

# Run go vet
vet:
	go vet ./...

# Clean build artifacts
clean:
	rm -rf bin/
	rm -f coverage.out coverage.html

# Install dependencies
deps:
	go mod tidy
	go mod download

# Run all checks
check: fmt vet test

# Build for production (optimized)
build-prod:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o bin/v2x-gateway-linux cmd/server/main.go
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags="-w -s" -o bin/v2x-gateway-windows.exe cmd/server/main.go

# Help
help:
	@echo "Available targets:"
	@echo "  build       - Build the application"
	@echo "  run         - Run the application"
	@echo "  test        - Run tests"
	@echo "  coverage    - Generate test coverage report"
	@echo "  fmt         - Format code"
	@echo "  vet         - Run go vet"
	@echo "  clean       - Clean build artifacts"
	@echo "  deps        - Install dependencies"
	@echo "  check       - Run all checks (fmt, vet, test)"
	@echo "  build-prod  - Build for production (Linux & Windows)"
	@echo "  proto-install - Install protobuf compiler tools"
	@echo "  proto       - Generate protobuf code"
