package midtrans

import (
	"crypto/sha512"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

func VerifySignature(orderID, statusCode, grossAmount, signatureKey, serverKey string) bool {
	serverKey = strings.TrimSpace(serverKey)
	if serverKey == "" {
		return false
	}
	sum := sha512.Sum512([]byte(orderID + statusCode + grossAmount + serverKey))
	expected := hex.EncodeToString(sum[:])
	return strings.EqualFold(expected, signatureKey)
}

func BookingOrderID(bookingID uuid.UUID, kind string) string {
	return fmt.Sprintf("bk-%s-%s-%s", strings.ToLower(kind), hex.EncodeToString(bookingID[:]), shortNonce())
}

func ParseBookingOrderID(orderID string) (bookingID uuid.UUID, kind string, err error) {
	if !strings.HasPrefix(orderID, "bk-") {
		return uuid.UUID{}, "", fmt.Errorf("invalid booking order id")
	}
	rest := strings.TrimPrefix(orderID, "bk-")
	parts := strings.Split(rest, "-")
	if len(parts) < 3 {
		return uuid.UUID{}, "", fmt.Errorf("invalid booking order id")
	}
	kind = parts[0]
	idHex := parts[1]
	if len(idHex) < 32 {
		return uuid.UUID{}, "", fmt.Errorf("invalid booking id length")
	}
	if len(idHex) > 32 {
		idHex = idHex[:32]
	}
	raw, err := hex.DecodeString(idHex)
	if err != nil {
		return uuid.UUID{}, "", err
	}
	if len(raw) != 16 {
		return uuid.UUID{}, "", fmt.Errorf("invalid booking id length")
	}
	bookingID, err = uuid.FromBytes(raw)
	if err != nil {
		return uuid.UUID{}, "", err
	}
	return bookingID, kind, nil
}

func SalesOrderPaymentOrderID(orderID uuid.UUID, kind string) string {
	return fmt.Sprintf("so-%s-%s-%s", compactSalesPaymentKind(kind), hex.EncodeToString(orderID[:]), shortNonce())
}

func ParseSalesOrderPaymentOrderID(orderID string) (salesOrderID uuid.UUID, kind string, err error) {
	if !strings.HasPrefix(orderID, "so-") {
		return uuid.UUID{}, "", fmt.Errorf("invalid sales order payment id")
	}
	rest := strings.TrimPrefix(orderID, "so-")
	parts := strings.Split(rest, "-")
	if len(parts) < 3 {
		return uuid.UUID{}, "", fmt.Errorf("invalid sales order payment id")
	}
	kind = expandSalesPaymentKind(parts[0])
	idHex := parts[1]
	if len(idHex) < 32 {
		return uuid.UUID{}, "", fmt.Errorf("invalid sales order id length")
	}
	if len(idHex) > 32 {
		idHex = idHex[:32]
	}
	raw, err := hex.DecodeString(idHex)
	if err != nil {
		return uuid.UUID{}, "", err
	}
	if len(raw) != 16 {
		return uuid.UUID{}, "", fmt.Errorf("invalid sales order id length")
	}
	salesOrderID, err = uuid.FromBytes(raw)
	if err != nil {
		return uuid.UUID{}, "", err
	}
	return salesOrderID, kind, nil
}

func compactSalesPaymentKind(kind string) string {
	switch strings.ToLower(strings.TrimSpace(kind)) {
	case "settlement", "stl":
		return "stl"
	default:
		kind = strings.ToLower(strings.TrimSpace(kind))
		if len(kind) > 8 {
			return kind[:8]
		}
		return kind
	}
}

func expandSalesPaymentKind(kind string) string {
	switch strings.ToLower(strings.TrimSpace(kind)) {
	case "stl":
		return "settlement"
	default:
		return strings.ToLower(strings.TrimSpace(kind))
	}
}

func shortNonce() string {
	return fmt.Sprintf("%06x", time.Now().UnixNano()&0xffffff)
}
