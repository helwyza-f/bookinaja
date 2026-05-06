package reservation

import "testing"

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
	err := validateBookingTransition("pending", "active", "pending", 15000)
	if err == nil {
		t.Fatal("validateBookingTransition() error = nil, want DP validation error")
	}
}

func TestValidateBookingTransitionAllowsActivationWhenDepositPaid(t *testing.T) {
	if err := validateBookingTransition("pending", "active", "partial_paid", 15000); err != nil {
		t.Fatalf("validateBookingTransition() error = %v, want nil", err)
	}
}

func TestValidateBookingTransitionAllowsCompletionOnlyFromActive(t *testing.T) {
	if err := validateBookingTransition("confirmed", "completed", "paid", 0); err == nil {
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
