package billing

import (
	"bytes"
	"context"
	"crypto/sha512"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/helwiza/saas/internal/platform/fonnte"
	"github.com/helwiza/saas/internal/platform/security"
	"github.com/jmoiron/sqlx"
)

type Service struct {
	db   *sqlx.DB
	repo *Repository
	http *http.Client
}

func NewService(db *sqlx.DB, repo *Repository) *Service {
	return &Service{
		db:   db,
		repo: repo,
		http: &http.Client{Timeout: 20 * time.Second},
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

func (s *Service) HandleMidtransNotification(ctx context.Context, payload map[string]any) error {
	orderID, _ := payload["order_id"].(string)
	statusCode := fmt.Sprintf("%v", payload["status_code"])
	grossAmount := fmt.Sprintf("%v", payload["gross_amount"])
	signatureKey, _ := payload["signature_key"].(string)

	if orderID == "" || statusCode == "" || grossAmount == "" || signatureKey == "" {
		return errors.New("invalid midtrans payload")
	}

	if !verifyMidtransSignature(orderID, statusCode, grossAmount, signatureKey, os.Getenv("MIDTRANS_SERVER_KEY")) {
		return errors.New("invalid midtrans signature")
	}

	transactionStatus := strings.ToLower(fmt.Sprintf("%v", payload["transaction_status"]))
	fraudStatus := strings.ToLower(fmt.Sprintf("%v", payload["fraud_status"]))
	paymentType := strings.TrimSpace(fmt.Sprintf("%v", payload["payment_type"]))
	transactionID := strings.TrimSpace(fmt.Sprintf("%v", payload["transaction_id"]))
	if paymentType == "<nil>" {
		paymentType = ""
	}
	if transactionID == "<nil>" {
		transactionID = ""
	}

	newStatus := mapMidtransStatus(transactionStatus, fraudStatus)

	var txIDPtr *string
	if transactionID != "" && transactionID != "<nil>" {
		txIDPtr = &transactionID
	}
	var paymentTypePtr *string
	if paymentType != "" && paymentType != "<nil>" {
		paymentTypePtr = &paymentType
	}

	var notify *BookingNotificationContext
	var notifyMode string
	err := s.withTx(ctx, func(tx *sqlx.Tx) error {
		receivedAt := time.Now().UTC()
		logCommon := MidtransNotificationLog{
			OrderID:           orderID,
			TransactionID:     transactionID,
			TransactionStatus: transactionStatus,
			FraudStatus:       fraudStatus,
			PaymentType:       paymentType,
			GrossAmount:       parseMidtransAmount(grossAmount),
			SignatureValid:    true,
			ProcessingStatus:  "received",
			RawPayload:        mustJSON(payload),
			ReceivedAt:        receivedAt,
		}

		if strings.HasPrefix(orderID, "sub-") {
			updated, err := s.repo.UpdateOrderFromMidtrans(ctx, tx, orderID, newStatus, txIDPtr, paymentTypePtr, payload)
			if err != nil {
				logCommon.ProcessingStatus = "failed"
				logCommon.ErrorMessage = err.Error()
				return s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon)
			}
			logCommon.ProcessingStatus = "processed"
			logCommon.TenantID = &updated.TenantID
			if err := s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon); err != nil {
				return err
			}
			ledgerStatus := "pending"
			if updated.Status == "paid" {
				ledgerStatus = "settled"
			}
			currentBalance, _ := s.repo.CurrentTenantBalance(ctx, tx, updated.TenantID)
			netAmount := parseMidtransAmount(grossAmount)
			nextBalance := currentBalance
			if ledgerStatus == "settled" {
				nextBalance += netAmount
			}
			dedupe := buildLedgerDedupeKey("subscription", orderID, transactionID, newStatus, paymentType)
			if err := s.repo.CreateLedgerEntry(ctx, tx, TenantLedgerEntry{
				TenantID:              updated.TenantID,
				SourceType:            "subscription",
				SourceRef:             orderID,
				MidtransOrderID:       orderID,
				MidtransTransactionID: transactionID,
				TransactionStatus:     newStatus,
				PaymentType:           paymentType,
				Direction:             "credit",
				GrossAmount:           netAmount,
				NetAmount:             netAmount,
				BalanceAfter:          nextBalance,
				Status:                ledgerStatus,
				DedupeKey:             dedupe,
				RawPayload:            mustJSON(payload),
				CreatedAt:             receivedAt,
				UpdatedAt:             receivedAt,
			}); err != nil {
				return err
			}
			if updated.Status != "paid" {
				return nil
			}
			now := time.Now().UTC()
			start := now
			var currentEnd sql.NullTime
			_ = tx.GetContext(ctx, &currentEnd, `SELECT subscription_current_period_end FROM tenants WHERE id = $1`, updated.TenantID)
			if currentEnd.Valid && currentEnd.Time.After(now) {
				start = currentEnd.Time
			}
			end := addInterval(start, updated.BillingInterval)
			return s.repo.ActivateSubscriptionExec(ctx, tx, updated.TenantID, updated.Plan, start, end)
		}
		if strings.HasPrefix(orderID, "book-") {
			bookingIDStr := strings.TrimPrefix(orderID, "book-")
			isSettlement := strings.Contains(orderID, "-due")
			bookingIDStr, _, found := strings.Cut(bookingIDStr, "-dp-")
			if !found {
				bookingIDStr, _, found = strings.Cut(bookingIDStr, "-due-")
				if !found {
					bookingIDStr = strings.TrimSuffix(bookingIDStr, "-dp")
					bookingIDStr = strings.TrimSuffix(bookingIDStr, "-due")
				}
			}
			bookingID, err := uuid.Parse(bookingIDStr)
			if err != nil {
				return err
			}
			bookingInfo, err := s.repo.GetBookingNotificationContext(ctx, tx, bookingID)
			if err != nil {
				logCommon.ProcessingStatus = "failed"
				logCommon.ErrorMessage = err.Error()
				return s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon)
			}
			logCommon.TenantID = &bookingInfo.TenantID
			logCommon.ProcessingStatus = "processed"
			if isSettlement {
				if err := s.repo.UpdateBookingSettlementFromMidtrans(ctx, tx, bookingID, newStatus, txIDPtr, paymentTypePtr, payload); err != nil {
					logCommon.ProcessingStatus = "failed"
					logCommon.ErrorMessage = err.Error()
					return s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon)
				}
				if err := s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon); err != nil {
					return err
				}
				currentBalance, _ := s.repo.CurrentTenantBalance(ctx, tx, bookingInfo.TenantID)
				netAmount := parseMidtransAmount(grossAmount)
				nextBalance := currentBalance + netAmount
				if err := s.repo.CreateLedgerEntry(ctx, tx, TenantLedgerEntry{
					TenantID:              bookingInfo.TenantID,
					SourceType:            "booking_payment",
					SourceID:              &bookingID,
					SourceRef:             orderID,
					MidtransOrderID:       orderID,
					MidtransTransactionID: transactionID,
					TransactionStatus:     newStatus,
					PaymentType:           paymentType,
					Direction:             "credit",
					GrossAmount:           netAmount,
					NetAmount:             netAmount,
					BalanceAfter:          nextBalance,
					Status:                "settled",
					DedupeKey:             buildLedgerDedupeKey("booking_payment", orderID, transactionID, newStatus, paymentType),
					RawPayload:            mustJSON(payload),
					CreatedAt:             receivedAt,
					UpdatedAt:             receivedAt,
				}); err != nil {
					return err
				}
				if shouldNotifyBookingPayment(bookingInfo.PaymentStatus, newStatus) {
					notify = &bookingInfo
					notifyMode = "settlement"
				}
				return nil
			}
			if err := s.repo.UpdateBookingPaymentFromMidtrans(ctx, tx, bookingID, newStatus, txIDPtr, paymentTypePtr, payload); err != nil {
				logCommon.ProcessingStatus = "failed"
				logCommon.ErrorMessage = err.Error()
				return s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon)
			}
			if err := s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon); err != nil {
				return err
			}
			currentBalance, _ := s.repo.CurrentTenantBalance(ctx, tx, bookingInfo.TenantID)
			netAmount := parseMidtransAmount(grossAmount)
			nextBalance := currentBalance + netAmount
			if err := s.repo.CreateLedgerEntry(ctx, tx, TenantLedgerEntry{
				TenantID:              bookingInfo.TenantID,
				SourceType:            "booking_payment",
				SourceID:              &bookingID,
				SourceRef:             orderID,
				MidtransOrderID:       orderID,
				MidtransTransactionID: transactionID,
				TransactionStatus:     newStatus,
				PaymentType:           paymentType,
				Direction:             "credit",
				GrossAmount:           netAmount,
				NetAmount:             netAmount,
				BalanceAfter:          nextBalance,
				Status:                "settled",
				DedupeKey:             buildLedgerDedupeKey("booking_payment", orderID, transactionID, newStatus, paymentType),
				RawPayload:            mustJSON(payload),
				CreatedAt:             receivedAt,
				UpdatedAt:             receivedAt,
			}); err != nil {
				return err
			}
			if shouldNotifyBookingPayment(bookingInfo.PaymentStatus, newStatus) {
				notify = &bookingInfo
				notifyMode = "deposit"
			}
			return nil
		}
		logCommon.ProcessingStatus = "ignored"
		if err := s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon); err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		return err
	}
	if notify != nil {
		_ = s.sendBookingPaymentWhatsApp(ctx, *notify, notifyMode)
	}
	return nil
}

func (s *Service) sendBookingPaymentWhatsApp(ctx context.Context, info BookingNotificationContext, mode string) error {
	if info.CustomerPhone == "" {
		return nil
	}

	token, err := generateCustomerSessionToken(info.CustomerID.String(), info.TenantID.String())
	if err != nil {
		return err
	}

	url := bookingDetailURL(info.TenantSlug, info.BookingID.String(), token)
	paymentNote := "DP booking kamu sudah diterima."
	if mode == "settlement" {
		paymentNote = "Pelunasan booking kamu sudah diterima."
	}

	msg := waPaymentReceivedMessage(info.CustomerName, paymentNote, info.BookingID.String(), info.ResourceName, info.GrandTotal, info.DepositAmount, info.PaidAmount, info.BalanceDue, url)
	_, _ = fonnte.SendMessage(info.CustomerPhone, msg)
	return nil
}

func (s *Service) CheckoutBookingPayment(ctx context.Context, tenantID uuid.UUID, tenantSlug string, bookingID uuid.UUID, mode string) (BookingCheckoutRes, error) {
	booking, err := s.repo.GetBookingForPayment(ctx, s.db, bookingID, tenantID)
	if err != nil {
		return BookingCheckoutRes{}, err
	}

	mode = strings.ToLower(strings.TrimSpace(mode))
	amount := booking.DepositAmount
	orderID := fmt.Sprintf("book-%s-dp", bookingID.String())
	display := "DP"

	if mode == "settlement" || mode == "due" || mode == "balance" || booking.PaymentStatus == "partial_paid" {
		amount = booking.BalanceDue
		orderID = fmt.Sprintf("book-%s-due", bookingID.String())
		display = "Pelunasan"
		if amount <= 0 {
			return BookingCheckoutRes{}, errors.New("booking ini sudah lunas")
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
	_ = rawBytes

	return BookingCheckoutRes{
		OrderID:      orderID,
		SnapToken:    snapToken,
		RedirectURL:  redirectURL,
		Amount:       amount,
		Currency:     "IDR",
		BookingID:    bookingID.String(),
		DisplayLabel: display,
	}, nil
}

func (s *Service) GetSubscription(ctx context.Context, tenantID uuid.UUID) (SubscriptionInfo, error) {
	return s.repo.GetSubscriptionInfo(ctx, tenantID)
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

func verifyMidtransSignature(orderID, statusCode, grossAmount, signatureKey, serverKey string) bool {
	serverKey = strings.TrimSpace(serverKey)
	if serverKey == "" {
		return false
	}
	sum := sha512.Sum512([]byte(orderID + statusCode + grossAmount + serverKey))
	expected := hex.EncodeToString(sum[:])
	return strings.EqualFold(expected, signatureKey)
}

func parseMidtransAmount(raw string) int64 {
	value, _ := strconv.ParseInt(strings.TrimSpace(raw), 10, 64)
	return value
}

func mustJSON(v any) []byte {
	b, _ := json.Marshal(v)
	return b
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

func bookingDetailURL(tenantSlug, bookingID, token string) string {
	slug := strings.TrimSpace(tenantSlug)
	if slug == "" {
		slug = "tenant"
	}
	return fmt.Sprintf("https://%s.bookinaja.com/me/bookings/%s?token=%s", slug, bookingID, token)
}

func generateCustomerSessionToken(customerID, tenantID string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"customer_id": customerID,
		"tenant_id":   tenantID,
		"exp":         time.Now().Add(time.Hour * 72).Unix(),
	})
	return token.SignedString([]byte(security.JWTSecret()))
}

func formatMoney(v float64) string {
	return fmt.Sprintf("%d", int64(v+0.5))
}

func waPaymentReceivedMessage(name, note, bookingID, resourceName string, grandTotal, depositAmount, paidAmount, balanceDue float64, detailURL string) string {
	remaining := balanceDue
	if remaining < 0 {
		remaining = 0
	}
	return fmt.Sprintf(
		"Halo %s, %s\n\nNomor booking: %s\nUnit: %s\nTotal: Rp %s\nDP: Rp %s\nSudah dibayar: Rp %s\nSisa: Rp %s\n\nBuka detail booking di sini:\n%s",
		name,
		note,
		bookingID,
		resourceName,
		formatMoney(grandTotal),
		formatMoney(depositAmount),
		formatMoney(paidAmount),
		formatMoney(remaining),
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
