package expense

import (
	"time"

	"github.com/google/uuid"
)

type Expense struct {
	ID            uuid.UUID `db:"id" json:"id"`
	TenantID      uuid.UUID `db:"tenant_id" json:"tenant_id"`
	Title         string    `db:"title" json:"title"`
	Category      string    `db:"category" json:"category"`
	Amount        int64     `db:"amount" json:"amount"`
	ExpenseDate   time.Time `db:"expense_date" json:"expense_date"`
	PaymentMethod string    `db:"payment_method" json:"payment_method"`
	Vendor        string    `db:"vendor" json:"vendor"`
	Notes         string    `db:"notes" json:"notes"`
	ReceiptURL    string    `db:"receipt_url" json:"receipt_url"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time `db:"updated_at" json:"updated_at"`
}

type Summary struct {
	Total   int64 `db:"total" json:"total"`
	Entries int64 `db:"entries" json:"entries"`
}
