// Package services contains application services
// Hexagonal Architecture - Application Layer
package services

import (
	"fmt"
	"sync/atomic"
	"time"

	"github.com/phgp/v2x-gateway-rsu/internal/application/ports"
	"github.com/phgp/v2x-gateway-rsu/internal/domain/entities"
	"github.com/phgp/v2x-gateway-rsu/internal/domain/usecases"
)

// MessageProcessingService implements MessageProcessingPort
type MessageProcessingService struct {
	processMessageUseCase *usecases.ProcessMessageUseCase
	stats                 Statistics
}

// Statistics holds processing statistics
type Statistics struct {
	TotalReceived  uint64
	TotalValidated uint64
	TotalRejected  uint64
	TotalSubmitted uint64
	TotalAggregated uint64
}

// NewMessageProcessingService creates a new application service
func NewMessageProcessingService(
	securityPort ports.SecurityPort,
	blockchainPort ports.BlockchainPort,
) *MessageProcessingService {
	return &MessageProcessingService{
		processMessageUseCase: usecases.NewProcessMessageUseCase(
			securityPort,
			blockchainPort,
		),
	}
}

// ProcessMessage processes a V2X message (implements IMessageProcessingPort)
func (s *MessageProcessingService) ProcessMessage(messageDTO map[string]interface{}) (*ports.ProcessingResult, error) {
	// Start tracing span
	ctx := context.Background()
	ctx, span := telemetry.StartSpan(ctx, "ProcessMessage")
	defer span.End()

	startTime := time.Now()
	atomic.AddUint64(&s.stats.TotalReceived, 1)

	// Extract message details for tracing
	messageID := fmt.Sprintf("%v", messageDTO["messageId"])
	messageType := fmt.Sprintf("%v", messageDTO["messageType"])
	priority := 0
	if p, ok := messageDTO["priority"].(int); ok {
		priority = p
	}

	// Set span attributes
	telemetry.SetSpanAttributes(ctx,
		attribute.String("message.id", messageID),
		attribute.String("message.type", messageType),
		attribute.Int("message.priority", priority),
	)

	// Convert DTO to Domain Entity
	message, err := s.dtoToEntity(messageDTO)
	if err != nil {
		atomic.AddUint64(&s.stats.TotalRejected, 1)
		span.RecordError(err)
		span.SetStatus(codes.Error, "Failed to convert DTO to entity")
		telemetry.RecordError(ctx, "dto_conversion_error", "message_processing_service")

		return &ports.ProcessingResult{
			Success:   false,
			Error:     err.Error(),
			MessageID: messageID,
			Timestamp: time.Now().Format(time.RFC3339),
		}, err
	}

	telemetry.AddSpanEvent(ctx, "message.converted")

	// Execute use case
	result, err := s.processMessageUseCase.Execute(message)

	// Calculate latency
	latencyMs := float64(time.Since(startTime).Milliseconds())

	// Update statistics
	if result.Success {
		atomic.AddUint64(&s.stats.TotalValidated, 1)
		if result.Status == "submitted" {
			atomic.AddUint64(&s.stats.TotalSubmitted, 1)
		} else if result.Status == "aggregated" {
			atomic.AddUint64(&s.stats.TotalAggregated, 1)
		}
		span.SetStatus(codes.Ok, "Message processed successfully")
		telemetry.AddSpanEvent(ctx, "message.processed",
			attribute.String("status", result.Status),
			attribute.String("tx_hash", result.TxHash),
		)
	} else {
		atomic.AddUint64(&s.stats.TotalRejected, 1)
		span.SetStatus(codes.Error, result.Reason)
		if err != nil {
			span.RecordError(err)
			telemetry.RecordError(ctx, "processing_error", "message_processing_service")
		}
	}

	// Record metrics
	telemetry.RecordMessage(ctx, messageType, priority, result.Success)
	telemetry.RecordLatency(ctx, latencyMs, messageType)
	telemetry.RecordProcessingDuration(ctx, latencyMs, "process_message")

	return result, err
}

// ProcessBatch processes multiple messages
func (s *MessageProcessingService) ProcessBatch(messageDTOs []map[string]interface{}) (*ports.ProcessingResult, error) {
	successCount := 0
	failureCount := 0

	for _, dto := range messageDTOs {
		result, _ := s.ProcessMessage(dto)
		if result.Success {
			successCount++
		} else {
			failureCount++
		}
	}

	return &ports.ProcessingResult{
		Success:   true,
		Status:    "batch_processed",
		MessageID: fmt.Sprintf("batch_%d_messages", len(messageDTOs)),
		Timestamp: time.Now().Format(time.RFC3339),
	}, nil
}

// GetStatistics returns processing statistics
func (s *MessageProcessingService) GetStatistics() (map[string]interface{}, error) {
	return map[string]interface{}{
		"processing": map[string]uint64{
			"totalReceived":  atomic.LoadUint64(&s.stats.TotalReceived),
			"totalValidated": atomic.LoadUint64(&s.stats.TotalValidated),
			"totalRejected":  atomic.LoadUint64(&s.stats.TotalRejected),
			"totalSubmitted": atomic.LoadUint64(&s.stats.TotalSubmitted),
			"totalAggregated": atomic.LoadUint64(&s.stats.TotalAggregated),
		},
	}, nil
}

// HealthCheck returns health status
func (s *MessageProcessingService) HealthCheck() (map[string]interface{}, error) {
	return map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().Format(time.RFC3339),
		"rsuId":     "RSU-GO-001",
	}, nil
}

// dtoToEntity converts DTO to domain entity
func (s *MessageProcessingService) dtoToEntity(dto map[string]interface{}) (*entities.V2XMessage, error) {
	messageID, _ := dto["messageId"].(string)
	messageType, _ := dto["messageType"].(string)
	senderID, _ := dto["senderId"].(string)
	signature, _ := dto["signature"].(string)

	priority, _ := dto["priority"].(float64)
	latitude, _ := dto["latitude"].(float64)
	longitude, _ := dto["longitude"].(float64)

	timestampStr, _ := dto["timestamp"].(string)
	timestamp, err := time.Parse(time.RFC3339, timestampStr)
	if err != nil {
		timestamp = time.Now()
	}

	metadata, _ := dto["metadata"].(map[string]interface{})

	return entities.NewV2XMessage(
		messageID,
		messageType,
		senderID,
		timestamp,
		int(priority),
		latitude,
		longitude,
		signature,
		metadata,
	)
}
