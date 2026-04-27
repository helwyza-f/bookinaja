package midtrans

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/platform/fonnte"
	"github.com/jmoiron/sqlx"
	"math/big"
)

type Repository interface {
	UpdateOrderFromMidtrans(ctx context.Context, exec sqlx.ExtContext, orderID string, status string, transactionID *string, paymentType *string, raw map[string]any) (SubscriptionOrder, error)
	UpdateBookingPaymentFromMidtrans(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID, status string, transactionID *string, paymentType *string, raw map[string]any) error
	UpdateBookingSettlementFromMidtrans(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID, status string, transactionID *string, paymentType *string, raw map[string]any) error
	GetBookingNotificationContext(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID) (BookingNotificationContext, error)
	CreateMidtransNotificationLog(ctx context.Context, exec sqlx.ExtContext, log MidtransNotificationLog) error
	CreateLedgerEntry(ctx context.Context, exec sqlx.ExtContext, entry TenantLedgerEntry) error
	CurrentTenantBalance(ctx context.Context, exec sqlx.ExtContext, tenantID uuid.UUID) (int64, error)
	ActivateSubscriptionExec(ctx context.Context, exec sqlx.ExtContext, tenantID uuid.UUID, plan string, start time.Time, end time.Time) error
}

type Service struct {
	repo Repository
	db   *sqlx.DB
}

func NewService(db *sqlx.DB, repo Repository) *Service {
	return &Service{db: db, repo: repo}
}

func (s *Service) HandleNotification(ctx context.Context, payload map[string]any) error {
	orderID, _ := payload["order_id"].(string)
	statusCode := fmt.Sprintf("%v", payload["status_code"])
	grossAmount := fmt.Sprintf("%v", payload["gross_amount"])
	signatureKey, _ := payload["signature_key"].(string)

	if orderID == "" || statusCode == "" || grossAmount == "" || signatureKey == "" {
		return errors.New("invalid midtrans payload")
	}

	if !VerifySignature(orderID, statusCode, grossAmount, signatureKey, os.Getenv("MIDTRANS_SERVER_KEY")) {
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
	isFinalStatus := transactionStatus == "settlement" || transactionStatus == "capture"
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
			logCommon.GrossAmount = updated.Amount
			if err := s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon); err != nil {
				return err
			}
			if updated.Status != "paid" || !isFinalStatus {
				return nil
			}
			currentBalance, _ := s.repo.CurrentTenantBalance(ctx, tx, updated.TenantID)
			netAmount := amountFromPayloadOrFallback(parseMidtransAmount(grossAmount), updated.Amount)
			nextBalance := currentBalance + netAmount
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
				Status:                "settled",
				DedupeKey:             dedupe,
				RawPayload:            mustJSON(payload),
				CreatedAt:             receivedAt,
				UpdatedAt:             receivedAt,
			}); err != nil {
				return err
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
		if strings.HasPrefix(orderID, "bk-") {
			bookingID, paymentKind, err := ParseBookingOrderID(orderID)
			if err != nil {
				return err
			}
			isSettlement := paymentKind == "due"
			bookingInfo, err := s.repo.GetBookingNotificationContext(ctx, tx, bookingID)
			if err != nil {
				logCommon.ProcessingStatus = "failed"
				logCommon.ErrorMessage = err.Error()
				return s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon)
			}
			logCommon.BookingID = &bookingID
			logCommon.TenantID = &bookingInfo.TenantID
			logCommon.ProcessingStatus = "processed"
			if isSettlement {
				if err := s.repo.UpdateBookingSettlementFromMidtrans(ctx, tx, bookingID, newStatus, txIDPtr, paymentTypePtr, payload); err != nil {
					logCommon.ProcessingStatus = "failed"
					logCommon.ErrorMessage = err.Error()
					return s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon)
				}
				logCommon.GrossAmount = int64(bookingInfo.GrandTotal)
				if err := s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon); err != nil {
					return err
				}
				if !isFinalStatus {
					return nil
				}
				currentBalance, _ := s.repo.CurrentTenantBalance(ctx, tx, bookingInfo.TenantID)
				netAmount := amountFromPayloadOrFallback(parseMidtransAmount(grossAmount), int64(bookingInfo.GrandTotal))
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
			logCommon.GrossAmount = int64(bookingInfo.DepositAmount)
			if err := s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon); err != nil {
				return err
			}
			if !isFinalStatus {
				return nil
			}
			currentBalance, _ := s.repo.CurrentTenantBalance(ctx, tx, bookingInfo.TenantID)
			netAmount := amountFromPayloadOrFallback(parseMidtransAmount(grossAmount), int64(bookingInfo.DepositAmount))
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

	detailURL := fmt.Sprintf("https://%s.%s/verify?code=%s", info.TenantSlug, os.Getenv("APP_DOMAIN"), info.AccessToken.String())
	paymentNote := "DP booking kamu sudah diterima."
	if mode == "settlement" {
		paymentNote = "Pelunasan booking kamu sudah diterima."
	}

	msg := fmt.Sprintf(
		"Halo %s, %s\n\nNomor booking: %s\nUnit: %s\nTotal: Rp %d\nDP: Rp %d\nSudah dibayar: Rp %d\nSisa: Rp %d\n\nBuka detail booking di sini:\n%s",
		info.CustomerName,
		paymentNote,
		info.BookingID.String(),
		info.ResourceName,
		int64(info.GrandTotal+0.5),
		int64(info.DepositAmount+0.5),
		int64(info.PaidAmount+0.5),
		int64(info.BalanceDue+0.5),
		detailURL,
	)
	_, _ = fonnte.SendMessage(info.CustomerPhone, msg)
	return nil
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

func addInterval(start time.Time, interval string) time.Time {
	switch strings.ToLower(strings.TrimSpace(interval)) {
	case "annual", "yearly", "year":
		return start.AddDate(1, 0, 0)
	default:
		return start.AddDate(0, 1, 0)
	}
}

func shouldNotifyBookingPayment(previousStatus, newStatus string) bool {
	previousStatus = strings.ToLower(strings.TrimSpace(previousStatus))
	newStatus = strings.ToLower(strings.TrimSpace(newStatus))
	if newStatus != "paid" && newStatus != "settled" {
		return false
	}
	return previousStatus != "partial_paid" && previousStatus != "settled"
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
