package entities_test

import (
	"testing"
	"time"

	"github.com/phgp/v2x-gateway-rsu/internal/domain/entities"
)

func TestNewV2XMessage(t *testing.T) {
	t.Run("should create valid message", func(t *testing.T) {
		msg, err := entities.NewV2XMessage(
			"MSG-001",
			"EMERGENCY_BRAKE",
			"VEHICLE-001",
			time.Now(),
			0,
			-23.5505,
			-46.6333,
			"test-signature",
			nil,
		)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if msg == nil {
			t.Error("Expected message, got nil")
		}
		if msg.MessageID != "MSG-001" {
			t.Errorf("Expected MSG-001, got %s", msg.MessageID)
		}
	})

	t.Run("should reject invalid priority", func(t *testing.T) {
		_, err := entities.NewV2XMessage(
			"MSG-002",
			"TRAFFIC_UPDATE",
			"VEHICLE-002",
			time.Now(),
			5, // Invalid
			-23.5505,
			-46.6333,
			"sig",
			nil,
		)

		if err == nil {
			t.Error("Expected error for invalid priority")
		}
	})

	t.Run("should reject invalid coordinates", func(t *testing.T) {
		_, err := entities.NewV2XMessage(
			"MSG-003",
			"TRAFFIC_UPDATE",
			"VEHICLE-003",
			time.Now(),
			1,
			999,  // Invalid
			-46.6333,
			"sig",
			nil,
		)

		if err == nil {
			t.Error("Expected error for invalid coordinates")
		}
	})
}

func TestV2XMessage_IsCritical(t *testing.T) {
	t.Run("should identify critical message", func(t *testing.T) {
		msg, _ := entities.NewV2XMessage(
			"MSG-CRITICAL",
			"EMERGENCY_BRAKE",
			"VEHICLE-001",
			time.Now(),
			0, // Critical
			-23.5505,
			-46.6333,
			"sig",
			nil,
		)

		if !msg.IsCritical() {
			t.Error("Expected message to be critical")
		}
	})

	t.Run("should not identify non-critical as critical", func(t *testing.T) {
		msg, _ := entities.NewV2XMessage(
			"MSG-NORMAL",
			"TRAFFIC_UPDATE",
			"VEHICLE-002",
			time.Now(),
			2, // Non-critical
			-23.5505,
			-46.6333,
			"sig",
			nil,
		)

		if msg.IsCritical() {
			t.Error("Expected message to not be critical")
		}
	})
}

func TestV2XMessage_ShouldAggregate(t *testing.T) {
	msg, _ := entities.NewV2XMessage(
		"MSG-AGG",
		"TRAFFIC_UPDATE",
		"VEHICLE-003",
		time.Now(),
		2,
		-23.5505,
		-46.6333,
		"sig",
		nil,
	)

	if !msg.ShouldAggregate(0) {
		t.Error("Expected message to be aggregated")
	}

	if msg.ShouldAggregate(2) {
		t.Error("Expected message to not be aggregated")
	}
}

func TestV2XMessage_IsEmergency(t *testing.T) {
	t.Run("should identify emergency type", func(t *testing.T) {
		msg, _ := entities.NewV2XMessage(
			"MSG-EMERGENCY",
			"EMERGENCY_BRAKE",
			"VEHICLE-004",
			time.Now(),
			0,
			-23.5505,
			-46.6333,
			"sig",
			nil,
		)

		if !msg.IsEmergency() {
			t.Error("Expected emergency type")
		}
	})

	t.Run("should not identify normal as emergency", func(t *testing.T) {
		msg, _ := entities.NewV2XMessage(
			"MSG-NORMAL",
			"TRAFFIC_UPDATE",
			"VEHICLE-005",
			time.Now(),
			2,
			-23.5505,
			-46.6333,
			"sig",
			nil,
		)

		if msg.IsEmergency() {
			t.Error("Expected non-emergency type")
		}
	})
}

func TestV2XMessage_GetUrgencyLevel(t *testing.T) {
	tests := []struct {
		priority int
		expected string
	}{
		{0, "CRITICAL"},
		{1, "HIGH"},
		{2, "NORMAL"},
		{3, "LOW"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			msg, _ := entities.NewV2XMessage(
				"MSG-TEST",
				"TEST",
				"VEHICLE-TEST",
				time.Now(),
				tt.priority,
				-23.5505,
				-46.6333,
				"sig",
				nil,
			)

			if msg.GetUrgencyLevel() != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, msg.GetUrgencyLevel())
			}
		})
	}
}

func TestV2XMessage_IsFresh(t *testing.T) {
	t.Run("should identify fresh message", func(t *testing.T) {
		msg, _ := entities.NewV2XMessage(
			"MSG-FRESH",
			"TEST",
			"VEHICLE-001",
			time.Now(),
			0,
			-23.5505,
			-46.6333,
			"sig",
			nil,
		)

		if !msg.IsFresh(10 * time.Second) {
			t.Error("Expected fresh message")
		}
	})

	t.Run("should identify stale message", func(t *testing.T) {
		oldTime := time.Now().Add(-20 * time.Second)
		msg, _ := entities.NewV2XMessage(
			"MSG-STALE",
			"TEST",
			"VEHICLE-002",
			oldTime,
			0,
			-23.5505,
			-46.6333,
			"sig",
			nil,
		)

		if msg.IsFresh(10 * time.Second) {
			t.Error("Expected stale message")
		}
	})
}
