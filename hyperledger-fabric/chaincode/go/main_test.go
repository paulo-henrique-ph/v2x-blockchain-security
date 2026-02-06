package main

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockTransactionContext is a mock for TransactionContextInterface
type MockTransactionContext struct {
	contractapi.TransactionContext
	stub *MockStub
}

// GetStub returns the mock stub
func (m *MockTransactionContext) GetStub() shim.ChaincodeStubInterface {
	return m.stub
}

// MockStub is a mock for ChaincodeStubInterface
type MockStub struct {
	mock.Mock
	state map[string][]byte
}

// GetState retrieves a value from the mock state
func (m *MockStub) GetState(key string) ([]byte, error) {
	args := m.Called(key)
	return args.Get(0).([]byte), args.Error(1)
}

// PutState stores a value in the mock state
func (m *MockStub) PutState(key string, value []byte) error {
	args := m.Called(key, value)
	if m.state == nil {
		m.state = make(map[string][]byte)
	}
	m.state[key] = value
	return args.Error(0)
}

// GetQueryResult executes a query (mock implementation)
func (m *MockStub) GetQueryResult(query string) (shim.StateQueryIteratorInterface, error) {
	args := m.Called(query)
	return args.Get(0).(shim.StateQueryIteratorInterface), args.Error(1)
}

// GetStateByRange returns a range query iterator (mock implementation)
func (m *MockStub) GetStateByRange(startKey, endKey string) (shim.StateQueryIteratorInterface, error) {
	args := m.Called(startKey, endKey)
	return args.Get(0).(shim.StateQueryIteratorInterface), args.Error(1)
}

// createMockContext creates a mock transaction context
func createMockContext() *MockTransactionContext {
	return &MockTransactionContext{
		stub: &MockStub{
			state: make(map[string][]byte),
		},
	}
}

func TestRegisterVehicle(t *testing.T) {
	t.Run("should register a new vehicle successfully", func(t *testing.T) {
		// Arrange
		contract := new(ITSContract)
		ctx := createMockContext()

		vehicleID := "VEHICLE-001"
		publicKey := "mock-public-key"

		ctx.stub.On("GetState", vehicleID).Return([]byte(nil), nil)
		ctx.stub.On("PutState", vehicleID, mock.Anything).Return(nil)

		// Act
		err := contract.RegisterVehicle(ctx, vehicleID, publicKey)

		// Assert
		assert.NoError(t, err)
		ctx.stub.AssertCalled(t, "PutState", vehicleID, mock.Anything)
	})

	t.Run("should reject duplicate vehicle registration", func(t *testing.T) {
		// Arrange
		contract := new(ITSContract)
		ctx := createMockContext()

		vehicleID := "VEHICLE-001"
		publicKey := "mock-public-key"

		existingVehicle := Vehicle{
			ID:        vehicleID,
			PublicKey: publicKey,
			Status:    "active",
			Timestamp: time.Now().Unix(),
		}
		vehicleJSON, _ := json.Marshal(existingVehicle)

		ctx.stub.On("GetState", vehicleID).Return(vehicleJSON, nil)

		// Act
		err := contract.RegisterVehicle(ctx, vehicleID, publicKey)

		// Assert
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "already exists")
	})
}

func TestSubmitV2XMessage(t *testing.T) {
	t.Run("should submit a valid V2X message", func(t *testing.T) {
		// Arrange
		contract := new(ITSContract)
		ctx := createMockContext()

		message := V2XMessage{
			MessageID:   "MSG-001",
			MessageHash: "hash123",
			MessageType: "EMERGENCY_BRAKE",
			SenderID:    "VEHICLE-001",
			Timestamp:   time.Now(),
			Priority:    0,
			Location:    Location{Lat: -23.5505, Lon: -46.6333},
			Signature:   "signature",
		}
		messageJSON, _ := json.Marshal(message)

		vehicle := Vehicle{
			ID:        "VEHICLE-001",
			PublicKey: "key",
			Status:    "active",
		}
		vehicleJSON, _ := json.Marshal(vehicle)

		ctx.stub.On("GetState", "MSG-001").Return([]byte(nil), nil)
		ctx.stub.On("GetState", "VEHICLE-001").Return(vehicleJSON, nil)
		ctx.stub.On("PutState", "MSG-001", mock.Anything).Return(nil)

		// Act
		err := contract.SubmitV2XMessage(ctx, string(messageJSON))

		// Assert
		assert.NoError(t, err)
		ctx.stub.AssertCalled(t, "PutState", "MSG-001", mock.Anything)
	})

	t.Run("should reject duplicate message (replay attack)", func(t *testing.T) {
		// Arrange
		contract := new(ITSContract)
		ctx := createMockContext()

		message := V2XMessage{
			MessageID:   "MSG-001",
			MessageHash: "hash123",
			MessageType: "EMERGENCY_BRAKE",
			SenderID:    "VEHICLE-001",
			Timestamp:   time.Now(),
			Priority:    0,
		}
		messageJSON, _ := json.Marshal(message)
		existingMsgJSON, _ := json.Marshal(message)

		ctx.stub.On("GetState", "MSG-001").Return(existingMsgJSON, nil)

		// Act
		err := contract.SubmitV2XMessage(ctx, string(messageJSON))

		// Assert
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "already exists")
		assert.Contains(t, err.Error(), "replay attack")
	})

	t.Run("should reject message from unregistered vehicle", func(t *testing.T) {
		// Arrange
		contract := new(ITSContract)
		ctx := createMockContext()

		message := V2XMessage{
			MessageID:   "MSG-002",
			MessageHash: "hash456",
			MessageType: "TEST",
			SenderID:    "VEHICLE-999",
			Timestamp:   time.Now(),
			Priority:    0,
		}
		messageJSON, _ := json.Marshal(message)

		ctx.stub.On("GetState", "MSG-002").Return([]byte(nil), nil)
		ctx.stub.On("GetState", "VEHICLE-999").Return([]byte(nil), nil)

		// Act
		err := contract.SubmitV2XMessage(ctx, string(messageJSON))

		// Assert
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "not registered")
	})

	t.Run("should reject invalid JSON message", func(t *testing.T) {
		// Arrange
		contract := new(ITSContract)
		ctx := createMockContext()

		invalidJSON := `{"invalid": json`

		// Act
		err := contract.SubmitV2XMessage(ctx, invalidJSON)

		// Assert
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unmarshal")
	})
}

func TestGetV2XMessage(t *testing.T) {
	t.Run("should retrieve existing message", func(t *testing.T) {
		// Arrange
		contract := new(ITSContract)
		ctx := createMockContext()

		message := V2XMessage{
			MessageID:   "MSG-001",
			MessageHash: "hash123",
			MessageType: "EMERGENCY_BRAKE",
			SenderID:    "VEHICLE-001",
			Priority:    0,
		}
		messageJSON, _ := json.Marshal(message)

		ctx.stub.On("GetState", "MSG-001").Return(messageJSON, nil)

		// Act
		result, err := contract.GetV2XMessage(ctx, "MSG-001")

		// Assert
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "MSG-001", result.MessageID)
		assert.Equal(t, "EMERGENCY_BRAKE", result.MessageType)
	})

	t.Run("should return error for non-existent message", func(t *testing.T) {
		// Arrange
		contract := new(ITSContract)
		ctx := createMockContext()

		ctx.stub.On("GetState", "MSG-999").Return([]byte(nil), nil)

		// Act
		result, err := contract.GetV2XMessage(ctx, "MSG-999")

		// Assert
		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "does not exist")
	})
}

func TestVehicleExists(t *testing.T) {
	t.Run("should return true for existing vehicle", func(t *testing.T) {
		// Arrange
		contract := new(ITSContract)
		ctx := createMockContext()

		vehicle := Vehicle{ID: "VEHICLE-001"}
		vehicleJSON, _ := json.Marshal(vehicle)

		ctx.stub.On("GetState", "VEHICLE-001").Return(vehicleJSON, nil)

		// Act
		exists, err := contract.VehicleExists(ctx, "VEHICLE-001")

		// Assert
		assert.NoError(t, err)
		assert.True(t, exists)
	})

	t.Run("should return false for non-existent vehicle", func(t *testing.T) {
		// Arrange
		contract := new(ITSContract)
		ctx := createMockContext()

		ctx.stub.On("GetState", "VEHICLE-999").Return([]byte(nil), nil)

		// Act
		exists, err := contract.VehicleExists(ctx, "VEHICLE-999")

		// Assert
		assert.NoError(t, err)
		assert.False(t, exists)
	})
}

func TestMessageExists(t *testing.T) {
	t.Run("should return true for existing message", func(t *testing.T) {
		// Arrange
		contract := new(ITSContract)
		ctx := createMockContext()

		message := V2XMessage{MessageID: "MSG-001"}
		messageJSON, _ := json.Marshal(message)

		ctx.stub.On("GetState", "MSG-001").Return(messageJSON, nil)

		// Act
		exists, err := contract.MessageExists(ctx, "MSG-001")

		// Assert
		assert.NoError(t, err)
		assert.True(t, exists)
	})

	t.Run("should return false for non-existent message", func(t *testing.T) {
		// Arrange
		contract := new(ITSContract)
		ctx := createMockContext()

		ctx.stub.On("GetState", "MSG-999").Return([]byte(nil), nil)

		// Act
		exists, err := contract.MessageExists(ctx, "MSG-999")

		// Assert
		assert.NoError(t, err)
		assert.False(t, exists)
	})
}

func TestSubmitSecurityAlert(t *testing.T) {
	t.Run("should submit a new security alert", func(t *testing.T) {
		// Arrange
		contract := new(ITSContract)
		ctx := createMockContext()

		alertID := "ALERT-001"

		ctx.stub.On("GetState", alertID).Return([]byte(nil), nil)
		ctx.stub.On("PutState", alertID, mock.Anything).Return(nil)

		// Act
		err := contract.SubmitSecurityAlert(ctx, alertID, "VEHICLE-001", "MALICIOUS_BEHAVIOR", "HIGH", "Suspicious activity detected", time.Now().Unix())

		// Assert
		assert.NoError(t, err)
		ctx.stub.AssertCalled(t, "PutState", alertID, mock.Anything)
	})

	t.Run("should reject duplicate alert", func(t *testing.T) {
		// Arrange
		contract := new(ITSContract)
		ctx := createMockContext()

		alertID := "ALERT-001"
		alert := SecurityAlert{ID: alertID}
		alertJSON, _ := json.Marshal(alert)

		ctx.stub.On("GetState", alertID).Return(alertJSON, nil)

		// Act
		err := contract.SubmitSecurityAlert(ctx, alertID, "VEHICLE-001", "TEST", "LOW", "Test", time.Now().Unix())

		// Assert
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "already exists")
	})
}

func TestGetVehicle(t *testing.T) {
	t.Run("should retrieve existing vehicle", func(t *testing.T) {
		// Arrange
		contract := new(ITSContract)
		ctx := createMockContext()

		vehicle := Vehicle{
			ID:        "VEHICLE-001",
			PublicKey: "key123",
			Status:    "active",
		}
		vehicleJSON, _ := json.Marshal(vehicle)

		ctx.stub.On("GetState", "VEHICLE-001").Return(vehicleJSON, nil)

		// Act
		result, err := contract.GetVehicle(ctx, "VEHICLE-001")

		// Assert
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "VEHICLE-001", result.ID)
		assert.Equal(t, "key123", result.PublicKey)
	})

	t.Run("should return error for non-existent vehicle", func(t *testing.T) {
		// Arrange
		contract := new(ITSContract)
		ctx := createMockContext()

		ctx.stub.On("GetState", "VEHICLE-999").Return([]byte(nil), nil)

		// Act
		result, err := contract.GetVehicle(ctx, "VEHICLE-999")

		// Assert
		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "does not exist")
	})
}

func TestQueryVehicle(t *testing.T) {
	t.Run("should retrieve existing vehicle", func(t *testing.T) {
		contract := new(ITSContract)
		ctx := createMockContext()

		vehicle := Vehicle{
			ID:        "VEHICLE-001",
			PublicKey: "key123",
			Status:    "active",
			Timestamp: time.Now().Unix(),
		}
		vehicleJSON, _ := json.Marshal(vehicle)
		ctx.stub.On("GetState", "VEHICLE-001").Return(vehicleJSON, nil)

		result, err := contract.QueryVehicle(ctx, "VEHICLE-001")
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "VEHICLE-001", result.ID)
		assert.Equal(t, "key123", result.PublicKey)
	})

	t.Run("should return error for non-existent vehicle", func(t *testing.T) {
		contract := new(ITSContract)
		ctx := createMockContext()
		ctx.stub.On("GetState", "VEHICLE-999").Return([]byte(nil), nil)

		result, err := contract.QueryVehicle(ctx, "VEHICLE-999")
		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "does not exist")
	})
}

func TestQuerySecurityAlert(t *testing.T) {
	t.Run("should retrieve existing alert", func(t *testing.T) {
		contract := new(ITSContract)
		ctx := createMockContext()

		alert := SecurityAlert{
			ID:          "ALERT-001",
			VehicleID:   "VEHICLE-001",
			AlertType:   "TEST",
			Severity:    "HIGH",
			Description: "desc",
			Timestamp:   time.Now().Unix(),
		}
		alertJSON, _ := json.Marshal(alert)
		ctx.stub.On("GetState", "ALERT-001").Return(alertJSON, nil)

		result, err := contract.QuerySecurityAlert(ctx, "ALERT-001")
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "ALERT-001", result.ID)
		assert.Equal(t, "TEST", result.AlertType)
	})

	t.Run("should return error for non-existent alert", func(t *testing.T) {
		contract := new(ITSContract)
		ctx := createMockContext()
		ctx.stub.On("GetState", "ALERT-999").Return([]byte(nil), nil)

		result, err := contract.QuerySecurityAlert(ctx, "ALERT-999")
		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "does not exist")
	})
}
