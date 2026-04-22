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
	raw, err := hex.DecodeString(idHex)
	if err != nil {
		return uuid.UUID{}, "", err
	}
	bookingID, err = uuid.FromBytes(raw)
	if err != nil {
		return uuid.UUID{}, "", err
	}
	return bookingID, kind, nil
}

func shortNonce() string {
	return fmt.Sprintf("%06x", time.Now().UnixNano()&0xffffff)
}
