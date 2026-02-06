package grpc

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/phgp/v2x-gateway-rsu/internal/application/ports"
	pb "github.com/phgp/v2x-gateway-rsu/internal/infrastructure/adapters/grpc/pb"
)

// GrpcAdapter implements the gRPC server for V2X message processing
type GrpcAdapter struct {
	pb.UnimplementedV2XServiceServer
	messageProcessingService ports.MessageProcessingPort
}

// NewGrpcAdapter creates a new gRPC adapter
func NewGrpcAdapter(service ports.MessageProcessingPort) *GrpcAdapter {
	return &GrpcAdapter{
		messageProcessingService: service,
	}
}

// ProcessMessage handles a single V2X message via gRPC
func (g *GrpcAdapter) ProcessMessage(ctx context.Context, req *pb.V2XMessageRequest) (*pb.ProcessingResponse, error) {
	// Convert protobuf request to map (DTO)
	messageDTO := protoToMap(req)

	// Process through application service
	result, err := g.messageProcessingService.ProcessMessage(messageDTO)
	if err != nil {
		return &pb.ProcessingResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	// Convert result to protobuf response
	return mapToProtoResponse(result), nil
}

// ProcessBatch handles batch processing of V2X messages
func (g *GrpcAdapter) ProcessBatch(ctx context.Context, req *pb.BatchRequest) (*pb.ProcessingResponse, error) {
	// Convert batch to DTOs
	messageDTOs := make([]map[string]interface{}, len(req.Messages))
	for i, msg := range req.Messages {
		messageDTOs[i] = protoToMap(msg)
	}

	// Process batch
	result, err := g.messageProcessingService.ProcessBatch(messageDTOs)
	if err != nil {
		return &pb.ProcessingResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	return mapToProtoResponse(result), nil
}

// GetStatistics returns gateway statistics
func (g *GrpcAdapter) GetStatistics(ctx context.Context, req *pb.Empty) (*pb.StatisticsResponse, error) {
	stats, err := g.messageProcessingService.GetStatistics()
	if err != nil {
		return nil, err
	}

	// Convert stats map to protobuf
	response := &pb.StatisticsResponse{}

	if val, ok := stats["totalMessages"].(int64); ok {
		response.TotalMessages = val
	}
	if val, ok := stats["criticalMessages"].(int64); ok {
		response.CriticalMessages = val
	}
	if val, ok := stats["messagesPerSecond"].(int64); ok {
		response.MessagesPerSecond = val
	}
	if val, ok := stats["aggregatedMessages"].(int64); ok {
		response.AggregatedMessages = val
	}
	if val, ok := stats["avgLatency"].(float64); ok {
		response.AvgLatency = val
	}
	if val, ok := stats["uptime"].(string); ok {
		response.Uptime = val
	}

	// Message types
	if msgTypes, ok := stats["messageTypes"].(map[string]int64); ok {
		response.MessageTypes = msgTypes
	}

	return response, nil
}

// HealthCheck performs a health check
func (g *GrpcAdapter) HealthCheck(ctx context.Context, req *pb.Empty) (*pb.HealthResponse, error) {
	health, err := g.messageProcessingService.HealthCheck()
	if err != nil {
		return nil, err
	}

	response := &pb.HealthResponse{
		Timestamp: time.Now().Format(time.RFC3339),
		Components: make(map[string]string),
	}

	if val, ok := health["status"].(string); ok {
		response.Status = val
	}
	if val, ok := health["version"].(string); ok {
		response.Version = val
	}
	if components, ok := health["components"].(map[string]string); ok {
		response.Components = components
	}

	return response, nil
}

// StreamMessages handles bidirectional streaming of V2X messages
func (g *GrpcAdapter) StreamMessages(stream pb.V2XService_StreamMessagesServer) error {
	for {
		// Receive message from client
		req, err := stream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}

		// Process message
		messageDTO := protoToMap(req)
		result, err := g.messageProcessingService.ProcessMessage(messageDTO)

		var response *pb.ProcessingResponse
		if err != nil {
			response = &pb.ProcessingResponse{
				Success: false,
				Error:   err.Error(),
			}
		} else {
			response = mapToProtoResponse(result)
		}

		// Send response back to client
		if err := stream.Send(response); err != nil {
			return err
		}
	}
}

// Helper: Convert protobuf message to map (DTO)
func protoToMap(req *pb.V2XMessageRequest) map[string]interface{} {
	return map[string]interface{}{
		"messageId":   req.MessageId,
		"messageType": req.MessageType,
		"senderId":    req.SenderId,
		"timestamp":   req.Timestamp,
		"priority":    int(req.Priority),
		"latitude":    req.Latitude,
		"longitude":   req.Longitude,
		"signature":   req.Signature,
		"metadata":    req.Metadata,
	}
}

// Helper: Convert processing result to protobuf response
func mapToProtoResponse(result *ports.ProcessingResult) *pb.ProcessingResponse {
	return &pb.ProcessingResponse{
		Success:   result.Success,
		TxHash:    result.TxHash,
		Status:    result.Status,
		MessageId: result.MessageID,
		Timestamp: result.Timestamp,
		Latency:   result.Latency,
		Reason:    result.Reason,
		Error:     result.Error,
	}
}
