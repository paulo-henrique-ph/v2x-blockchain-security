// Package usecases contains domain use cases
// Hexagonal Architecture - Domain Layer (Business Logic)
package usecases

import (
	"time"

	"github.com/phgp/v2x-gateway-rsu/internal/application/ports"
	"github.com/phgp/v2x-gateway-rsu/internal/domain/entities"
)

// ProcessMessageUseCase handles message processing business logic
type ProcessMessageUseCase struct {
	securityPort   ports.SecurityPort
	blockchainPort ports.BlockchainPort
}

// NewProcessMessageUseCase creates a new use case
func NewProcessMessageUseCase(
	securityPort ports.SecurityPort,
	blockchainPort ports.BlockchainPort,
) *ProcessMessageUseCase {
	return &ProcessMessageUseCase{
		securityPort:   securityPort,
		blockchainPort: blockchainPort,
	}
}

// Execute runs the message processing workflow
func (uc *ProcessMessageUseCase) Execute(message *entities.V2XMessage) (*ports.ProcessingResult, error) {
	startTime := time.Now()

	result := &ports.ProcessingResult{
		MessageID: message.MessageID,
		Timestamp: time.Now().Format(time.RFC3339),
	}

	// Business Rule: Validate signature
	isValid, err := uc.securityPort.ValidateSignature(message)
	if err != nil {
		result.Success = false
		result.Error = "Signature validation error"
		result.Latency = time.Since(startTime).Milliseconds()
		return result, err
	}
	if !isValid {
		result.Success = false
		result.Reason = "Invalid digital signature"
		result.Latency = time.Since(startTime).Milliseconds()
		return result, nil
	}

	// Business Rule: Check replay attack
	isReplay, err := uc.securityPort.CheckReplayAttack(
		message.MessageID,
		message.Timestamp.Format(time.RFC3339),
	)
	if err != nil {
		result.Success = false
		result.Error = "Replay check error"
		result.Latency = time.Since(startTime).Milliseconds()
		return result, err
	}
	if isReplay {
		result.Success = false
		result.Reason = "Replay attack detected"
		result.Latency = time.Since(startTime).Milliseconds()
		return result, nil
	}

	// Business Rule: Validate plausibility
	if !uc.securityPort.ValidatePlausibility(message) {
		result.Success = false
		result.Reason = "Implausible data detected"
		result.Latency = time.Since(startTime).Milliseconds()
		return result, nil
	}

	// Business Rule: Critical messages submit immediately
	if message.IsCritical() {
		txHash, err := uc.blockchainPort.SubmitTransaction(message.ToTransaction())
		if err != nil {
			result.Success = false
			result.Error = "Blockchain submission error"
			result.Latency = time.Since(startTime).Milliseconds()
			return result, err
		}

		result.Success = true
		result.TxHash = txHash
		result.Status = "submitted"
		result.Latency = time.Since(startTime).Milliseconds()
		return result, nil
	}

	// Business Rule: Non-critical messages should be aggregated
	result.Success = true
	result.Status = "aggregated"
	result.Latency = time.Since(startTime).Milliseconds()
	return result, nil
}
