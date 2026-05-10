package midtrans

import (
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestSalesOrderPaymentOrderIDShortEnoughAndParsable(t *testing.T) {
	orderID := uuid.MustParse("123e4567-e89b-12d3-a456-426614174000")

	value := SalesOrderPaymentOrderID(orderID, "settlement")
	if len(value) > 50 {
		t.Fatalf("sales order payment order id too long: %d (%s)", len(value), value)
	}
	if !strings.HasPrefix(value, "so-stl-") {
		t.Fatalf("unexpected sales order payment order id prefix: %s", value)
	}

	parsedOrderID, kind, err := ParseSalesOrderPaymentOrderID(value)
	if err != nil {
		t.Fatalf("ParseSalesOrderPaymentOrderID returned error: %v", err)
	}
	if parsedOrderID != orderID {
		t.Fatalf("parsed order id mismatch: got %s want %s", parsedOrderID, orderID)
	}
	if kind != "settlement" {
		t.Fatalf("parsed kind mismatch: got %s want settlement", kind)
	}
}
