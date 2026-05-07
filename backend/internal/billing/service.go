package billing

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"math/big"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/platform/env"
	"github.com/helwiza/backend/internal/platform/fonnte"
	"github.com/helwiza/backend/internal/platform/midtrans"
	platformrealtime "github.com/helwiza/backend/internal/platform/realtime"
	"github.com/jmoiron/sqlx"
)

type Service struct {
	db       *sqlx.DB
	repo     *Repository
	http     *http.Client
	realtime realtimeBroadcaster
}

type realtimeBroadcaster interface {
	Publish(channel string, event platformrealtime.Event) error
}

func NewService(db *sqlx.DB, repo *Repository, realtime ...realtimeBroadcaster) *Service {
	var broadcaster realtimeBroadcaster
	if len(realtime) > 0 {
		broadcaster = realtime[0]
	}
	return &Service{
		db:       db,
		repo:     repo,
		http:     &http.Client{Timeout: 20 * time.Second},
		realtime: broadcaster,
	}
}

func (s *Service) Checkout(ctx context.Context, tenantID uuid.UUID, tenantSlug string, req CheckoutReq) (CheckoutRes, error) {
	plan := strings.ToLower(strings.TrimSpace(req.Plan))
	interval := strings.ToLower(strings.TrimSpace(req.Interval))

	amount, display, err := priceFor(plan, interval)
	if err != nil {
		return CheckoutRes{}, err
	}

	orderID := fmt.Sprintf("sub-%s-%d", tenantSlug, time.Now().UnixNano())

	snapToken, redirectURL, err := s.createSnapTransaction(ctx, orderID, amount, display)
	if err != nil {
		return CheckoutRes{}, err
	}

	rawInit := map[string]any{
		"snap_token":   snapToken,
		"redirect_url": redirectURL,
	}
	rawBytes, _ := json.Marshal(rawInit)

	if err := s.repo.CreateOrder(ctx, s.db, BillingOrder{
		TenantID:        tenantID,
		OrderID:         orderID,
		Plan:            plan,
		BillingInterval: interval,
		Amount:          amount,
		Currency:        "IDR",
		Status:          "pending",
		MidtransRaw:     rawBytes,
	}); err != nil {
		return CheckoutRes{}, err
	}

	return CheckoutRes{
		OrderID:      orderID,
		SnapToken:    snapToken,
		RedirectURL:  redirectURL,
		Amount:       amount,
		Currency:     "IDR",
		Plan:         plan,
		Interval:     interval,
		DisplayLabel: display,
	}, nil
}

func (s *Service) sendBookingPaymentWhatsApp(ctx context.Context, info BookingNotificationContext, mode string) error {
	if info.CustomerPhone == "" {
		return nil
	}

	url := bookingDetailURL(info.TenantSlug, info.AccessToken.String())
	paymentNote := "DP booking kamu sudah diterima."
	if mode == "settlement" {
		paymentNote = "Pelunasan booking kamu sudah diterima."
	}

	msg := waPaymentReceivedMessage(info.CustomerName, paymentNote, info.BookingID.String(), info.ResourceName, info.GrandTotal, info.DepositAmount, info.PaidAmount, info.BalanceDue, url)
	if strings.ToLower(strings.TrimSpace(os.Getenv("GIN_MODE"))) != "release" {
		fmt.Printf("[WA PAYMENT] event=booking_payment tenant=%s booking=%s phone=%s mode=%s message_len=%d url=%s\n", info.TenantSlug, info.BookingID.String(), info.CustomerPhone, mode, len(msg), url)
	}
	_, _ = fonnte.SendMessage(info.CustomerPhone, msg)
	return nil
}

func (s *Service) CheckoutBookingPayment(ctx context.Context, tenantID uuid.UUID, tenantSlug string, bookingID uuid.UUID, mode string, methodCode string) (BookingCheckoutRes, error) {
	booking, err := s.repo.GetBookingForPayment(ctx, s.db, bookingID, tenantID)
	if err != nil {
		return BookingCheckoutRes{}, err
	}

	methodCode = strings.ToLower(strings.TrimSpace(methodCode))
	if methodCode == "" {
		methodCode = strings.ToLower(strings.TrimSpace(os.Getenv("BOOKINAJA_DEFAULT_GATEWAY_METHOD")))
	}
	if methodCode == "" {
		methodCode = "midtrans"
	}
	method, err := s.repo.GetTenantPaymentMethod(ctx, s.db, tenantID, methodCode)
	if err != nil {
		return BookingCheckoutRes{}, errors.New("metode pembayaran gateway tidak aktif untuk tenant ini")
	}
	if method.VerificationType != "auto" {
		return BookingCheckoutRes{}, errors.New("metode pembayaran ini tidak mendukung verifikasi otomatis")
	}

	mode = strings.ToLower(strings.TrimSpace(mode))
	amount := booking.DepositAmount
	orderID := midtrans.BookingOrderID(bookingID, "dp")
	display := "DP"

	if mode == "settlement" || mode == "due" || mode == "balance" || booking.PaymentStatus == "partial_paid" {
		amount = booking.BalanceDue
		orderID = midtrans.BookingOrderID(bookingID, "due")
		display = "Pelunasan"
		if amount <= 0 {
			return BookingCheckoutRes{}, errors.New("booking ini sudah lunas")
		}
		if err := validateBookingSettlementState(booking.Status); err != nil {
			return BookingCheckoutRes{}, err
		}
	} else {
		if booking.DepositAmount <= 0 {
			return BookingCheckoutRes{}, errors.New("booking ini tidak memiliki DP yang perlu dibayar")
		}
		if booking.PaymentStatus == "settled" || (booking.BalanceDue <= 0 && booking.PaymentStatus == "paid") {
			return BookingCheckoutRes{}, errors.New("booking ini sudah lunas")
		}
	}

	snapToken, redirectURL, err := s.createSnapTransaction(ctx, orderID, int64(amount), display)
	if err != nil {
		return BookingCheckoutRes{}, err
	}

	rawInit := map[string]any{"snap_token": snapToken, "redirect_url": redirectURL}
	rawBytes, _ := json.Marshal(rawInit)

	now := time.Now().UTC()
	attempt := BookingPaymentAttempt{
		ID:               uuid.New(),
		BookingID:        bookingID,
		TenantID:         tenantID,
		MethodCode:       method.Code,
		MethodLabel:      method.DisplayName,
		Category:         method.Category,
		VerificationType: method.VerificationType,
		PaymentScope:     map[bool]string{true: "settlement", false: "deposit"}[display == "Pelunasan"],
		Amount:           int64(amount),
		Status:           "pending",
		ReferenceCode:    buildReferenceCode("PAY"),
		GatewayOrderID:   orderID,
		Metadata:         rawBytes,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if err := s.repo.CreateBookingPaymentAttempt(ctx, s.db, attempt); err != nil {
		return BookingCheckoutRes{}, err
	}

	return BookingCheckoutRes{
		OrderID:      orderID,
		SnapToken:    snapToken,
		RedirectURL:  redirectURL,
		Amount:       amount,
		Currency:     "IDR",
		BookingID:    bookingID.String(),
		DisplayLabel: display,
		MethodCode:   method.Code,
		MethodLabel:  method.DisplayName,
		Status:       "pending",
	}, nil
}

func (s *Service) ListTenantPaymentMethods(ctx context.Context, tenantID uuid.UUID) ([]PaymentMethodOption, error) {
	return s.repo.ListTenantPaymentMethods(ctx, tenantID)
}

func (s *Service) ResolveBookingTenantID(ctx context.Context, bookingID uuid.UUID) (uuid.UUID, error) {
	return s.repo.GetTenantIDByBookingID(ctx, s.db, bookingID)
}

func (s *Service) SubmitManualBookingPayment(ctx context.Context, tenantID uuid.UUID, bookingID uuid.UUID, customerID *uuid.UUID, scope, methodCode, note, proofURL string) (BookingCheckoutRes, error) {
	method, err := s.repo.GetTenantPaymentMethod(ctx, s.db, tenantID, strings.ToLower(strings.TrimSpace(methodCode)))
	if err != nil {
		return BookingCheckoutRes{}, errors.New("metode pembayaran tidak aktif")
	}
	if method.VerificationType != "manual" {
		return BookingCheckoutRes{}, errors.New("metode ini tidak memakai verifikasi manual")
	}

	booking, err := s.repo.GetBookingForPayment(ctx, s.db, bookingID, tenantID)
	if err != nil {
		return BookingCheckoutRes{}, err
	}

	scope = strings.ToLower(strings.TrimSpace(scope))
	if scope == "" {
		scope = "deposit"
	}
	scope = strings.TrimSpace(scope)
	if err := validateManualMethodForScope(method.Code, scope); err != nil {
		return BookingCheckoutRes{}, err
	}

	amount := int64(booking.DepositAmount)
	display := "DP"
	if scope == "settlement" {
		display = "Pelunasan"
		amount = int64(booking.BalanceDue)
		if amount <= 0 {
			return BookingCheckoutRes{}, errors.New("booking ini sudah lunas")
		}
		if err := validateBookingSettlementState(booking.Status); err != nil {
			return BookingCheckoutRes{}, err
		}
	} else if booking.DepositAmount <= 0 {
		return BookingCheckoutRes{}, errors.New("booking ini tidak memiliki DP yang perlu dibayar")
	}

	now := time.Now().UTC()
	submittedAt := now
	reference := buildReferenceCode("MANUAL")
	if err := s.withTx(ctx, func(tx *sqlx.Tx) error {
		exists, err := s.repo.HasPendingManualPaymentAttempt(ctx, tx, bookingID, scope)
		if err != nil {
			return err
		}
		if exists {
			return errors.New("sudah ada pembayaran manual yang menunggu verifikasi admin")
		}

		meta := decodePaymentMethodMetadata(method.Metadata)
		meta["previous_payment_status"] = booking.PaymentStatus
		meta["previous_booking_status"] = booking.Status
		meta["previous_paid_amount"] = booking.PaidAmount
		meta["previous_balance_due"] = booking.BalanceDue

		attempt := BookingPaymentAttempt{
			ID:               uuid.New(),
			BookingID:        bookingID,
			TenantID:         tenantID,
			CustomerID:       customerID,
			MethodCode:       method.Code,
			MethodLabel:      method.DisplayName,
			Category:         method.Category,
			VerificationType: method.VerificationType,
			PaymentScope:     scope,
			Amount:           amount,
			Status:           "awaiting_verification",
			ReferenceCode:    reference,
			PayerNote:        strings.TrimSpace(note),
			ProofURL:         strings.TrimSpace(proofURL),
			Metadata:         mustJSON(meta),
			SubmittedAt:      &submittedAt,
			CreatedAt:        now,
			UpdatedAt:        now,
		}
		if err := s.repo.CreateBookingPaymentAttempt(ctx, tx, attempt); err != nil {
			return err
		}

		return s.repo.MarkBookingAwaitingVerification(ctx, tx, bookingID)
	}); err != nil {
		return BookingCheckoutRes{}, err
	}

	if info, err := s.repo.GetBookingNotificationContext(ctx, s.db, bookingID); err == nil {
		s.emitManualPaymentRealtime("payment.awaiting_verification", info, scope, reference, method)
	}

	return BookingCheckoutRes{
		Amount:       float64(amount),
		Currency:     "IDR",
		BookingID:    bookingID.String(),
		DisplayLabel: display,
		MethodCode:   method.Code,
		MethodLabel:  method.DisplayName,
		Status:       "awaiting_verification",
		Instructions: method.Instructions,
		Reference:    reference,
		ProofUpload:  true,
	}, nil
}

func (s *Service) VerifyManualBookingPayment(ctx context.Context, tenantID, attemptID uuid.UUID, approve bool, notes string) error {
	var eventType string
	var info *BookingNotificationContext
	var paymentScope string
	err := s.withTx(ctx, func(tx *sqlx.Tx) error {
		attempt, err := s.repo.GetBookingPaymentAttempt(ctx, tx, attemptID, tenantID)
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
			meta := decodePaymentMethodMetadata(attempt.Metadata)
			previousPaymentStatus := getMetadataString(meta, "previous_payment_status", "pending")
			previousBookingStatus := getMetadataString(meta, "previous_booking_status", "pending")
			previousPaidAmount := getMetadataFloat(meta, "previous_paid_amount")
			previousBalanceDue := getMetadataFloat(meta, "previous_balance_due")
			currentBooking, err := s.repo.GetBookingForPayment(ctx, tx, attempt.BookingID, tenantID)
			if err != nil {
				return err
			}
			if strings.EqualFold(strings.TrimSpace(currentBooking.PaymentStatus), "awaiting_verification") {
				statusToKeep := previousBookingStatus
				if !strings.EqualFold(strings.TrimSpace(currentBooking.Status), strings.TrimSpace(previousBookingStatus)) {
					statusToKeep = currentBooking.Status
				}
				if err := s.repo.RestoreBookingPaymentStatus(ctx, tx, attempt.BookingID, previousPaymentStatus, previousPaidAmount, previousBalanceDue, statusToKeep); err != nil {
					return err
				}
			}
			status := "rejected"
			if err := s.repo.MarkBookingPaymentAttemptStatus(ctx, tx, attempt.ID, status, nil, &adminNote); err != nil {
				return err
			}
			eventType = "payment.manual.rejected"
			paymentScope = attempt.PaymentScope
			if ctxData, ctxErr := s.repo.GetBookingNotificationContext(ctx, tx, attempt.BookingID); ctxErr == nil {
				info = &ctxData
			}
			return nil
		}

		if attempt.PaymentScope == "settlement" {
			if err := s.repo.ApplyManualSettlementPayment(ctx, tx, attempt.BookingID, attempt.MethodCode); err != nil {
				return err
			}
		} else {
			if err := s.repo.ApplyManualDepositPayment(ctx, tx, attempt.BookingID, attempt.MethodCode); err != nil {
				return err
			}
		}

		status := "verified"
		if err := s.repo.MarkBookingPaymentAttemptStatus(ctx, tx, attempt.ID, status, nil, &adminNote); err != nil {
			return err
		}
		if attempt.PaymentScope == "settlement" {
			eventType = "payment.settlement.paid"
		} else {
			eventType = "payment.dp.paid"
		}
		paymentScope = attempt.PaymentScope
		if ctxData, ctxErr := s.repo.GetBookingNotificationContext(ctx, tx, attempt.BookingID); ctxErr == nil {
			info = &ctxData
		}
		return nil
	})
	if err != nil {
		return err
	}
	if info != nil {
		s.emitManualPaymentRealtime(eventType, *info, paymentScope, "", PaymentMethodOption{})
	}
	return nil
}

func (s *Service) ListBookingPaymentAttempts(ctx context.Context, tenantID, bookingID uuid.UUID) ([]BookingPaymentAttempt, error) {
	return s.repo.ListBookingPaymentAttempts(ctx, bookingID, tenantID)
}

func (s *Service) GetSubscription(ctx context.Context, tenantID uuid.UUID) (SubscriptionInfo, error) {
	return s.repo.GetSubscriptionInfo(ctx, tenantID)
}

func (s *Service) emitManualPaymentRealtime(eventType string, info BookingNotificationContext, scope, reference string, method PaymentMethodOption) {
	if s.realtime == nil {
		return
	}

	event := platformrealtime.NewEvent(eventType)
	event.TenantID = info.TenantID.String()
	event.EntityType = "booking"
	event.EntityID = info.BookingID.String()
	event.Summary = map[string]any{
		"status":         info.Status,
		"payment_status": info.PaymentStatus,
		"resource_name":  info.ResourceName,
		"customer_name":  info.CustomerName,
		"grand_total":    info.GrandTotal,
		"balance_due":    info.BalanceDue,
	}
	event.Refs = map[string]any{
		"booking_id":  info.BookingID.String(),
		"customer_id": info.CustomerID.String(),
	}
	event.Meta = map[string]any{
		"payment_scope": scope,
		"reference":     reference,
	}
	if method.Code != "" {
		event.Meta["payment_method"] = method.Code
		event.Meta["payment_method_label"] = method.DisplayName
	}

	_ = s.realtime.Publish(platformrealtime.TenantBookingsChannel(info.TenantID.String()), event)
	_ = s.realtime.Publish(platformrealtime.TenantBookingChannel(info.TenantID.String(), info.BookingID.String()), event)
	_ = s.realtime.Publish(platformrealtime.TenantDashboardChannel(info.TenantID.String()), event)
	_ = s.realtime.Publish(platformrealtime.CustomerBookingChannel(info.CustomerID.String(), info.BookingID.String()), event)
}

func (s *Service) ListOrders(ctx context.Context, tenantID uuid.UUID, limit int) ([]BillingOrder, error) {
	return s.repo.ListOrdersByTenant(ctx, tenantID, limit)
}

func (s *Service) withTx(ctx context.Context, fn func(tx *sqlx.Tx) error) error {
	tx, err := s.db.BeginTxx(ctx, &sql.TxOptions{})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit()
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
				"id":       orderID,
				"price":    amount,
				"quantity": 1,
				"name":     itemName,
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
		ErrorMsgs   any    `json:"error_messages"`
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

func shouldNotifyBookingPayment(previousStatus, newStatus string) bool {
	previousStatus = strings.ToLower(strings.TrimSpace(previousStatus))
	newStatus = strings.ToLower(strings.TrimSpace(newStatus))
	if newStatus != "paid" && newStatus != "settled" {
		return false
	}
	return previousStatus != "partial_paid" && previousStatus != "settled"
}

func parseMidtransAmount(raw string) int64 {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}
	dec, _, err := big.ParseFloat(raw, 10, 64, big.ToNearestEven)
	if err != nil {
		return 0
	}
	f, _ := dec.Float64()
	return int64(math.Round(f))
}

func amountFromPayloadOrFallback(payloadAmount int64, fallback int64) int64 {
	if payloadAmount > 0 {
		return payloadAmount
	}
	return fallback
}

func mustJSON(v any) []byte {
	b, _ := json.Marshal(v)
	return b
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

func validateBookingSettlementState(status string) error {
	status = strings.ToLower(strings.TrimSpace(status))
	switch status {
	case "active", "ongoing":
		return errors.New("SESI HARUS DIAKHIRI TERLEBIH DAHULU SEBELUM MELAKUKAN PELUNASAN")
	case "completed":
		return nil
	default:
		return errors.New("pelunasan hanya tersedia setelah sesi selesai")
	}
}

func validateManualMethodForScope(methodCode, scope string) error {
	methodCode = strings.ToLower(strings.TrimSpace(methodCode))
	scope = strings.ToLower(strings.TrimSpace(scope))
	if scope == "deposit" && methodCode == "cash" {
		return errors.New("cash / bayar di tempat tidak tersedia untuk pembayaran DP")
	}
	return nil
}

func buildLedgerDedupeKey(sourceType, orderID, transactionID, status, paymentType string) string {
	return strings.ToLower(strings.TrimSpace(sourceType)) + ":" +
		strings.TrimSpace(orderID) + ":" +
		strings.TrimSpace(transactionID) + ":" +
		strings.ToLower(strings.TrimSpace(status)) + ":" +
		strings.ToLower(strings.TrimSpace(paymentType))
}

func mapMidtransStatus(transactionStatus string, fraudStatus string) string {
	switch transactionStatus {
	case "capture":
		if fraudStatus == "challenge" {
			return "pending"
		}
		return "paid"
	case "settlement":
		return "paid"
	case "pending":
		return "pending"
	case "deny":
		return "denied"
	case "cancel":
		return "cancelled"
	case "expire":
		return "expired"
	case "refund", "partial_refund", "chargeback", "partial_chargeback":
		return "failed"
	default:
		return "pending"
	}
}

func addInterval(start time.Time, interval string) time.Time {
	switch strings.ToLower(strings.TrimSpace(interval)) {
	case "annual", "yearly", "year":
		return start.AddDate(1, 0, 0)
	default:
		return start.AddDate(0, 1, 0)
	}
}

func bookingDetailURL(tenantSlug, accessToken string) string {
	return env.PlatformURL(fmt.Sprintf("/user/verify?code=%s", accessToken))
}

func formatMoney(v float64) string {
	val := int64(math.Round(v))
	raw := fmt.Sprintf("%d", val)
	if len(raw) <= 3 {
		return "Rp " + raw
	}
	var b strings.Builder
	for i, r := range raw {
		if i > 0 && (len(raw)-i)%3 == 0 {
			b.WriteString(".")
		}
		b.WriteRune(r)
	}
	return "Rp " + b.String()
}

func waPaymentReceivedMessage(name, note, bookingID, resourceName string, grandTotal, depositAmount, paidAmount, balanceDue float64, detailURL string) string {
	remaining := balanceDue
	if remaining < 0 {
		remaining = 0
	}
	ref := bookingID
	if len(ref) >= 8 {
		ref = strings.ToUpper(ref[:8])
	} else {
		ref = strings.ToUpper(ref)
	}
	statusLine := "Status pembayaran: booking kamu sudah lunas."
	if remaining > 0 {
		statusLine = fmt.Sprintf("Status pembayaran: sisa tagihan kamu masih %s.", formatMoney(remaining))
	}
	return fmt.Sprintf(
		"Pembayaran Diterima\n\n"+
			"Halo *%s*, %s\n\n"+
			"Ref         : *%s*\n"+
			"Unit        : *%s*\n\n"+
			"Ringkasan pembayaran\n"+
			"Total       : %s\n"+
			"DP          : %s\n"+
			"Sudah bayar : %s\n"+
			"Sisa bayar  : %s\n\n"+
			"%s\n\n"+
			"Buka detail booking:\n%s",
		name,
		note,
		ref,
		resourceName,
		formatMoney(grandTotal),
		formatMoney(depositAmount),
		formatMoney(paidAmount),
		formatMoney(remaining),
		statusLine,
		detailURL,
	)
}

func priceFor(plan string, interval string) (int64, string, error) {
	switch plan {
	case "starter":
		if interval == "annual" {
			return 1440000, "Bookinaja Starter (Tahunan)", nil
		}
		return 150000, "Bookinaja Starter (Bulanan)", nil
	case "pro":
		if interval == "annual" {
			return 2880000, "Bookinaja Pro (Tahunan)", nil
		}
		return 300000, "Bookinaja Pro (Bulanan)", nil
	default:
		return 0, "", errors.New("plan must be starter or pro")
	}
}
