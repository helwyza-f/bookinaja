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
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/platform/env"
	"github.com/helwiza/backend/internal/platform/fonnte"
	"github.com/helwiza/backend/internal/platform/midtrans"
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

func (s *Service) CheckoutBookingPayment(ctx context.Context, tenantID uuid.UUID, tenantSlug string, bookingID uuid.UUID, mode string) (BookingCheckoutRes, error) {
	booking, err := s.repo.GetBookingForPayment(ctx, s.db, bookingID, tenantID)
	if err != nil {
		return BookingCheckoutRes{}, err
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
		status := strings.ToLower(strings.TrimSpace(booking.Status))
		if status == "active" || status == "ongoing" {
			return BookingCheckoutRes{}, errors.New("SESI HARUS DIAKHIRI TERLEBIH DAHULU SEBELUM MELAKUKAN PELUNASAN")
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
