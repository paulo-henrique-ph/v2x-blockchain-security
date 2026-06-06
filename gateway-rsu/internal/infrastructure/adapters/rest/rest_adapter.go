package rest

import (
	"encoding/json"
	"net/http"

	"github.com/phgp/v2x-gateway-rsu/internal/application/ports"
)

type RestAdapter struct {
	messageProcessingService ports.MessageProcessingPort
}

func NewRestAdapter(service ports.MessageProcessingPort) *RestAdapter {
	return &RestAdapter{
		messageProcessingService: service,
	}
}

// HandleV2XMessage godoc
// @Summary Process V2X message
// @Description Process a V2X message with validation, security checks, and blockchain submission
// @Description
// @Description The message will be validated for:
// @Description - Digital signature authenticity
// @Description - Replay attack prevention
// @Description - Plausibility checks (coordinates, timestamp)
// @Description
// @Description Critical messages (priority 0-1, emergency types) are immediately submitted to blockchain.
// @Description Non-critical messages are aggregated for batch processing.
// @Tags Messages
// @Accept json
// @Produce json
// @Param message body V2XMessageRequest true "V2X Message"
// @Success 200 {object} ProcessingResult "Message processed and submitted to blockchain"
// @Success 202 {object} ProcessingResult "Message accepted for aggregation"
// @Failure 400 {object} ErrorResponse "Invalid request or validation failed"
// @Failure 500 {object} ErrorResponse "Internal server error"
// @Router /messages [post]
func (r *RestAdapter) HandleV2XMessage(w http.ResponseWriter, req *http.Request) {
	var messageDTO map[string]interface{}
	if err := json.NewDecoder(req.Body).Decode(&messageDTO); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	result, _ := r.messageProcessingService.ProcessMessage(messageDTO)

	statusCode := http.StatusOK
	if !result.Success {
		if result.Reason != "" {
			statusCode = http.StatusBadRequest
		} else {
			statusCode = http.StatusInternalServerError
		}
	} else if result.Status == "aggregated" {
		statusCode = http.StatusAccepted
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(result)
}

// HandleGetStats godoc
// @Summary Get gateway statistics
// @Description Retrieve processing statistics including message counts, latencies, and throughput
// @Tags Health
// @Produce json
// @Success 200 {object} StatisticsResponse "Gateway statistics"
// @Router /stats [get]
func (r *RestAdapter) HandleGetStats(w http.ResponseWriter, req *http.Request) {
	stats, _ := r.messageProcessingService.GetStatistics()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// HandleHealthCheck godoc
// @Summary Health check
// @Description Check if the gateway is running and operational
// @Tags Health
// @Produce json
// @Success 200 {object} HealthResponse "Gateway is healthy"
// @Router /health [get]
func (r *RestAdapter) HandleHealthCheck(w http.ResponseWriter, req *http.Request) {
	health, _ := r.messageProcessingService.HealthCheck()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
}

// V2XMessageRequest represents the request body for V2X message processing
type V2XMessageRequest struct {
	MessageID   string                 `json:"messageId" example:"MSG-001" binding:"required"`
	MessageType string                 `json:"messageType" example:"EMERGENCY_BRAKE" binding:"required" enums:"CAM,DENM,SPAT,MAP,EMERGENCY_BRAKE,COLLISION_WARNING,TRAFFIC_UPDATE,ROAD_HAZARD"`
	SenderID    string                 `json:"senderId" example:"VEHICLE-001" binding:"required"`
	Timestamp   string                 `json:"timestamp" example:"2026-03-03T10:00:00Z" binding:"required"`
	Priority    int                    `json:"priority" example:"0" binding:"required" minimum:"0" maximum:"3"`
	Latitude    float64                `json:"latitude" example:"-23.5505" binding:"required" minimum:"-90" maximum:"90"`
	Longitude   float64                `json:"longitude" example:"-46.6333" binding:"required" minimum:"-180" maximum:"180"`
	Signature   string                 `json:"signature" example:"base64encodedSignature==" binding:"required"`
	Metadata    map[string]interface{} `json:"metadata,omitempty" swaggertype:"object"`
}

// ProcessingResult represents the processing result
type ProcessingResult struct {
	Success   bool   `json:"success" example:"true"`
	TxHash    string `json:"txHash,omitempty" example:"0x1234567890abcdef"`
	Status    string `json:"status" example:"submitted" enums:"submitted,aggregated,rejected"`
	MessageID string `json:"messageId" example:"MSG-001"`
	Timestamp string `json:"timestamp" example:"2026-03-03T10:00:00Z"`
	Latency   int64  `json:"latency" example:"45"`
	Reason    string `json:"reason,omitempty" example:"Invalid signature"`
	Error     string `json:"error,omitempty" example:"Validation failed"`
}

// StatisticsResponse represents gateway statistics
type StatisticsResponse struct {
	TotalReceived  uint64  `json:"totalReceived" example:"1000"`
	TotalValidated uint64  `json:"totalValidated" example:"950"`
	TotalSubmitted uint64  `json:"totalSubmitted" example:"600"`
	TotalAggregated uint64 `json:"totalAggregated" example:"350"`
	TotalRejected  uint64  `json:"totalRejected" example:"50"`
	AvgLatencyMs   float64 `json:"avgLatencyMs" example:"42.5"`
	Uptime         string  `json:"uptime" example:"2h30m15s"`
}

// HealthResponse represents health status
type HealthResponse struct {
	Status    string `json:"status" example:"healthy"`
	Timestamp string `json:"timestamp" example:"2026-03-03T10:00:00Z"`
	Uptime    string `json:"uptime" example:"2h30m15s"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error" example:"Invalid request body"`
	Message string `json:"message,omitempty" example:"messageId is required"`
}


