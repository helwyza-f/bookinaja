package promo

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type Promo struct {
	ID                    uuid.UUID   `db:"id" json:"id"`
	TenantID              uuid.UUID   `db:"tenant_id" json:"tenant_id"`
	Code                  string      `db:"code" json:"code"`
	Name                  string      `db:"name" json:"name"`
	Description           string      `db:"description" json:"description"`
	DiscountBehavior      string      `db:"discount_behavior" json:"discount_behavior"`
	DiscountType          string      `db:"discount_type" json:"discount_type"`
	DiscountValue         int64       `db:"discount_value" json:"discount_value"`
	MaxDiscountAmount     *int64      `db:"max_discount_amount" json:"max_discount_amount,omitempty"`
	MinBookingAmount      *int64      `db:"min_booking_amount" json:"min_booking_amount,omitempty"`
	UsageLimitTotal       *int        `db:"usage_limit_total" json:"usage_limit_total,omitempty"`
	UsageLimitPerCustomer *int        `db:"usage_limit_per_customer" json:"usage_limit_per_customer,omitempty"`
	ValidWeekdays         IntArray    `db:"valid_weekdays" json:"valid_weekdays,omitempty"`
	TimeStart             *string     `db:"time_start" json:"time_start,omitempty"`
	TimeEnd               *string     `db:"time_end" json:"time_end,omitempty"`
	StartsAt              *time.Time  `db:"starts_at" json:"starts_at,omitempty"`
	EndsAt                *time.Time  `db:"ends_at" json:"ends_at,omitempty"`
	IsActive              bool        `db:"is_active" json:"is_active"`
	CreatedBy             *uuid.UUID  `db:"created_by" json:"created_by,omitempty"`
	UpdatedBy             *uuid.UUID  `db:"updated_by" json:"updated_by,omitempty"`
	CreatedAt             time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt             time.Time   `db:"updated_at" json:"updated_at"`
	DeletedAt             *time.Time  `db:"deleted_at" json:"deleted_at,omitempty"`
	ResourceIDs           []uuid.UUID `json:"resource_ids,omitempty"`
	UsageCount            int         `json:"usage_count,omitempty"`
}

type IntArray []int

func (a IntArray) Value() (driver.Value, error) {
	if len(a) == 0 {
		return nil, nil
	}
	raw, err := json.Marshal([]int(a))
	if err != nil {
		return nil, err
	}
	return raw, nil
}

func (a *IntArray) Scan(src any) error {
	switch value := src.(type) {
	case nil:
		*a = nil
		return nil
	case []byte:
		if len(value) == 0 {
			*a = nil
			return nil
		}
		var items []int
		if err := json.Unmarshal(value, &items); err != nil {
			return err
		}
		*a = IntArray(items)
		return nil
	case string:
		if value == "" {
			*a = nil
			return nil
		}
		var items []int
		if err := json.Unmarshal([]byte(value), &items); err != nil {
			return err
		}
		*a = IntArray(items)
		return nil
	default:
		return fmt.Errorf("unsupported int array source %T", src)
	}
}

type UpsertPromoReq struct {
	Code                  string     `json:"code"`
	Name                  string     `json:"name"`
	Description           string     `json:"description"`
	DiscountBehavior      string     `json:"discount_behavior"`
	DiscountType          string     `json:"discount_type"`
	DiscountValue         int64      `json:"discount_value"`
	MaxDiscountAmount     *int64     `json:"max_discount_amount"`
	MinBookingAmount      *int64     `json:"min_booking_amount"`
	UsageLimitTotal       *int       `json:"usage_limit_total"`
	UsageLimitPerCustomer *int       `json:"usage_limit_per_customer"`
	ValidWeekdays         []int      `json:"valid_weekdays"`
	TimeStart             *string    `json:"time_start"`
	TimeEnd               *string    `json:"time_end"`
	StartsAt              *time.Time `json:"starts_at"`
	EndsAt                *time.Time `json:"ends_at"`
	ResourceIDs           []string   `json:"resource_ids"`
	IsActive              bool       `json:"is_active"`
}

type PreviewReq struct {
	Code       string     `json:"code"`
	TenantID   uuid.UUID  `json:"tenant_id"`
	ResourceID uuid.UUID  `json:"resource_id"`
	StartTime  time.Time  `json:"start_time"`
	EndTime    time.Time  `json:"end_time"`
	Subtotal   float64    `json:"subtotal"`
	CustomerID *uuid.UUID `json:"customer_id"`
}

type PreviewRes struct {
	Valid          bool           `json:"valid"`
	ReasonCode     string         `json:"reason_code,omitempty"`
	Message        string         `json:"message,omitempty"`
	Code           string         `json:"code,omitempty"`
	PromoID        *uuid.UUID     `json:"promo_id,omitempty"`
	DiscountAmount float64        `json:"discount_amount,omitempty"`
	OriginalAmount float64        `json:"original_amount,omitempty"`
	FinalAmount    float64        `json:"final_amount,omitempty"`
	Label          string         `json:"label,omitempty"`
	Snapshot       map[string]any `json:"snapshot,omitempty"`
}

type ApplyInput struct {
	TenantID   uuid.UUID
	ResourceID uuid.UUID
	StartTime  time.Time
	EndTime    time.Time
	Subtotal   float64
	CustomerID *uuid.UUID
	Code       string
}

type ApplyResult struct {
	Promo          *Promo
	DiscountAmount float64
	OriginalAmount float64
	FinalAmount    float64
	Snapshot       map[string]any
}

type ListFilter struct {
	Search string
	Status string
}

type Redemption struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	PromoID        uuid.UUID  `db:"promo_id" json:"promo_id"`
	TenantID       uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	BookingID      uuid.UUID  `db:"booking_id" json:"booking_id"`
	CustomerID     *uuid.UUID `db:"customer_id" json:"customer_id,omitempty"`
	PromoCode      string     `db:"promo_code" json:"promo_code"`
	DiscountAmount float64    `db:"discount_amount" json:"discount_amount"`
	OriginalAmount float64    `db:"original_amount" json:"original_amount"`
	FinalAmount    float64    `db:"final_amount" json:"final_amount"`
	Status         string     `db:"status" json:"status"`
	RedeemedAt     time.Time  `db:"redeemed_at" json:"redeemed_at"`
	CustomerName   string     `db:"customer_name" json:"customer_name"`
	ResourceName   string     `db:"resource_name" json:"resource_name"`
	BookingStatus  string     `db:"booking_status" json:"booking_status"`
}
