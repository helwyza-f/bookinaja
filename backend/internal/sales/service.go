package sales

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/billing"
	"github.com/helwiza/backend/internal/customer"
	"github.com/helwiza/backend/internal/platform/midtrans"
	platformrealtime "github.com/helwiza/backend/internal/platform/realtime"
	"github.com/helwiza/backend/internal/resource"
	"github.com/jmoiron/sqlx"
)

type Service struct {
	repo         *Repository
	resourceRepo *resource.Repository
	billingRepo  *billing.Repository
	customerSvc  *customer.Service
	db           *sqlx.DB
	http         *http.Client
	realtime     realtimeBroadcaster
}

type realtimeBroadcaster interface {
	Publish(channel string, event platformrealtime.Event) error
}

func NewService(repo *Repository, resourceRepo *resource.Repository, billingRepo *billing.Repository, customerSvc *customer.Service, db *sqlx.DB, realtime ...realtimeBroadcaster) *Service {
	var broadcaster realtimeBroadcaster
	if len(realtime) > 0 {
		broadcaster = realtime[0]
	}
	return &Service{
		repo:         repo,
		resourceRepo: resourceRepo,
		billingRepo:  billingRepo,
		customerSvc:  customerSvc,
		db:           db,
		http:         &http.Client{Timeout: 20 * time.Second},
		realtime:     broadcaster,
	}
}

func (s *Service) CreateOrder(ctx context.Context, tenantID uuid.UUID, createdByUserID *uuid.UUID, input CreateOrderInput) (*Order, error) {
	resourceID, err := uuid.Parse(strings.TrimSpace(input.ResourceID))
	if err != nil {
		return nil, errors.New("resource_id invalid")
	}

	resourceDetail, err := s.resourceRepo.GetOneWithItems(ctx, resourceID)
	if err != nil {
		return nil, errors.New("resource not found")
	}
	if resourceDetail.TenantID != tenantID {
		return nil, errors.New("resource not found")
	}

	mode := resource.NormalizeOperatingMode(resourceDetail.OperatingMode)
	if mode != resource.OperatingModeDirectSale && mode != resource.OperatingModeHybrid {
		return nil, errors.New("resource ini masih khusus booking berbasis waktu")
	}

	var customerID *uuid.UUID
	if raw := strings.TrimSpace(input.CustomerID); raw != "" {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			return nil, errors.New("customer_id invalid")
		}
		customerID = &parsed
	}

	now := time.Now()
	order := Order{
		ID:              uuid.New(),
		TenantID:        tenantID,
		CustomerID:      customerID,
		ResourceID:      resourceID,
		AccessToken:     uuid.New(),
		OrderNumber:     generateOrderNumber(now),
		Status:          "open",
		Subtotal:        0,
		DiscountAmount:  maxFloat(input.DiscountAmount, 0),
		GrandTotal:      0,
		PaidAmount:      0,
		BalanceDue:      0,
		PaymentStatus:   "unpaid",
		PaymentMethod:   normalizePaymentMethod(input.PaymentMethod),
		Notes:           strings.TrimSpace(input.Notes),
		CreatedByUserID: createdByUserID,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	return s.repo.CreateOrder(ctx, order)
}

func (s *Service) CreatePublicOrder(ctx context.Context, input CreatePublicOrderInput) (*Order, *customer.Customer, error) {
	resourceID, err := uuid.Parse(strings.TrimSpace(input.ResourceID))
	if err != nil {
		return nil, nil, errors.New("resource_id invalid")
	}

	resourceDetail, err := s.resourceRepo.GetOneWithItems(ctx, resourceID)
	if err != nil {
		return nil, nil, errors.New("resource not found")
	}

	mode := resource.NormalizeOperatingMode(resourceDetail.OperatingMode)
	if mode != resource.OperatingModeDirectSale {
		return nil, nil, errors.New("resource ini masih memakai flow booking berbasis waktu")
	}
	if len(input.Items) == 0 {
		return nil, nil, errors.New("pilih minimal satu produk")
	}
	if s.customerSvc == nil {
		return nil, nil, errors.New("customer service unavailable")
	}

	cust, err := s.customerSvc.Register(ctx, customer.RegisterReq{
		Name:  strings.TrimSpace(input.CustomerName),
		Phone: strings.TrimSpace(input.CustomerPhone),
	})
	if err != nil {
		return nil, nil, fmt.Errorf("gagal menyiapkan data customer: %w", err)
	}

	order, err := s.CreateOrder(ctx, resourceDetail.TenantID, nil, CreateOrderInput{
		ResourceID: resourceID.String(),
		CustomerID: cust.ID.String(),
		Notes:      strings.TrimSpace(input.Notes),
	})
	if err != nil {
		return nil, nil, err
	}

	for _, item := range input.Items {
		if _, err := s.AddItem(ctx, resourceDetail.TenantID, order.ID, AddItemInput{
			ResourceItemID: item.ResourceItemID,
			Quantity:       item.Quantity,
		}); err != nil {
			return nil, nil, err
		}
	}

	fresh, err := s.GetByID(ctx, resourceDetail.TenantID, order.ID)
	if err != nil {
		return nil, nil, err
	}
	s.emitOrderRealtime("order.created", fresh, map[string]any{
		"flow": "direct_sale",
	})
	return fresh, cust, nil
}

func (s *Service) GetByID(ctx context.Context, tenantID, orderID uuid.UUID) (*Order, error) {
	order, err := s.repo.GetByID(ctx, tenantID, orderID)
	if err != nil {
		return nil, err
	}
	methods, err := s.listTenantPaymentMethods(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	if err := s.repo.HydrateOrderPayments(ctx, order, methods); err != nil {
		return nil, err
	}
	return order, nil
}

func (s *Service) GetByIDForCustomer(ctx context.Context, tenantID *uuid.UUID, orderID, customerID uuid.UUID) (*Order, error) {
	var (
		order *Order
		err   error
	)
	if tenantID != nil && *tenantID != uuid.Nil {
		order, err = s.repo.GetByCustomer(ctx, *tenantID, customerID, orderID)
	} else {
		order, err = s.repo.GetByCustomerGlobal(ctx, customerID, orderID)
	}
	if err != nil {
		return nil, err
	}
	methods, err := s.listTenantPaymentMethods(ctx, order.TenantID)
	if err != nil {
		return nil, err
	}
	if err := s.repo.HydrateOrderPayments(ctx, order, methods); err != nil {
		return nil, err
	}
	return order, nil
}

func (s *Service) ExchangeAccessToken(ctx context.Context, accessToken string) (*Order, *customer.Customer, string, error) {
	tokenUUID, err := uuid.Parse(strings.TrimSpace(accessToken))
	if err != nil {
		return nil, nil, "", errors.New("LINK SUDAH KADALUARSA ATAU TIDAK VALID")
	}

	order, err := s.repo.GetByToken(ctx, tokenUUID)
	if err != nil || order == nil || order.CustomerID == nil {
		return nil, nil, "", errors.New("LINK SUDAH KADALUARSA ATAU TIDAK VALID")
	}
	if s.customerSvc == nil {
		return nil, nil, "", errors.New("CUSTOMER SERVICE TIDAK TERSEDIA")
	}

	cust, err := s.customerSvc.GetDetail(ctx, order.CustomerID.String(), order.TenantID.String())
	if err != nil || cust == nil {
		return nil, nil, "", errors.New("DATA PELANGGAN TIDAK DITEMUKAN")
	}

	tenantSlug, _ := s.repo.GetTenantSlug(ctx, order.TenantID)
	sessionToken, err := customer.GenerateAuthToken(
		cust.ID.String(),
		order.TenantID.String(),
		tenantSlug,
		time.Hour*72,
	)
	if err != nil {
		return nil, nil, "", fmt.Errorf("GAGAL MENUKAR AKSES: %w", err)
	}

	return order, cust, sessionToken, nil
}

func (s *Service) ListByTenant(ctx context.Context, tenantID uuid.UUID, limit int, status, search string) ([]Order, error) {
	return s.repo.ListByTenant(ctx, tenantID, limit, status, search)
}

func (s *Service) ListOpenByTenant(ctx context.Context, tenantID uuid.UUID, limit int) ([]Order, error) {
	return s.repo.ListOpenByTenant(ctx, tenantID, limit)
}

func (s *Service) ListPOSActionFeed(ctx context.Context, tenantID uuid.UUID, limit int, windowMinutes int, search string) ([]POSActionFeedItem, error) {
	return s.repo.ListPOSActionFeed(ctx, tenantID, limit, windowMinutes, search)
}

func (s *Service) AddItem(ctx context.Context, tenantID, orderID uuid.UUID, input AddItemInput) (*OrderItem, error) {
	order, err := s.repo.GetByID(ctx, tenantID, orderID)
	if err != nil {
		return nil, errors.New("sales order not found")
	}
	if order.Status == "completed" || order.Status == "cancelled" {
		return nil, errors.New("sales order sudah ditutup")
	}

	item, err := s.prepareOrderItem(ctx, tenantID, orderID, input)
	if err != nil {
		return nil, err
	}
	return s.repo.CreateItem(ctx, orderID, *item)
}

func (s *Service) UpdateItem(ctx context.Context, tenantID, orderID, itemID uuid.UUID, input UpdateItemInput) error {
	order, err := s.repo.GetByID(ctx, tenantID, orderID)
	if err != nil {
		return errors.New("sales order not found")
	}
	if order.Status == "completed" || order.Status == "cancelled" {
		return errors.New("sales order sudah ditutup")
	}

	item, err := s.prepareOrderItem(ctx, tenantID, orderID, input)
	if err != nil {
		return err
	}
	item.UpdatedAt = time.Now()
	return s.repo.UpdateItem(ctx, tenantID, orderID, itemID, *item)
}

func (s *Service) DeleteItem(ctx context.Context, tenantID, orderID, itemID uuid.UUID) error {
	order, err := s.repo.GetByID(ctx, tenantID, orderID)
	if err != nil {
		return errors.New("sales order not found")
	}
	if order.Status == "completed" || order.Status == "cancelled" {
		return errors.New("sales order sudah ditutup")
	}
	return s.repo.DeleteItem(ctx, tenantID, orderID, itemID)
}

func (s *Service) Checkout(ctx context.Context, tenantID, orderID uuid.UUID, input CheckoutInput) error {
	order, err := s.repo.GetByID(ctx, tenantID, orderID)
	if err != nil {
		return errors.New("sales order not found")
	}
	if len(order.Items) == 0 {
		return errors.New("sales order belum punya item")
	}
	if order.Status == "completed" || order.Status == "cancelled" {
		return errors.New("sales order sudah ditutup")
	}
	return s.repo.UpdateCheckout(ctx, tenantID, orderID, normalizePaymentMethod(input.PaymentMethod), strings.TrimSpace(input.Notes))
}

func (s *Service) CheckoutPayment(ctx context.Context, tenantID, orderID uuid.UUID, input PaymentCheckoutInput) (PaymentCheckoutRes, error) {
	order, err := s.repo.GetByID(ctx, tenantID, orderID)
	if err != nil {
		return PaymentCheckoutRes{}, errors.New("sales order not found")
	}
	if len(order.Items) == 0 {
		return PaymentCheckoutRes{}, errors.New("sales order belum punya item")
	}
	if order.Status == "completed" || order.Status == "cancelled" {
		return PaymentCheckoutRes{}, errors.New("sales order sudah ditutup")
	}
	if order.BalanceDue <= 0 {
		return PaymentCheckoutRes{}, errors.New("sales order ini sudah lunas")
	}
	payAmount := roundCurrencyAmount(order.BalanceDue)
	if payAmount <= 0 {
		return PaymentCheckoutRes{}, errors.New("nominal settlement direct sale tidak valid")
	}

	methodCode := strings.ToLower(strings.TrimSpace(input.Method))
	if methodCode == "" {
		methodCode = strings.ToLower(strings.TrimSpace(os.Getenv("BOOKINAJA_DEFAULT_GATEWAY_METHOD")))
	}
	if methodCode == "" {
		methodCode = "midtrans"
	}
	method, err := s.billingRepo.GetTenantPaymentMethod(ctx, s.db, tenantID, methodCode)
	if err != nil {
		return PaymentCheckoutRes{}, errors.New("metode pembayaran gateway tidak aktif untuk tenant ini")
	}
	if method.VerificationType != "auto" {
		return PaymentCheckoutRes{}, errors.New("metode pembayaran ini tidak mendukung verifikasi otomatis")
	}

	orderRef := midtrans.SalesOrderPaymentOrderID(orderID, "settlement")
	snapToken, redirectURL, err := s.createSnapTransaction(ctx, orderRef, payAmount, "Pelunasan Direct Sale")
	if err != nil {
		return PaymentCheckoutRes{}, err
	}

	rawInit := map[string]any{"snap_token": snapToken, "redirect_url": redirectURL}
	rawBytes, _ := json.Marshal(rawInit)
	now := time.Now().UTC()
	attempt := paymentAttemptRecord{
		ID:               uuid.New(),
		SalesOrderID:     orderID,
		TenantID:         tenantID,
		CustomerID:       order.CustomerID,
		MethodCode:       method.Code,
		MethodLabel:      method.DisplayName,
		Category:         method.Category,
		VerificationType: method.VerificationType,
		PaymentScope:     "settlement",
		Amount:           payAmount,
		Status:           "pending",
		ReferenceCode:    buildReferenceCode("SOPAY"),
		GatewayOrderID:   orderRef,
		Metadata:         rawBytes,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if err := s.repo.CreatePaymentAttempt(ctx, attempt); err != nil {
		return PaymentCheckoutRes{}, err
	}
	if err := s.repo.UpdateCheckout(ctx, tenantID, orderID, method.Code, order.Notes); err != nil {
		return PaymentCheckoutRes{}, err
	}
	s.notifyOrderChange(ctx, tenantID, orderID, "payment.pending", map[string]any{
		"method_code": method.Code,
		"flow":        "direct_sale",
	})

	return PaymentCheckoutRes{
		OrderID:      orderRef,
		SnapToken:    snapToken,
		RedirectURL:  redirectURL,
		Amount:       float64(payAmount),
		Currency:     "IDR",
		SalesOrderID: orderID.String(),
		DisplayLabel: "Pelunasan",
		MethodCode:   method.Code,
		MethodLabel:  method.DisplayName,
		Status:       "pending",
	}, nil
}

func (s *Service) SubmitManualPayment(ctx context.Context, tenantID, orderID uuid.UUID, input ManualPaymentInput) (PaymentCheckoutRes, error) {
	order, err := s.repo.GetByID(ctx, tenantID, orderID)
	if err != nil {
		return PaymentCheckoutRes{}, errors.New("sales order not found")
	}
	if len(order.Items) == 0 {
		return PaymentCheckoutRes{}, errors.New("sales order belum punya item")
	}
	if order.Status == "completed" || order.Status == "cancelled" {
		return PaymentCheckoutRes{}, errors.New("sales order sudah ditutup")
	}
	if order.BalanceDue <= 0 {
		return PaymentCheckoutRes{}, errors.New("sales order ini sudah lunas")
	}

	methodCode := strings.ToLower(strings.TrimSpace(input.Method))
	method, err := s.billingRepo.GetTenantPaymentMethod(ctx, s.db, tenantID, methodCode)
	if err != nil {
		return PaymentCheckoutRes{}, errors.New("metode pembayaran tidak aktif")
	}
	if method.VerificationType != "manual" {
		return PaymentCheckoutRes{}, errors.New("metode ini tidak memakai verifikasi manual")
	}

	exists, err := s.repo.HasPendingManualPaymentAttempt(ctx, orderID)
	if err != nil {
		return PaymentCheckoutRes{}, err
	}
	if exists {
		return PaymentCheckoutRes{}, errors.New("sudah ada pembayaran manual yang menunggu verifikasi admin")
	}

	now := time.Now().UTC()
	submittedAt := now
	reference := buildReferenceCode("SOMAN")
	meta := map[string]any{
		"previous_payment_status": order.PaymentStatus,
		"previous_order_status":   order.Status,
		"previous_paid_amount":    order.PaidAmount,
		"previous_balance_due":    order.BalanceDue,
	}
	attempt := paymentAttemptRecord{
		ID:               uuid.New(),
		SalesOrderID:     orderID,
		TenantID:         tenantID,
		CustomerID:       order.CustomerID,
		MethodCode:       method.Code,
		MethodLabel:      method.DisplayName,
		Category:         method.Category,
		VerificationType: method.VerificationType,
		PaymentScope:     "settlement",
		Amount:           int64(order.BalanceDue),
		Status:           "awaiting_verification",
		ReferenceCode:    reference,
		PayerNote:        strings.TrimSpace(input.Note),
		ProofURL:         strings.TrimSpace(input.ProofURL),
		Metadata:         mustJSON(meta),
		SubmittedAt:      &submittedAt,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if err := s.repo.CreatePaymentAttempt(ctx, attempt); err != nil {
		return PaymentCheckoutRes{}, err
	}
	if err := s.repo.MarkOrderAwaitingVerification(ctx, orderID); err != nil {
		return PaymentCheckoutRes{}, err
	}
	s.notifyOrderChange(ctx, tenantID, orderID, "payment.awaiting_verification", map[string]any{
		"method_code": method.Code,
		"flow":        "direct_sale",
	})

	return PaymentCheckoutRes{
		Amount:       order.BalanceDue,
		Currency:     "IDR",
		SalesOrderID: orderID.String(),
		DisplayLabel: "Pelunasan",
		MethodCode:   method.Code,
		MethodLabel:  method.DisplayName,
		Status:       "awaiting_verification",
		Instructions: method.Instructions,
		Reference:    reference,
		ProofUpload:  true,
	}, nil
}

func (s *Service) VerifyManualPayment(ctx context.Context, tenantID, attemptID uuid.UUID, approve bool, notes string) error {
	attempt, err := s.repo.GetPaymentAttempt(ctx, attemptID, tenantID)
	if err != nil {
		return err
	}
	if attempt.VerificationType != "manual" {
		return errors.New("attempt ini bukan pembayaran manual")
	}
	if attempt.Status != "submitted" && attempt.Status != "awaiting_verification" {
		return errors.New("attempt ini sudah diproses")
	}

	adminNote := strings.TrimSpace(notes)
	if !approve {
		var meta map[string]any
		_ = json.Unmarshal(attempt.Metadata, &meta)
		if meta == nil {
			meta = map[string]any{}
		}
		previousPaymentStatus := getMetadataString(meta, "previous_payment_status", "pending")
		previousOrderStatus := getMetadataString(meta, "previous_order_status", "pending_payment")
		previousPaidAmount := getMetadataFloat(meta, "previous_paid_amount")
		previousBalanceDue := getMetadataFloat(meta, "previous_balance_due")
		if err := s.repo.RestoreOrderPaymentStatus(ctx, attempt.SalesOrderID, previousPaymentStatus, previousPaidAmount, previousBalanceDue, previousOrderStatus); err != nil {
			return err
		}
		if err := s.repo.MarkPaymentAttemptStatus(ctx, attempt.ID, "rejected", nil, &adminNote); err != nil {
			return err
		}
		s.notifyOrderChange(ctx, tenantID, attempt.SalesOrderID, "payment.rejected", map[string]any{
			"attempt_id": attempt.ID.String(),
			"flow":       "direct_sale",
		})
		return nil
	}

	if err := s.repo.ApplyManualSettlementPayment(ctx, attempt.SalesOrderID, attempt.MethodCode); err != nil {
		return err
	}
	if err := s.repo.MarkPaymentAttemptStatus(ctx, attempt.ID, "verified", nil, &adminNote); err != nil {
		return err
	}
	s.notifyOrderChange(ctx, tenantID, attempt.SalesOrderID, "payment.manual.verified", map[string]any{
		"attempt_id": attempt.ID.String(),
		"flow":       "direct_sale",
	})
	return nil
}

func (s *Service) SettleCash(ctx context.Context, tenantID, orderID uuid.UUID, input CashSettleInput) error {
	order, err := s.repo.GetByID(ctx, tenantID, orderID)
	if err != nil {
		return errors.New("sales order not found")
	}
	if len(order.Items) == 0 {
		return errors.New("sales order belum punya item")
	}
	if order.Status == "completed" || order.Status == "cancelled" {
		return errors.New("sales order sudah ditutup")
	}
	if err := s.repo.SettleCash(ctx, tenantID, orderID, normalizePaymentMethod(input.PaymentMethod), strings.TrimSpace(input.Notes)); err != nil {
		return err
	}
	s.notifyOrderChange(ctx, tenantID, orderID, "payment.cash.settled", map[string]any{
		"flow": "direct_sale",
	})
	return nil
}

func (s *Service) Close(ctx context.Context, tenantID, orderID uuid.UUID) error {
	order, err := s.repo.GetByID(ctx, tenantID, orderID)
	if err != nil {
		return errors.New("sales order not found")
	}
	if order.BalanceDue > 0 {
		return errors.New("sales order masih punya sisa tagihan")
	}
	if order.Status == "completed" {
		return nil
	}
	if err := s.repo.Close(ctx, tenantID, orderID); err != nil {
		return err
	}
	s.notifyOrderChange(ctx, tenantID, orderID, "order.completed", map[string]any{
		"flow": "direct_sale",
	})
	return nil
}

func (s *Service) prepareOrderItem(ctx context.Context, tenantID, orderID uuid.UUID, input AddItemInput) (*OrderItem, error) {
	quantity := input.Quantity
	if quantity <= 0 {
		quantity = 1
	}

	itemName := strings.TrimSpace(input.ItemName)
	itemType := normalizeItemType(input.ItemType)
	unitPrice := input.UnitPrice
	var resourceItemID *uuid.UUID
	metadata := json.RawMessage("{}")

	if raw := strings.TrimSpace(input.ResourceItemID); raw != "" {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			return nil, errors.New("resource_item_id invalid")
		}
		snapshot, err := s.repo.GetResourceItemSnapshot(ctx, tenantID, parsed)
		if err != nil {
			return nil, errors.New("resource item tidak ditemukan")
		}
		resourceItemID = snapshot.ResourceItemID
		if itemName == "" {
			itemName = snapshot.ItemName
		}
		if strings.TrimSpace(input.ItemType) == "" {
			itemType = normalizeItemType(snapshot.ItemType)
		}
		if unitPrice <= 0 {
			unitPrice = snapshot.UnitPrice
		}
		if snapshot.Metadata != nil {
			metadata = *snapshot.Metadata
		}
	}

	if itemName == "" {
		return nil, errors.New("item_name wajib diisi")
	}
	if unitPrice < 0 {
		return nil, errors.New("unit_price tidak valid")
	}

	now := time.Now()
	return &OrderItem{
		ID:             uuid.New(),
		SalesOrderID:   orderID,
		ResourceItemID: resourceItemID,
		ItemName:       itemName,
		ItemType:       itemType,
		Quantity:       quantity,
		UnitPrice:      unitPrice,
		Subtotal:       unitPrice * float64(quantity),
		Metadata:       &metadata,
		CreatedAt:      now,
		UpdatedAt:      now,
	}, nil
}

func generateOrderNumber(now time.Time) string {
	return fmt.Sprintf("SO-%s-%s", now.Format("20060102"), strings.ToUpper(uuid.NewString()[:6]))
}

func buildReferenceCode(prefix string) string {
	return fmt.Sprintf("%s-%s", prefix, strings.ToUpper(uuid.NewString()[:8]))
}

func normalizePaymentMethod(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func normalizeItemType(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "direct_sale"
	}
	return value
}

func maxFloat(value float64, minimum float64) float64 {
	if value < minimum {
		return minimum
	}
	return value
}

func (s *Service) notifyOrderChange(ctx context.Context, tenantID, orderID uuid.UUID, eventType string, meta map[string]any) {
	order, err := s.GetByID(ctx, tenantID, orderID)
	if err != nil || order == nil {
		return
	}
	s.emitOrderRealtime(eventType, order, meta)
}

func (s *Service) emitOrderRealtime(eventType string, order *Order, meta map[string]any) {
	if order == nil {
		return
	}
	if s.customerSvc != nil && order.CustomerID != nil {
		s.customerSvc.InvalidatePortalCache(context.Background(), *order.CustomerID)
	}
	if s.realtime == nil {
		return
	}

	event := platformrealtime.NewEvent(eventType)
	event.TenantID = order.TenantID.String()
	event.EntityType = "order"
	event.EntityID = order.ID.String()
	event.Summary = map[string]any{
		"status":         order.Status,
		"payment_status": order.PaymentStatus,
		"resource_name":  order.ResourceName,
		"grand_total":    order.GrandTotal,
		"paid_amount":    order.PaidAmount,
		"balance_due":    order.BalanceDue,
	}
	event.Refs = map[string]any{
		"order_id": order.ID.String(),
	}
	if order.CustomerID != nil {
		event.Refs["customer_id"] = order.CustomerID.String()
	}
	if len(meta) > 0 {
		event.Meta = meta
	}

	tenantID := order.TenantID.String()
	_ = s.realtime.Publish(platformrealtime.TenantOrdersChannel(tenantID), event)
	_ = s.realtime.Publish(platformrealtime.TenantDashboardChannel(tenantID), event)

	if order.CustomerID != nil {
		customerID := order.CustomerID.String()
		_ = s.realtime.Publish(platformrealtime.CustomerOrdersChannel(customerID), event)
		_ = s.realtime.Publish(platformrealtime.CustomerOrderChannel(customerID, order.ID.String()), event)
	}
}

func (s *Service) listTenantPaymentMethods(ctx context.Context, tenantID uuid.UUID) ([]OrderPaymentMethod, error) {
	items, err := s.billingRepo.ListTenantPaymentMethods(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	result := make([]OrderPaymentMethod, 0, len(items))
	for _, item := range items {
		result = append(result, OrderPaymentMethod{
			Code:             item.Code,
			DisplayName:      item.DisplayName,
			Category:         item.Category,
			VerificationType: item.VerificationType,
			Provider:         item.Provider,
			Instructions:     item.Instructions,
			IsActive:         item.IsActive,
			SortOrder:        item.SortOrder,
			Metadata:         JSONB(item.Metadata),
		})
	}
	return result, nil
}

func (s *Service) createSnapTransaction(ctx context.Context, orderID string, amount int64, itemName string) (string, string, error) {
	serverKey := strings.TrimSpace(os.Getenv("MIDTRANS_SERVER_KEY"))
	if serverKey == "" {
		return "", "", errors.New("MIDTRANS_SERVER_KEY is required")
	}

	baseURL := "https://app.sandbox.midtrans.com"
	if strings.ToLower(strings.TrimSpace(os.Getenv("MIDTRANS_IS_PRODUCTION"))) == "true" {
		baseURL = "https://app.midtrans.com"
	}

	body := map[string]any{
		"transaction_details": map[string]any{
			"order_id":     orderID,
			"gross_amount": amount,
		},
		"customer_details": map[string]any{
			"first_name": "Bookinaja",
		},
		"item_details": []map[string]any{
			{
				"id":       "direct-sale-settlement",
				"price":    amount,
				"quantity": 1,
				"name":     sanitizeMidtransItemName(itemName),
			},
		},
		"credit_card": map[string]any{
			"secure": true,
		},
	}

	b, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/snap/v1/transactions", bytes.NewReader(b))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(serverKey, "")

	resp, err := s.http.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	var out struct {
		Token       string `json:"token"`
		RedirectURL string `json:"redirect_url"`
		StatusMsg   string `json:"status_message"`
	}
	rawResp, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(rawResp, &out); err != nil {
		return "", "", err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 || out.Token == "" {
		if len(rawResp) > 0 {
			return "", "", fmt.Errorf("midtrans snap error: http %d: %s", resp.StatusCode, strings.TrimSpace(string(rawResp)))
		}
		if out.StatusMsg != "" {
			return "", "", fmt.Errorf("midtrans snap error: %s", out.StatusMsg)
		}
		return "", "", fmt.Errorf("midtrans snap error: http %d", resp.StatusCode)
	}

	return out.Token, out.RedirectURL, nil
}

func mustJSON(v any) JSONB {
	b, _ := json.Marshal(v)
	return JSONB(b)
}

func getMetadataString(meta map[string]any, key, fallback string) string {
	value := strings.TrimSpace(fmt.Sprintf("%v", meta[key]))
	if value == "" || value == "<nil>" {
		return fallback
	}
	return value
}

func getMetadataFloat(meta map[string]any, key string) float64 {
	switch v := meta[key].(type) {
	case float64:
		return v
	case float32:
		return float64(v)
	case int:
		return float64(v)
	case int64:
		return float64(v)
	case json.Number:
		num, _ := v.Float64()
		return num
	case string:
		num, _ := strconv.ParseFloat(strings.TrimSpace(v), 64)
		return num
	default:
		return 0
	}
}

func roundCurrencyAmount(value float64) int64 {
	return int64(math.Round(value))
}

func sanitizeMidtransItemName(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "Direct Sale Settlement"
	}
	if len(value) > 50 {
		return strings.TrimSpace(value[:50])
	}
	return value
}
