package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ITSContract provides functions for managing ITS security data
type ITSContract struct {
	contractapi.Contract
}

// Vehicle represents a vehicle in the ITS network
type Vehicle struct {
	ID        string `json:"id"`
	PublicKey string `json:"publicKey"`
	Status    string `json:"status"`
	Timestamp int64  `json:"timestamp"`
}

// V2XMessage represents a V2X communication message
type V2XMessage struct {
	MessageID   string    `json:"messageId"`
	MessageHash string    `json:"messageHash"`
	MessageType string    `json:"messageType"`
	SenderID    string    `json:"senderId"`
	Timestamp   time.Time `json:"timestamp"`
	Priority    int       `json:"priority"`
	Location    Location  `json:"location"`
	Signature   string    `json:"signature"`
	Status      string    `json:"status"` // "pending", "validated", "rejected"
}

// Location represents geographic coordinates
type Location struct {
	Lat float64 `json:"lat"`
	Lon float64 `json:"lon"`
}

// SecurityAlert represents a security alert in the ITS
type SecurityAlert struct {
	ID          string `json:"id"`
	VehicleID   string `json:"vehicleId"`
	AlertType   string `json:"alertType"`
	Severity    string `json:"severity"`
	Description string `json:"description"`
	Timestamp   int64  `json:"timestamp"`
}

// InitLedger adds a base set of data to the ledger
func (c *ITSContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	return nil
}

// RegisterVehicle registers a new vehicle in the network
func (c *ITSContract) RegisterVehicle(ctx contractapi.TransactionContextInterface, id string, publicKey string) error {
	exists, err := c.VehicleExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("vehicle %s already exists", id)
	}

	vehicle := Vehicle{
		ID:        id,
		PublicKey: publicKey,
		Status:    "active",
		Timestamp: time.Now().Unix(),
	}

	vehicleJSON, err := json.Marshal(vehicle)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, vehicleJSON)
}

// VehicleExists checks if a vehicle exists in the ledger
func (c *ITSContract) VehicleExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	vehicleJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}
	return vehicleJSON != nil, nil
}

// SubmitV2XMessage submits a V2X message to the blockchain
func (c *ITSContract) SubmitV2XMessage(ctx contractapi.TransactionContextInterface, messageJSON string) error {
	var message V2XMessage
	err := json.Unmarshal([]byte(messageJSON), &message)
	if err != nil {
		return fmt.Errorf("failed to unmarshal message: %v", err)
	}

	// Check if message already exists (replay attack prevention)
	exists, err := c.MessageExists(ctx, message.MessageID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("message %s already exists (potential replay attack)", message.MessageID)
	}

	// Validate sender exists
	vehicleExists, err := c.VehicleExists(ctx, message.SenderID)
	if err != nil {
		return err
	}
	if !vehicleExists {
		return fmt.Errorf("sender vehicle %s not registered", message.SenderID)
	}

	// Set status as validated (signature validation done by RSU Gateway)
	message.Status = "validated"

	messageBytes, err := json.Marshal(message)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(message.MessageID, messageBytes)
}

// MessageExists checks if a message exists in the ledger
func (c *ITSContract) MessageExists(ctx contractapi.TransactionContextInterface, messageID string) (bool, error) {
	messageJSON, err := ctx.GetStub().GetState(messageID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}
	return messageJSON != nil, nil
}

// GetV2XMessage retrieves a V2X message from the ledger
func (c *ITSContract) GetV2XMessage(ctx contractapi.TransactionContextInterface, messageID string) (*V2XMessage, error) {
	messageJSON, err := ctx.GetStub().GetState(messageID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if messageJSON == nil {
		return nil, fmt.Errorf("message %s does not exist", messageID)
	}

	var message V2XMessage
	err = json.Unmarshal(messageJSON, &message)
	if err != nil {
		return nil, err
	}

	return &message, nil
}

// QueryMessagesByType retrieves all messages of a specific type
func (c *ITSContract) QueryMessagesByType(ctx contractapi.TransactionContextInterface, messageType string) ([]*V2XMessage, error) {
	queryString := fmt.Sprintf(`{"selector":{"messageType":"%s"}}`, messageType)
	return c.getQueryResultForQueryString(ctx, queryString)
}

// QueryMessagesBySender retrieves all messages from a specific sender
func (c *ITSContract) QueryMessagesBySender(ctx contractapi.TransactionContextInterface, senderID string) ([]*V2XMessage, error) {
	queryString := fmt.Sprintf(`{"selector":{"senderId":"%s"}}`, senderID)
	return c.getQueryResultForQueryString(ctx, queryString)
}

// getQueryResultForQueryString executes a CouchDB query
func (c *ITSContract) getQueryResultForQueryString(ctx contractapi.TransactionContextInterface, queryString string) ([]*V2XMessage, error) {
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var messages []*V2XMessage
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var message V2XMessage
		err = json.Unmarshal(queryResponse.Value, &message)
		if err != nil {
			return nil, err
		}
		messages = append(messages, &message)
	}

	return messages, nil
}

// SubmitSecurityAlert submits a new security alert
func (c *ITSContract) SubmitSecurityAlert(ctx contractapi.TransactionContextInterface, id string, vehicleID string, alertType string, severity string, description string, timestamp int64) error {
	exists, err := c.AlertExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("alert %s already exists", id)
	}

	alert := SecurityAlert{
		ID:          id,
		VehicleID:   vehicleID,
		AlertType:   alertType,
		Severity:    severity,
		Description: description,
		Timestamp:   timestamp,
	}

	alertJSON, err := json.Marshal(alert)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, alertJSON)
}

// AlertExists checks if an alert exists in the ledger
func (c *ITSContract) AlertExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	alertJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}
	return alertJSON != nil, nil
}

// QueryVehicle returns the vehicle with the given ID
func (c *ITSContract) QueryVehicle(ctx contractapi.TransactionContextInterface, id string) (*Vehicle, error) {
	vehicleJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if vehicleJSON == nil {
		return nil, fmt.Errorf("vehicle %s does not exist", id)
	}
	var vehicle Vehicle
	err = json.Unmarshal(vehicleJSON, &vehicle)
	if err != nil {
		return nil, err
	}
	return &vehicle, nil
}

// QuerySecurityAlert returns the alert with the given ID
func (c *ITSContract) QuerySecurityAlert(ctx contractapi.TransactionContextInterface, id string) (*SecurityAlert, error) {
	alertJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if alertJSON == nil {
		return nil, fmt.Errorf("alert %s does not exist", id)
	}
	var alert SecurityAlert
	err = json.Unmarshal(alertJSON, &alert)
	if err != nil {
		return nil, err
	}
	return &alert, nil
}

// GetVehicle retrieves a vehicle from the ledger
func (c *ITSContract) GetVehicle(ctx contractapi.TransactionContextInterface, id string) (*Vehicle, error) {
	vehicleJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if vehicleJSON == nil {
		return nil, fmt.Errorf("vehicle %s does not exist", id)
	}

	var vehicle Vehicle
	err = json.Unmarshal(vehicleJSON, &vehicle)
	if err != nil {
		return nil, err
	}

	return &vehicle, nil
}

// GetAllVehicles returns all vehicles found in the ledger
func (c *ITSContract) GetAllVehicles(ctx contractapi.TransactionContextInterface) ([]*Vehicle, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var vehicles []*Vehicle
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var vehicle Vehicle
		err = json.Unmarshal(queryResponse.Value, &vehicle)
		if err != nil {
			continue // Skip non-vehicle entries
		}

		// Only include if it's actually a vehicle (has vehicle-specific fields)
		if vehicle.PublicKey != "" {
			vehicles = append(vehicles, &vehicle)
		}
	}

	return vehicles, nil
}

// GetAllSecurityAlerts returns all security alerts found in the ledger
func (c *ITSContract) GetAllSecurityAlerts(ctx contractapi.TransactionContextInterface) ([]*SecurityAlert, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var alerts []*SecurityAlert
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var alert SecurityAlert
		err = json.Unmarshal(queryResponse.Value, &alert)
		if err != nil {
			continue // Skip non-alert entries
		}

		// Only include if it's actually an alert
		if alert.AlertType != "" {
			alerts = append(alerts, &alert)
		}
	}

	return alerts, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&ITSContract{})
	if err != nil {
		fmt.Printf("Error creating ITS chaincode: %s", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting ITS chaincode: %s", err.Error())
	}
}
