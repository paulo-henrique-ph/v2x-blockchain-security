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
w.WriteStatus(statusCode)
json.NewEncoder(w).Encode(result)
}
func (r *RestAdapter) HandleGetStats(w http.ResponseWriter, req *http.Request) {
stats, _ := r.messageProcessingService.GetStatistics()
w.Header().Set("Content-Type", "application/json")
json.NewEncoder(w).Encode(stats)
}
func (r *RestAdapter) HandleHealthCheck(w http.ResponseWriter, req *http.Request) {
health, _ := r.messageProcessingService.HealthCheck()
w.Header().Set("Content-Type", "application/json")
json.NewEncoder(w).Encode(health)
}
