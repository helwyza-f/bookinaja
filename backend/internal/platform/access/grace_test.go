package access

import (
	"testing"
	"time"
)

func daysAgo(n int) *time.Time {
	t := time.Now().UTC().Add(-time.Duration(n) * 24 * time.Hour)
	return &t
}

func TestCurrentGracePhase(t *testing.T) {
	future := time.Now().UTC().Add(24 * time.Hour)
	cases := []struct {
		name      string
		status    string
		periodEnd *time.Time
		want      GracePhase
	}{
		{"active status", "active", &future, GracePhaseActive},
		{"trial still valid", "trial", &future, GracePhaseActive},
		{"just lapsed", "expired", daysAgo(0), GracePhaseSoft},
		{"soft edge (day 7, friction=8)", "expired", daysAgo(7), GracePhaseSoft},
		{"friction start (day 8)", "expired", daysAgo(8), GracePhaseFriction},
		{"friction edge (day 14, lock=15)", "inactive", daysAgo(14), GracePhaseFriction},
		{"lock (day 15)", "inactive", daysAgo(15), GracePhaseLocked},
		{"lock deep (day 40)", "inactive", daysAgo(40), GracePhaseLocked},
		{"inactive without periodEnd -> soft", "inactive", nil, GracePhaseSoft},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := CurrentGracePhase(c.status, c.periodEnd); got != c.want {
				t.Fatalf("phase = %d, want %d", got, c.want)
			}
		})
	}
}

func TestEffectivePlanGraceRamp(t *testing.T) {
	// Soft grace keeps full plan; friction/lock drop to Free.
	if got := EffectivePlan("pro", "expired", daysAgo(3)); got != PlanPro {
		t.Fatalf("soft grace plan = %s, want pro", got)
	}
	if got := EffectivePlan("pro", "expired", daysAgo(10)); got != PlanFree {
		t.Fatalf("friction plan = %s, want free", got)
	}
	if got := EffectivePlan("pro", "expired", daysAgo(30)); got != PlanFree {
		t.Fatalf("lock plan = %s, want free", got)
	}
}

func TestHasFeatureFollowsGracePhase(t *testing.T) {
	// advanced_analytics is a Pro feature, absent from Free.
	if !HasFeature("pro", "expired", FeatureAdvancedAnalytics, daysAgo(2)) {
		t.Fatal("soft grace should retain pro convenience features")
	}
	if HasFeature("pro", "expired", FeatureAdvancedAnalytics, daysAgo(9)) {
		t.Fatal("friction phase should strip convenience features")
	}
	// Manual payment verification survives even at Free (transactions never die).
	if !HasFeature("pro", "expired", FeatureManualPaymentVerification, daysAgo(30)) {
		t.Fatal("manual payment verification must survive lock phase")
	}
}

func TestTransactionsAndCreateGates(t *testing.T) {
	future := time.Now().UTC().Add(24 * time.Hour)
	// Create-new only while truly active.
	if !CanCreateNew("active", &future) || CanCreateNew("expired", daysAgo(1)) {
		t.Fatal("CanCreateNew should be true only when active")
	}
	// Transactions allowed until lock phase.
	if !TransactionsAllowed("expired", daysAgo(10)) {
		t.Fatal("friction phase should still allow transactions")
	}
	if TransactionsAllowed("expired", daysAgo(20)) {
		t.Fatal("lock phase should block new transactions")
	}
}
