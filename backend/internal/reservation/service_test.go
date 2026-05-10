package reservation

import (
	"strings"
	"testing"
	"time"
)

func TestCalculateDepositAmountUsesMinimumThreshold(t *testing.T) {
	if got := calculateDepositAmount(12000, true, 40); got != 10000 {
		t.Fatalf("calculateDepositAmount(12000) = %f, want 10000", got)
	}
}

func TestCalculateDepositAmountNeverExceedsGrandTotal(t *testing.T) {
	if got := calculateDepositAmount(8000, true, 40); got != 8000 {
		t.Fatalf("calculateDepositAmount(8000) = %f, want 8000", got)
	}
}

func TestCalculateDepositAmountCanBeDisabled(t *testing.T) {
	if got := calculateDepositAmount(120000, false, 40); got != 0 {
		t.Fatalf("calculateDepositAmount(120000, false, 40) = %f, want 0", got)
	}
}

func TestValidateBookingTransitionRequiresRecordedDepositBeforeActivation(t *testing.T) {
	err := validateBookingTransition("pending", "active", "pending", 15000, false)
	if err == nil {
		t.Fatal("validateBookingTransition() error = nil, want DP validation error")
	}
}

func TestValidateBookingTransitionAllowsActivationWhenDepositPaid(t *testing.T) {
	if err := validateBookingTransition("pending", "active", "partial_paid", 15000, false); err != nil {
		t.Fatalf("validateBookingTransition() error = %v, want nil", err)
	}
}

func TestValidateBookingTransitionAllowsActivationWhenDepositOverrideActive(t *testing.T) {
	if err := validateBookingTransition("pending", "active", "pending", 15000, true); err != nil {
		t.Fatalf("validateBookingTransition() error = %v, want nil when override active", err)
	}
}

func TestValidateBookingTransitionAllowsCompletionOnlyFromActive(t *testing.T) {
	if err := validateBookingTransition("confirmed", "completed", "paid", 0, false); err == nil {
		t.Fatal("validateBookingTransition() error = nil, want invalid completion error")
	}
}

func TestResolveBookingLifecycleUsesPendingAndDepositForScheduled(t *testing.T) {
	status, deposit, paid, balance, paymentStatus, paymentMethod := resolveBookingLifecycle(
		CreateBookingReq{BookingMode: "scheduled"},
		true,
		120000,
		true,
		40,
	)

	if status != "pending" {
		t.Fatalf("status = %s, want pending", status)
	}
	if deposit <= 0 {
		t.Fatalf("deposit = %f, want positive deposit", deposit)
	}
	if paid != 0 {
		t.Fatalf("paid = %f, want 0", paid)
	}
	if paymentStatus != "pending" {
		t.Fatalf("paymentStatus = %s, want pending", paymentStatus)
	}
	if paymentMethod != "" {
		t.Fatalf("paymentMethod = %s, want empty", paymentMethod)
	}
	if balance != 120000-deposit {
		t.Fatalf("balance = %f, want %f", balance, 120000-deposit)
	}
}

func TestResolveBookingLifecycleBypassesDepositForWalkIn(t *testing.T) {
	status, deposit, paid, balance, paymentStatus, paymentMethod := resolveBookingLifecycle(
		CreateBookingReq{BookingMode: "walkin"},
		true,
		150000,
		true,
		40,
	)

	if status != "active" {
		t.Fatalf("status = %s, want active", status)
	}
	if deposit != 0 {
		t.Fatalf("deposit = %f, want 0", deposit)
	}
	if paid != 0 {
		t.Fatalf("paid = %f, want 0", paid)
	}
	if balance != 150000 {
		t.Fatalf("balance = %f, want 150000", balance)
	}
	if paymentStatus != "unpaid" {
		t.Fatalf("paymentStatus = %s, want unpaid", paymentStatus)
	}
	if paymentMethod != "" {
		t.Fatalf("paymentMethod = %s, want empty", paymentMethod)
	}
}

func TestParseBookingStartTimeUsesTenantLocationForNaiveInput(t *testing.T) {
	location, err := time.LoadLocation("Asia/Tokyo")
	if err != nil {
		t.Fatalf("LoadLocation() error = %v", err)
	}

	start, err := parseBookingStartTime("2026-05-09T08:30:00", location)
	if err != nil {
		t.Fatalf("parseBookingStartTime() error = %v", err)
	}
	if start.Location().String() != "Asia/Tokyo" {
		t.Fatalf("start.Location() = %s, want Asia/Tokyo", start.Location())
	}
	if start.Hour() != 8 || start.Minute() != 30 {
		t.Fatalf("start = %v, want 08:30 in tenant timezone", start)
	}
}

func TestFormatBookingWindowUsesTenantTimezone(t *testing.T) {
	start := time.Date(2026, 5, 9, 1, 30, 0, 0, time.UTC)
	end := start.Add(90 * time.Minute)

	got := formatBookingWindow(start, end, "Asia/Tokyo")
	want := "09 May 2026, 10:30 JST - 12:00 JST"
	if got != want {
		t.Fatalf("formatBookingWindow() = %q, want %q", got, want)
	}
}

func TestWaPaymentReceivedMessageUsesReadableSummary(t *testing.T) {
	got := waPaymentReceivedMessage(
		"Rina",
		"DP booking kamu sudah diterima.",
		"booking-12345678",
		"VIP Room",
		300000,
		120000,
		120000,
		180000,
		"https://bookinaja.test/detail",
	)

	for _, want := range []string{
		"Ringkasan pembayaran",
		"Total       : Rp 300.000",
		"DP          : Rp 120.000",
		"Sudah bayar : Rp 120.000",
		"Sisa bayar  : Rp 180.000",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("message missing %q in %q", want, got)
		}
	}
}
