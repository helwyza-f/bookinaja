package reservation

import "testing"

func TestCalculateDepositAmountUsesMinimumThreshold(t *testing.T) {
	if got := calculateDepositAmount(12000); got != 10000 {
		t.Fatalf("calculateDepositAmount(12000) = %f, want 10000", got)
	}
}

func TestCalculateDepositAmountNeverExceedsGrandTotal(t *testing.T) {
	if got := calculateDepositAmount(8000); got != 8000 {
		t.Fatalf("calculateDepositAmount(8000) = %f, want 8000", got)
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
