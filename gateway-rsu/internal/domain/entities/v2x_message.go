// Package entities contains domain entities with business logic
// Hexagonal Architecture - Domain Layer (Zero external dependencies)
package entities

import (
	"errors"
	"time"
)

// V2XMessage represents a V2X message with business rules
type V2XMessage struct {
	MessageID   string
	MessageType string
	SenderID    string
	Timestamp   time.Time
	Priority    int
	Latitude    float64
	Longitude   float64
	Signature   string
	Metadata    map[string]interface{}
}

// NewV2XMessage creates and validates a new V2XMessage
func NewV2XMessage(
	messageID, messageType, senderID string,
	timestamp time.Time,
	priority int,
	latitude, longitude float64,
	signature string,
	metadata map[string]interface{},
) (*V2XMessage, error) {
	msg := &V2XMessage{
		MessageID:   messageID,
		MessageType: messageType,
		SenderID:    senderID,
		Timestamp:   timestamp,
		Priority:    priority,
		Latitude:    latitude,
		Longitude:   longitude,
		Signature:   signature,
		Metadata:    metadata,
	}

	if err := msg.Validate(); err != nil {
		return nil, err
	}

	return msg, nil
}

// Validate checks domain invariants
func (m *V2XMessage) Validate() error {
	if m.MessageID == "" {
		return errors.New("messageID is required")
	}
	if m.MessageType == "" {
		return errors.New("messageType is required")
	}
	if m.SenderID == "" {
		return errors.New("senderID is required")
	}
	if m.Signature == "" {
		return errors.New("signature is required")
	}
	if m.Priority < 0 || m.Priority > 3 {
		return errors.New("priority must be between 0 and 3")
	}
	if m.Latitude < -90 || m.Latitude > 90 {
		return errors.New("latitude must be between -90 and 90")
	}
	if m.Longitude < -180 || m.Longitude > 180 {
		return errors.New("longitude must be between -180 and 180")
	}
	return nil
}

// IsCritical returns true if message is critical (business rule)
func (m *V2XMessage) IsCritical() bool {
	return m.Priority == 0
}

// ShouldAggregate returns true if message should be aggregated (business rule)
func (m *V2XMessage) ShouldAggregate(threshold int) bool {
	return m.Priority > threshold
}

// IsEmergency returns true if message is emergency type (business rule)
func (m *V2XMessage) IsEmergency() bool {
	emergencyTypes := map[string]bool{
		"EMERGENCY_BRAKE":              true,
		"COLLISION_WARNING":            true,
		"HAZARD_ALERT":                 true,
		"EMERGENCY_VEHICLE_APPROACHING": true,
	}
	return emergencyTypes[m.MessageType]
}

// GetUrgencyLevel returns urgency level based on priority (business rule)
func (m *V2XMessage) GetUrgencyLevel() string {
	levels := []string{"CRITICAL", "HIGH", "NORMAL", "LOW"}
	if m.Priority >= 0 && m.Priority < len(levels) {
		return levels[m.Priority]
	}
	return "UNKNOWN"
}

// IsFresh checks if message is within time window (business rule)
func (m *V2XMessage) IsFresh(maxAge time.Duration) bool {
	age := time.Since(m.Timestamp)
	return age <= maxAge && age >= -maxAge
}

// ToTransaction converts message to blockchain transaction format
func (m *V2XMessage) ToTransaction() map[string]interface{} {
	return map[string]interface{}{
		"messageId":    m.MessageID,
		"messageType":  m.MessageType,
		"senderId":     m.SenderID,
		"timestamp":    m.Timestamp.Format(time.RFC3339),
		"priority":     m.Priority,
		"location": map[string]float64{
			"lat": m.Latitude,
			"lon": m.Longitude,
		},
		"urgencyLevel": m.GetUrgencyLevel(),
	}
}
