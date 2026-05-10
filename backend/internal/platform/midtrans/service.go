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

	"github.com/helwiza/backend/internal/platform/fonnte"
	platformrealtime "github.com/helwiza/backend/internal/platform/realtime"
	"github.com/jmoiron/sqlx"
	"math/big"
)

type Service struct {
	repo     *Repository
	db       *sqlx.DB
	realtime realtimeBroadcaster
}

type realtimeBroadcaster interface {
	Publish(channel string, event platformrealtime.Event) error
}

func NewService(db *sqlx.DB, repo *Repository, realtime realtimeBroadcaster) *Service {
	return &Service{db: db, repo: repo, realtime: realtime}
}

func (s *Service) HandleNotification(ctx context.Context, payload map[string]any) error {
	orderID, _ := payload["order_id"].(string)
	statusCode := fmt.Sprintf("%v", payload["status_code"])
	grossAmount := fmt.Sprintf("%v", payload["gross_amount"])
	signatureKey, _ := payload["signature_key"].(string)
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

	logFailure := func(message string, signatureValid bool) {
		_ = s.repo.CreateMidtransNotificationLogDirect(ctx, MidtransNotificationLog{
			OrderID:           orderID,
			TransactionID:     transactionID,
			TransactionStatus: transactionStatus,
			FraudStatus:       fraudStatus,
			PaymentType:       paymentType,
			GrossAmount:       parseMidtransAmount(grossAmount),
			SignatureValid:    signatureValid,
			ProcessingStatus:  "failed",
			ErrorMessage:      message,
			RawPayload:        mustJSON(payload),
			ReceivedAt:        time.Now().UTC(),
		})
	}

	if orderID == "" || statusCode == "" || grossAmount == "" || signatureKey == "" {
		logFailure("invalid midtrans payload", false)
		return errors.New("invalid midtrans payload")
	}

	serverKey := strings.TrimSpace(os.Getenv("MIDTRANS_SERVER_KEY"))
	if serverKey == "" {
		logFailure("MIDTRANS_SERVER_KEY is missing", false)
		return errors.New("midtrans server key is missing")
	}
	if !VerifySignature(orderID, statusCode, grossAmount, signatureKey, serverKey) {
		logFailure("invalid midtrans signature", false)
		return errors.New("invalid midtrans signature")
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
			if err := s.repo.ActivateSubscriptionExec(ctx, tx, updated.TenantID, updated.Plan, start, end); err != nil {
				return err
			}
			return s.repo.CreateReferralRewardIfEligible(ctx, tx, updated.TenantID, orderID)
		}
		if strings.HasPrefix(orderID, "bk-") {
			bookingID, paymentKind, err := ParseBookingOrderID(orderID)
			if err != nil {
				logCommon.ProcessingStatus = "failed"
				logCommon.ErrorMessage = err.Error()
				if logErr := s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon); logErr != nil {
					return logErr
				}
				return err
			}
			attempt, err := s.repo.GetBookingPaymentAttemptByGatewayOrderID(ctx, tx, orderID)
			if err != nil {
				return err
			}
			bookingMethod := paymentType
			if attempt != nil && strings.TrimSpace(attempt.MethodCode) != "" {
				bookingMethod = attempt.MethodCode
			}
			var bookingMethodPtr *string
			if bookingMethod != "" {
				bookingMethodPtr = &bookingMethod
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
				if err := s.repo.UpdateBookingSettlementFromMidtrans(ctx, tx, bookingID, newStatus, txIDPtr, bookingMethodPtr, payload); err != nil {
					logCommon.ProcessingStatus = "failed"
					logCommon.ErrorMessage = err.Error()
					return s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon)
				}
				if isFinalStatus {
					if err := s.repo.UpdatePromoRedemptionStatus(ctx, tx, bookingID, "redeemed"); err != nil {
						return err
					}
				}
				if attempt != nil && isFinalStatus {
					if err := s.repo.MarkBookingPaymentAttemptStatus(ctx, tx, attempt.ID, "paid", txIDPtr, nil); err != nil {
						return err
					}
				}
				if isFinalStatus {
					if err := s.repo.CreateBookingEvent(ctx, tx, bookingInfo, "payment", "payment.settlement.paid", "Pelunasan digital diterima", "Midtrans mengonfirmasi pembayaran pelunasan.", map[string]any{"order_id": orderID, "status": newStatus, "payment_type": paymentType}); err != nil {
						fmt.Printf("[MIDTRANS WEBHOOK] booking event skipped order_id=%s event=payment.settlement.paid error=%v\n", orderID, err)
					}
					if bookingInfo.Status != "completed" {
						if err := s.repo.CreateBookingEvent(ctx, tx, bookingInfo, "system", "session.completed", "Sesi ditutup oleh settlement", "Sistem menandai sesi selesai setelah pelunasan digital.", map[string]any{"from_status": bookingInfo.Status, "to_status": "completed"}); err != nil {
							fmt.Printf("[MIDTRANS WEBHOOK] booking event skipped order_id=%s event=session.completed error=%v\n", orderID, err)
						}
					}
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
				if err := s.repo.AwardCustomerBookingPoints(ctx, tx, bookingInfo, int64(bookingInfo.GrandTotal)); err != nil {
					return err
				}
				return nil
			}
			if err := s.repo.UpdateBookingPaymentFromMidtrans(ctx, tx, bookingID, newStatus, txIDPtr, bookingMethodPtr, payload); err != nil {
				logCommon.ProcessingStatus = "failed"
				logCommon.ErrorMessage = err.Error()
				return s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon)
			}
			if isFinalStatus {
				if err := s.repo.UpdatePromoRedemptionStatus(ctx, tx, bookingID, "redeemed"); err != nil {
					return err
				}
			}
			if attempt != nil && isFinalStatus {
				if err := s.repo.MarkBookingPaymentAttemptStatus(ctx, tx, attempt.ID, "paid", txIDPtr, nil); err != nil {
					return err
				}
			}
			if isFinalStatus {
				if err := s.repo.CreateBookingEvent(ctx, tx, bookingInfo, "payment", "payment.dp.paid", "DP digital diterima", "Midtrans mengonfirmasi pembayaran DP.", map[string]any{"order_id": orderID, "status": newStatus, "payment_type": paymentType}); err != nil {
					fmt.Printf("[MIDTRANS WEBHOOK] booking event skipped order_id=%s event=payment.dp.paid error=%v\n", orderID, err)
				}
				if bookingInfo.Status == "pending" {
					if err := s.repo.CreateBookingEvent(ctx, tx, bookingInfo, "system", "booking.confirmed", "Booking dikonfirmasi", "Sistem mengonfirmasi booking setelah DP diterima.", map[string]any{"from_status": "pending", "to_status": "confirmed"}); err != nil {
						fmt.Printf("[MIDTRANS WEBHOOK] booking event skipped order_id=%s event=booking.confirmed error=%v\n", orderID, err)
					}
				}
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
			if bookingInfo.BalanceDue <= 0 {
				if err := s.repo.AwardCustomerBookingPoints(ctx, tx, bookingInfo, int64(bookingInfo.GrandTotal)); err != nil {
					return err
				}
			}
			return nil
		}
		if strings.HasPrefix(orderID, "so-") {
			salesOrderID, _, err := ParseSalesOrderPaymentOrderID(orderID)
			if err != nil {
				logCommon.ProcessingStatus = "failed"
				logCommon.ErrorMessage = err.Error()
				if logErr := s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon); logErr != nil {
					return logErr
				}
				return err
			}
			attempt, err := s.repo.GetSalesOrderPaymentAttemptByGatewayOrderID(ctx, tx, orderID)
			if err != nil {
				return err
			}
			salesMethod := paymentType
			if attempt != nil && strings.TrimSpace(attempt.MethodCode) != "" {
				salesMethod = attempt.MethodCode
			}
			var salesMethodPtr *string
			if salesMethod != "" {
				salesMethodPtr = &salesMethod
			}
			if err := s.repo.UpdateSalesOrderSettlementFromMidtrans(ctx, tx, salesOrderID, newStatus, salesMethodPtr); err != nil {
				logCommon.ProcessingStatus = "failed"
				logCommon.ErrorMessage = err.Error()
				return s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon)
			}
			if attempt != nil && isFinalStatus {
				if err := s.repo.MarkSalesOrderPaymentAttemptStatus(ctx, tx, attempt.ID, "paid", txIDPtr); err != nil {
					return err
				}
				logCommon.TenantID = &attempt.TenantID
				logCommon.GrossAmount = attempt.Amount
			}
			logCommon.ProcessingStatus = "processed"
			if err := s.repo.CreateMidtransNotificationLog(ctx, tx, logCommon); err != nil {
				return err
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
		eventType := "payment.dp.paid"
		if notifyMode == "settlement" {
			eventType = "payment.settlement.paid"
		}
		s.emitBookingPaymentRealtime(eventType, *notify, notifyMode)
		_ = s.sendBookingPaymentWhatsApp(ctx, *notify, notifyMode)
	}
	return nil
}

func (s *Service) emitBookingPaymentRealtime(eventType string, info BookingNotificationContext, mode string) {
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
		"payment_mode": mode,
	}

	_ = s.realtime.Publish(platformrealtime.TenantBookingsChannel(info.TenantID.String()), event)
	_ = s.realtime.Publish(platformrealtime.TenantBookingChannel(info.TenantID.String(), info.BookingID.String()), event)
	_ = s.realtime.Publish(platformrealtime.TenantDashboardChannel(info.TenantID.String()), event)
	_ = s.realtime.Publish(platformrealtime.CustomerBookingChannel(info.CustomerID.String(), info.BookingID.String()), event)
}

func (s *Service) sendBookingPaymentWhatsApp(ctx context.Context, info BookingNotificationContext, mode string) error {
	if info.CustomerPhone == "" {
		return nil
	}

	detailURL := fmt.Sprintf("%s://%s/user/verify?code=%s", appProtocol(), appDomain(), info.AccessToken.String())
	paymentNote := "DP booking kamu sudah diterima."
	if mode == "settlement" {
		paymentNote = "Pelunasan booking kamu sudah diterima."
	}

	remaining := info.BalanceDue
	if remaining < 0 {
		remaining = 0
	}
	statusLine := "Status pembayaran: booking kamu sudah lunas."
	if remaining > 0 {
		statusLine = fmt.Sprintf("Status pembayaran: sisa tagihan kamu masih %s.", formatMoney(remaining))
	}

	ref := info.BookingID.String()
	if len(ref) >= 8 {
		ref = strings.ToUpper(ref[:8])
	} else {
		ref = strings.ToUpper(ref)
	}

	msg := fmt.Sprintf(
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
		info.CustomerName,
		paymentNote,
		ref,
		info.ResourceName,
		formatMoney(info.GrandTotal),
		formatMoney(info.DepositAmount),
		formatMoney(info.PaidAmount),
		formatMoney(remaining),
		statusLine,
		detailURL,
	)
	_, _ = fonnte.SendMessage(info.CustomerPhone, msg)
	return nil
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
func appProtocol() string {
	if p := strings.TrimSpace(os.Getenv("APP_PROTOCOL")); p != "" {
		return p
	}
	env := strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV")))
	if env == "local" || env == "dev" || env == "development" {
		return "http"
	}
	return "https"
}

func appDomain() string {
	if d := strings.TrimSpace(os.Getenv("APP_DOMAIN")); d != "" {
		return d
	}
	return "bookinaja.com"
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
