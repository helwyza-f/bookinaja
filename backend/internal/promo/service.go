package promo

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, tenantID uuid.UUID, filter ListFilter) ([]Promo, error) {
	return s.repo.List(ctx, tenantID, filter)
}

func (s *Service) GetByID(ctx context.Context, tenantID, promoID uuid.UUID) (*Promo, error) {
	return s.repo.GetByID(ctx, tenantID, promoID)
}

func (s *Service) ListRedemptions(ctx context.Context, tenantID, promoID uuid.UUID) ([]Redemption, error) {
	return s.repo.ListRedemptions(ctx, tenantID, promoID)
}

func (s *Service) Upsert(ctx context.Context, tenantID uuid.UUID, promoID *uuid.UUID, actorID *uuid.UUID, req UpsertPromoReq) (*Promo, error) {
	promo, err := s.buildPromo(tenantID, promoID, actorID, req)
	if err != nil {
		return nil, err
	}
	if err := s.repo.Upsert(ctx, *promo); err != nil {
		return nil, err
	}
	return s.repo.GetByID(ctx, tenantID, promo.ID)
}

func (s *Service) UpdateStatus(ctx context.Context, tenantID, promoID uuid.UUID, isActive bool, actorID *uuid.UUID) error {
	return s.repo.UpdateStatus(ctx, tenantID, promoID, isActive, actorID)
}

func (s *Service) Preview(ctx context.Context, req PreviewReq) (PreviewRes, error) {
	result, err := s.Apply(ctx, ApplyInput{
		TenantID:   req.TenantID,
		ResourceID: req.ResourceID,
		StartTime:  req.StartTime,
		EndTime:    req.EndTime,
		Subtotal:   req.Subtotal,
		CustomerID: req.CustomerID,
		Code:       req.Code,
	})
	if err != nil {
		var invalid *InvalidPromoError
		if errors.As(err, &invalid) {
			return PreviewRes{
				Valid:      false,
				ReasonCode: invalid.Code,
				Message:    invalid.Message,
			}, nil
		}
		return PreviewRes{}, err
	}
	return PreviewRes{
		Valid:          true,
		Code:           result.Promo.Code,
		PromoID:        &result.Promo.ID,
		DiscountAmount: result.DiscountAmount,
		OriginalAmount: result.OriginalAmount,
		FinalAmount:    result.FinalAmount,
		Label:          promoLabel(result.Promo),
		Snapshot:       result.Snapshot,
	}, nil
}

func (s *Service) Apply(ctx context.Context, input ApplyInput) (ApplyResult, error) {
	code := strings.TrimSpace(input.Code)
	if code == "" {
		return ApplyResult{}, &InvalidPromoError{Code: "PROMO_NOT_FOUND", Message: "Kode promo tidak ditemukan."}
	}
	promo, err := s.repo.GetByCode(ctx, input.TenantID, code)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ApplyResult{}, &InvalidPromoError{Code: "PROMO_NOT_FOUND", Message: "Kode promo tidak ditemukan."}
		}
		return ApplyResult{}, err
	}
	if err := s.validateApply(ctx, promo, input); err != nil {
		return ApplyResult{}, err
	}

	discount := calculateDiscount(promo, input.Subtotal)
	finalAmount := math.Max(input.Subtotal-discount, 0)
	snapshot := buildSnapshot(promo, input.Subtotal, discount, finalAmount)
	return ApplyResult{
		Promo:          promo,
		DiscountAmount: discount,
		OriginalAmount: input.Subtotal,
		FinalAmount:    finalAmount,
		Snapshot:       snapshot,
	}, nil
}

type InvalidPromoError struct {
	Code    string
	Message string
}

func (e *InvalidPromoError) Error() string {
	return e.Message
}

func (s *Service) buildPromo(tenantID uuid.UUID, promoID *uuid.UUID, actorID *uuid.UUID, req UpsertPromoReq) (*Promo, error) {
	code := strings.ToUpper(strings.TrimSpace(req.Code))
	name := strings.TrimSpace(req.Name)
	discountType := strings.ToLower(strings.TrimSpace(req.DiscountType))
	discountBehavior := strings.ToLower(strings.TrimSpace(req.DiscountBehavior))
	if code == "" || name == "" {
		return nil, errors.New("kode dan nama promo wajib diisi")
	}
	if discountBehavior == "" {
		discountBehavior = "locked"
	}
	if discountBehavior != "locked" && discountBehavior != "floating" {
		return nil, errors.New("behavior diskon tidak valid")
	}
	if discountType != "percentage" && discountType != "fixed" {
		return nil, errors.New("tipe diskon tidak valid")
	}
	if req.DiscountValue <= 0 {
		return nil, errors.New("nilai diskon harus lebih besar dari nol")
	}
	if discountType == "percentage" && req.DiscountValue > 100 {
		return nil, errors.New("diskon persen maksimal 100")
	}
	if req.StartsAt != nil && req.EndsAt != nil && req.EndsAt.Before(*req.StartsAt) {
		return nil, errors.New("periode promo tidak valid")
	}
	if req.TimeStart != nil || req.TimeEnd != nil {
		if req.TimeStart == nil || req.TimeEnd == nil {
			return nil, errors.New("jam mulai dan jam selesai harus diisi bersamaan")
		}
		if _, err := time.Parse("15:04:05", strings.TrimSpace(*req.TimeStart)); err != nil {
			return nil, errors.New("format jam mulai tidak valid")
		}
		if _, err := time.Parse("15:04:05", strings.TrimSpace(*req.TimeEnd)); err != nil {
			return nil, errors.New("format jam selesai tidak valid")
		}
		if strings.TrimSpace(*req.TimeStart) >= strings.TrimSpace(*req.TimeEnd) {
			return nil, errors.New("rentang jam promo harus selesai di hari yang sama")
		}
	}
	weekdays := sanitizeWeekdays(req.ValidWeekdays)
	resourceIDs := make([]uuid.UUID, 0, len(req.ResourceIDs))
	for _, raw := range req.ResourceIDs {
		if strings.TrimSpace(raw) == "" {
			continue
		}
		resourceID, err := uuid.Parse(raw)
		if err != nil {
			return nil, errors.New("resource promo tidak valid")
		}
		resourceIDs = append(resourceIDs, resourceID)
	}

	promo := &Promo{
		TenantID:              tenantID,
		Code:                  code,
		Name:                  name,
		Description:           strings.TrimSpace(req.Description),
		DiscountBehavior:      discountBehavior,
		DiscountType:          discountType,
		DiscountValue:         req.DiscountValue,
		MaxDiscountAmount:     req.MaxDiscountAmount,
		MinBookingAmount:      req.MinBookingAmount,
		UsageLimitTotal:       req.UsageLimitTotal,
		UsageLimitPerCustomer: req.UsageLimitPerCustomer,
		ValidWeekdays:         IntArray(weekdays),
		TimeStart:             trimTimePtr(req.TimeStart),
		TimeEnd:               trimTimePtr(req.TimeEnd),
		StartsAt:              req.StartsAt,
		EndsAt:                req.EndsAt,
		IsActive:              req.IsActive,
		CreatedBy:             actorID,
		UpdatedBy:             actorID,
		ResourceIDs:           resourceIDs,
	}
	if promoID != nil {
		promo.ID = *promoID
		promo.CreatedBy = nil
	}
	return promo, nil
}

func (s *Service) validateApply(ctx context.Context, promo *Promo, input ApplyInput) error {
	now := time.Now().UTC()
	evaluationStart := s.promoEvaluationStart(ctx, input)
	if !promo.IsActive {
		return &InvalidPromoError{Code: "PROMO_INACTIVE", Message: "Promo sedang tidak aktif."}
	}
	if promo.StartsAt != nil && now.Before(promo.StartsAt.UTC()) {
		return &InvalidPromoError{Code: "PROMO_NOT_STARTED", Message: "Promo belum dimulai."}
	}
	if promo.EndsAt != nil && now.After(promo.EndsAt.UTC()) {
		return &InvalidPromoError{Code: "PROMO_EXPIRED", Message: "Promo sudah berakhir."}
	}
	if promo.MinBookingAmount != nil && input.Subtotal < float64(*promo.MinBookingAmount) {
		return &InvalidPromoError{Code: "MIN_BOOKING_NOT_MET", Message: "Minimum booking belum terpenuhi."}
	}
	if len(promo.ValidWeekdays) > 0 {
		weekday := isoWeekday(evaluationStart)
		if !containsWeekday(promo.ValidWeekdays, weekday) {
			return &InvalidPromoError{Code: "WEEKDAY_NOT_ELIGIBLE", Message: "Promo tidak berlaku di hari ini."}
		}
	}
	if promo.TimeStart != nil && promo.TimeEnd != nil {
		current := evaluationStart.Format("15:04:05")
		if current < *promo.TimeStart || current > *promo.TimeEnd {
			return &InvalidPromoError{Code: "TIME_NOT_ELIGIBLE", Message: "Promo tidak berlaku di jam ini."}
		}
	}
	if len(promo.ResourceIDs) > 0 {
		ok := false
		for _, resourceID := range promo.ResourceIDs {
			if resourceID == input.ResourceID {
				ok = true
				break
			}
		}
		if !ok {
			return &InvalidPromoError{Code: "RESOURCE_NOT_ELIGIBLE", Message: "Promo tidak berlaku untuk resource ini."}
		}
	}
	if promo.UsageLimitTotal != nil {
		count, err := s.repo.CountRedemptions(ctx, promo.ID)
		if err != nil {
			return err
		}
		if count >= *promo.UsageLimitTotal {
			return &InvalidPromoError{Code: "USAGE_LIMIT_REACHED", Message: "Kuota promo sudah habis."}
		}
	}
	if promo.UsageLimitPerCustomer != nil && input.CustomerID != nil && *input.CustomerID != uuid.Nil {
		count, err := s.repo.CountCustomerRedemptions(ctx, promo.ID, *input.CustomerID)
		if err != nil {
			return err
		}
		if count >= *promo.UsageLimitPerCustomer {
			return &InvalidPromoError{Code: "CUSTOMER_LIMIT_REACHED", Message: "Batas penggunaan promo sudah tercapai."}
		}
	}
	return nil
}

func (s *Service) promoEvaluationStart(ctx context.Context, input ApplyInput) time.Time {
	if s != nil && s.repo != nil && input.TenantID != uuid.Nil {
		if timezone, err := s.repo.GetTenantTimezone(ctx, input.TenantID); err == nil {
			if location, loadErr := time.LoadLocation(strings.TrimSpace(timezone)); loadErr == nil {
				return input.StartTime.In(location)
			}
		}
	}
	if !input.LocalStart.IsZero() {
		return input.LocalStart
	}
	return input.StartTime
}

func calculateDiscount(promo *Promo, original float64) float64 {
	var discount float64
	switch promo.DiscountType {
	case "percentage":
		discount = original * float64(promo.DiscountValue) / 100
	default:
		discount = float64(promo.DiscountValue)
	}
	if promo.MaxDiscountAmount != nil && discount > float64(*promo.MaxDiscountAmount) {
		discount = float64(*promo.MaxDiscountAmount)
	}
	if discount > original {
		discount = original
	}
	return math.Round(discount)
}

func buildSnapshot(promo *Promo, original, discount, final float64) map[string]any {
	rules := map[string]any{
		"min_booking_amount": promo.MinBookingAmount,
	}
	if len(promo.ValidWeekdays) > 0 {
		rules["valid_weekdays"] = []int(promo.ValidWeekdays)
	}
	if promo.TimeStart != nil {
		rules["time_start"] = *promo.TimeStart
	}
	if promo.TimeEnd != nil {
		rules["time_end"] = *promo.TimeEnd
	}
	if len(promo.ResourceIDs) > 0 {
		resourceIDs := make([]string, 0, len(promo.ResourceIDs))
		for _, resourceID := range promo.ResourceIDs {
			resourceIDs = append(resourceIDs, resourceID.String())
		}
		rules["resource_ids"] = resourceIDs
	}
	return map[string]any{
		"id":                      promo.ID.String(),
		"code":                    promo.Code,
		"name":                    promo.Name,
		"discount_behavior":       promo.DiscountBehavior,
		"discount_type":           promo.DiscountType,
		"discount_value":          promo.DiscountValue,
		"max_discount_amount":     promo.MaxDiscountAmount,
		"applied_discount_amount": discount,
		"original_amount":         original,
		"final_amount":            final,
		"rules":                   rules,
	}
}

func promoLabel(promo *Promo) string {
	if promo == nil {
		return ""
	}
	if promo.DiscountType == "percentage" {
		return fmt.Sprintf("Diskon %d%%", promo.DiscountValue)
	}
	return fmt.Sprintf("Potongan Rp %.0f", float64(promo.DiscountValue))
}

func sanitizeWeekdays(items []int) []int {
	if len(items) == 0 {
		return nil
	}
	seen := map[int]struct{}{}
	out := make([]int, 0, len(items))
	for _, item := range items {
		if item < 1 || item > 7 {
			continue
		}
		if _, exists := seen[item]; exists {
			continue
		}
		seen[item] = struct{}{}
		out = append(out, item)
	}
	return out
}

func trimTimePtr(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func isoWeekday(t time.Time) int {
	weekday := int(t.Weekday())
	if weekday == 0 {
		return 7
	}
	return weekday
}

func containsWeekday(items []int, weekday int) bool {
	for _, item := range items {
		if item == weekday {
			return true
		}
	}
	return false
}

func SnapshotJSON(snapshot map[string]any) ([]byte, error) {
	if len(snapshot) == 0 {
		return []byte(`{}`), nil
	}
	return json.Marshal(snapshot)
}
