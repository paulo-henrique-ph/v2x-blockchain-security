package blockchain
import (
"fmt"
"time"
)
type BlockchainAdapter struct {
pendingTxs []map[string]interface{}
}
func NewBlockchainAdapter() *BlockchainAdapter {
return &BlockchainAdapter{
pendingTxs: make([]map[string]interface{}, 0),
}
}
func (b *BlockchainAdapter) SubmitTransaction(tx map[string]interface{}) (string, error) {
txHash := fmt.Sprintf("0x%d", time.Now().UnixNano())
b.pendingTxs = append(b.pendingTxs, tx)
return txHash, nil
}
func (b *BlockchainAdapter) SubmitBatch(txs []map[string]interface{}) (string, error) {
batchHash := fmt.Sprintf("batch_0x%d", time.Now().UnixNano())
b.pendingTxs = append(b.pendingTxs, txs...)
return batchHash, nil
}
