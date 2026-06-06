package main

// @title V2X Gateway RSU API
// @version 1.0
// @description High-performance V2X Gateway RSU for secure vehicle-to-infrastructure communication with blockchain integration
// @description
// @description This API provides endpoints for:
// @description - Processing V2X messages (CAM, DENM, SPAT, MAP)
// @description - Message validation and security checks
// @description - Blockchain integration for immutable audit trails
// @description - Real-time statistics and health monitoring
//
// @contact.name Paulo Henrique Gomes Pinto
// @contact.url https://github.com/paulo-henrique-ph/v2v-blockchain-security
// @contact.email via GitHub Issues
//
// @license.name GNU General Public License v2.0
// @license.url https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html
//
// @host localhost:3000
// @BasePath /api/v1
// @schemes http https
//
// @tag.name Messages
// @tag.description V2X message processing endpoints
// @tag.name Health
// @tag.description Health check and statistics endpoints

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/phgp/v2x-gateway-rsu/docs" // Swagger docs
	"github.com/phgp/v2x-gateway-rsu/internal/application/services"
	"github.com/phgp/v2x-gateway-rsu/internal/infrastructure/adapters/blockchain"
	"github.com/phgp/v2x-gateway-rsu/internal/infrastructure/adapters/grpc"
	pb "github.com/phgp/v2x-gateway-rsu/internal/infrastructure/adapters/grpc/pb"
	"github.com/phgp/v2x-gateway-rsu/internal/infrastructure/adapters/rest"
	"github.com/phgp/v2x-gateway-rsu/internal/infrastructure/adapters/security"
	"github.com/phgp/v2x-gateway-rsu/pkg/telemetry"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	httpSwagger "github.com/swaggo/http-swagger"
	grpcLib "google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

func main() {
	fmt.Println("===========================================")
	fmt.Println("V2X Gateway RSU - Golang Implementation")
	fmt.Println("Hexagonal Architecture (Ports & Adapters)")
	fmt.Println("===========================================")

	// Initialize OpenTelemetry
	telemetryConfig := telemetry.DefaultConfig()
	telemetryCleanup, err := telemetry.Initialize(telemetryConfig)
	if err != nil {
		log.Fatalf("Failed to initialize OpenTelemetry: %v", err)
	}
	defer telemetryCleanup()
	fmt.Println("✅ OpenTelemetry initialized (Tracing + Metrics)")

	// Hexagonal Architecture - Dependency Wiring
	// 1. Output Adapters (Infrastructure)
	securityAdapter := security.NewSecurityAdapter()
	blockchainAdapter := blockchain.NewBlockchainAdapter()

	// 2. Application Service (implements Input Port)
	messageProcessingService := services.NewMessageProcessingService(
		securityAdapter,
		blockchainAdapter,
	)

	// 3. Input Adapters
	// 3a. REST Adapter
	restAdapter := rest.NewRestAdapter(messageProcessingService)

	// 3b. gRPC Adapter
	grpcAdapter := grpc.NewGrpcAdapter(messageProcessingService)

	// Setup gRPC server
	grpcPort := ":50051"
	lis, err := net.Listen("tcp", grpcPort)
	if err != nil {
		log.Fatalf("Failed to listen on gRPC port %s: %v", grpcPort, err)
	}

	grpcServer := grpcLib.NewServer()
	pb.RegisterV2XServiceServer(grpcServer, grpcAdapter)

	// Enable gRPC reflection for tools like grpcurl
	reflection.Register(grpcServer)

	// Start gRPC server in background
	go func() {
		fmt.Printf("\ngRPC server started on localhost%s\n", grpcPort)
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("Failed to serve gRPC: %v", err)
		}
	}()

	// Setup REST HTTP routes
	http.HandleFunc("/api/v1/messages", restAdapter.HandleV2XMessage)
	http.HandleFunc("/api/v1/stats", restAdapter.HandleGetStats)
	http.HandleFunc("/health", restAdapter.HandleHealthCheck)
	http.Handle("/metrics", promhttp.Handler())        // Prometheus metrics endpoint
	http.Handle("/swagger/", httpSwagger.WrapHandler) // Swagger UI endpoint

	// Start REST server in background
	restPort := ":3000"
	go func() {
		fmt.Printf("REST API started on http://localhost%s\n", restPort)
		if err := http.ListenAndServe(restPort, nil); err != nil {
			log.Fatalf("Failed to serve REST: %v", err)
		}
	}()

	fmt.Println("\nArchitecture Layers:")
	fmt.Println("  Domain: entities.V2XMessage, usecases.ProcessMessage")
	fmt.Println("  Application: services.MessageProcessingService")
	fmt.Println("  Infrastructure: SecurityAdapter, BlockchainAdapter, RestAdapter, GrpcAdapter")
	fmt.Println("\nProtocols:")
	fmt.Printf("  - REST: http://localhost%s\n", restPort)
	fmt.Printf("  - gRPC: localhost%s\n", grpcPort)
	fmt.Println("\nObservability:")
	fmt.Printf("  - Metrics (Prometheus): http://localhost%s/metrics\n", restPort)
	fmt.Printf("  - Traces (OTLP): %s\n", telemetryConfig.OTLPEndpoint)
	fmt.Println("\nAll systems operational")
	fmt.Println("===========================================\n")

	// Wait for interrupt signal to gracefully shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	fmt.Println("\nShutting down gracefully...")
	telemetryCleanup() // Clean up telemetry first
	grpcServer.GracefulStop()
	fmt.Println("Goodbye!")
}





