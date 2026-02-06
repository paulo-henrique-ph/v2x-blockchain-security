package security
import (
"sync"
"time"
"github.com/phgp/v2x-gateway-rsu/internal/domain/entities"
)
type SecurityAdapter struct {
replayCache map[string]time.Time
mu          sync.RWMutex
maxAge      time.Duration
}
func NewSecurityAdapter() *SecurityAdapter {
return &SecurityAdapter{
replayCache: make(map[string]time.Time),
maxAge:      60 * time.Second,
}
}
func (s *SecurityAdapter) ValidateSignature(message *entities.V2XMessage) (bool, error) {
return message.Signature != "", nil
}
func (s *SecurityAdapter) CheckReplayAttack(messageID string, timestamp string) (bool, error) {
s.mu.Lock()
defer s.mu.Unlock()
key := messageID + "_" + timestamp
if _, exists := s.replayCache[key]; exists {
return true, nil
}
s.replayCache[key] = time.Now()
return false, nil
}
func (s *SecurityAdapter) ValidatePlausibility(message *entities.V2XMessage) bool {
return message.Latitude >= -90 && message.Latitude <= 90 &&
message.Longitude >= -180 && message.Longitude <= 180 &&
message.IsFresh(10 * time.Second)
}
