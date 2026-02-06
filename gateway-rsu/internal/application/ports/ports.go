// Package ports defines interfaces for hexagonal architecture
// Application Layer - Ports (Interfaces)
package ports

import "github.com/phgp/v2x-gateway-rsu/internal/domain/entities"

// SecurityPort defines security validation interface (Output Port)
type SecurityPort interface {
	ValidateSignature(message *entities.V2XMessage) (bool, error)
	CheckReplayAttack(messageID string, timestamp string) (bool, error)
	ValidatePlausibility(message *entities.V2XMessage) bool
}

// BlockchainPort defines blockchain submission interface (Output Port)
type BlockchainPort interface {
	SubmitTransaction(transaction map[string]interface{}) (string, error)
	SubmitBatch(transactions []map[string]interface{}) (string, error)
}

// ProcessingResult represents the result of message processing
type ProcessingResult struct {
	Success   bool
	TxHash    string
	Status    string
	MessageID string
	Timestamp string
	Latency   int64
	Reason    string
	Error     string
}

// MessageProcessingPort defines message processing interface (Input Port)
type MessageProcessingPort interface {
	ProcessMessage(messageDTO map[string]interface{}) (*ProcessingResult, error)
	ProcessBatch(messageDTOs []map[string]interface{}) (*ProcessingResult, error)
	GetStatistics() (map[string]interface{}, error)
	HealthCheck() (map[string]interface{}, error)
}
