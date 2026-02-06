package main

import (
	"context"
	"fmt"
	"log"
	"time"

	pb "github.com/phgp/v2x-gateway-rsu/internal/infrastructure/adapters/grpc/pb"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	// Connect to gRPC server
	conn, err := grpc.Dial("localhost:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	client := pb.NewV2XServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	fmt.Println("===========================================")
	fmt.Println("V2X Gateway RSU - gRPC Client Example")
	fmt.Println("===========================================\n")

	// 1. Process a single message
	fmt.Println("1. Processing single V2X message...")
	message := &pb.V2XMessageRequest{
		MessageId:   "MSG-GRPC-001",
		MessageType: "EMERGENCY_BRAKE",
		SenderId:    "VEHICLE-GRPC-001",
		Timestamp:   time.Now().Format(time.RFC3339),
		Priority:    0,
		Latitude:    -23.5505,
		Longitude:   -46.6333,
		Signature:   "grpc-test-signature",
		Metadata: map[string]string{
			"speed":     "60",
			"direction": "north",
		},
	}

	response, err := client.ProcessMessage(ctx, message)
	if err != nil {
		log.Fatalf("ProcessMessage failed: %v", err)
	}

	fmt.Printf("   Success: %v\n", response.Success)
	fmt.Printf("   Status: %s\n", response.Status)
	fmt.Printf("   TX Hash: %s\n", response.TxHash)
	fmt.Printf("   Latency: %dms\n\n", response.Latency)

	// 2. Process batch
	fmt.Println("2. Processing batch of messages...")
	batch := &pb.BatchRequest{
		Messages: []*pb.V2XMessageRequest{
			{
				MessageId:   "MSG-GRPC-002",
				MessageType: "TRAFFIC_JAM",
				SenderId:    "VEHICLE-GRPC-002",
				Timestamp:   time.Now().Format(time.RFC3339),
				Priority:    2,
				Latitude:    -23.5506,
				Longitude:   -46.6334,
				Signature:   "grpc-batch-sig-1",
			},
			{
				MessageId:   "MSG-GRPC-003",
				MessageType: "TRAFFIC_JAM",
				SenderId:    "VEHICLE-GRPC-003",
				Timestamp:   time.Now().Format(time.RFC3339),
				Priority:    2,
				Latitude:    -23.5507,
				Longitude:   -46.6335,
				Signature:   "grpc-batch-sig-2",
			},
		},
	}

	batchResponse, err := client.ProcessBatch(ctx, batch)
	if err != nil {
		log.Fatalf("ProcessBatch failed: %v", err)
	}

	fmt.Printf("   Success: %v\n", batchResponse.Success)
	fmt.Printf("   Status: %s\n\n", batchResponse.Status)

	// 3. Get statistics
	fmt.Println("3. Getting gateway statistics...")
	stats, err := client.GetStatistics(ctx, &pb.Empty{})
	if err != nil {
		log.Fatalf("GetStatistics failed: %v", err)
	}

	fmt.Printf("   Total Messages: %d\n", stats.TotalMessages)
	fmt.Printf("   Critical Messages: %d\n", stats.CriticalMessages)
	fmt.Printf("   Messages/Second: %d\n", stats.MessagesPerSecond)
	fmt.Printf("   Aggregated: %d\n", stats.AggregatedMessages)
	fmt.Printf("   Avg Latency: %.2fms\n", stats.AvgLatency)
	fmt.Printf("   Uptime: %s\n\n", stats.Uptime)

	// 4. Health check
	fmt.Println("4. Checking gateway health...")
	health, err := client.HealthCheck(ctx, &pb.Empty{})
	if err != nil {
		log.Fatalf("HealthCheck failed: %v", err)
	}

	fmt.Printf("   Status: %s\n", health.Status)
	fmt.Printf("   Version: %s\n", health.Version)
	fmt.Printf("   Timestamp: %s\n\n", health.Timestamp)

	// 5. Streaming example
	fmt.Println("5. Testing bidirectional streaming...")
	stream, err := client.StreamMessages(ctx)
	if err != nil {
		log.Fatalf("StreamMessages failed: %v", err)
	}

	// Send 3 messages via stream
	for i := 1; i <= 3; i++ {
		streamMsg := &pb.V2XMessageRequest{
			MessageId:   fmt.Sprintf("MSG-STREAM-%03d", i),
			MessageType: "PERIODIC_STATUS",
			SenderId:    "VEHICLE-STREAM-001",
			Timestamp:   time.Now().Format(time.RFC3339),
			Priority:    3,
			Latitude:    -23.5505 + float64(i)*0.0001,
			Longitude:   -46.6333 + float64(i)*0.0001,
			Signature:   fmt.Sprintf("stream-sig-%d", i),
		}

		if err := stream.Send(streamMsg); err != nil {
			log.Fatalf("Failed to send stream message: %v", err)
		}

		// Receive response
		streamResp, err := stream.Recv()
		if err != nil {
			log.Fatalf("Failed to receive stream response: %v", err)
		}

		fmt.Printf("   Stream message %d: Success=%v, Status=%s\n", i, streamResp.Success, streamResp.Status)
	}

	if err := stream.CloseSend(); err != nil {
		log.Fatalf("Failed to close stream: %v", err)
	}

	fmt.Println("\n===========================================")
	fmt.Println("All gRPC operations completed successfully!")
	fmt.Println("===========================================")
}
