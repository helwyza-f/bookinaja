package access

import (
	"strings"
	"time"
)

type BillingPlan string

const (
	PlanTrial   BillingPlan = "trial"
	PlanStarter BillingPlan = "starter"
	PlanPro     BillingPlan = "pro"
	PlanScale   BillingPlan = "scale"
)

type SubscriptionStatus string

const (
	StatusTrial     SubscriptionStatus = "trial"
	StatusActive    SubscriptionStatus = "active"
	StatusInactive  SubscriptionStatus = "inactive"
	StatusExpired   SubscriptionStatus = "expired"
	StatusSuspended SubscriptionStatus = "suspended"
	StatusUnknown   SubscriptionStatus = "unknown"
)

type Feature string

const (
	FeatureAdvancedReceiptBranding Feature = "advanced_receipt_branding"
	FeatureStaffAccounts           Feature = "staff_accounts"
	FeatureAdvancedAnalytics       Feature = "advanced_analytics"
	FeatureWhatsAppBroadcast       Feature = "whatsapp_broadcast"
	FeatureFnbReports              Feature = "fnb_reports"
	FeatureMembership              Feature = "membership"
)

var planFeatures = map[BillingPlan]map[Feature]struct{}{
	PlanTrial:   {},
	PlanStarter: {},
	PlanPro: {
		FeatureAdvancedReceiptBranding: {},
		FeatureStaffAccounts:           {},
		FeatureAdvancedAnalytics:       {},
		FeatureWhatsAppBroadcast:       {},
		FeatureFnbReports:              {},
	},
	PlanScale: {
		FeatureAdvancedReceiptBranding: {},
		FeatureStaffAccounts:           {},
		FeatureAdvancedAnalytics:       {},
		FeatureWhatsAppBroadcast:       {},
		FeatureFnbReports:              {},
		FeatureMembership:              {},
	},
}

func NormalizePlan(value string) BillingPlan {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case string(PlanTrial):
		return PlanTrial
	case string(PlanPro):
		return PlanPro
	case string(PlanScale):
		return PlanScale
	default:
		return PlanStarter
	}
}

func NormalizeStatus(value string) SubscriptionStatus {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case string(StatusTrial):
		return StatusTrial
	case string(StatusActive):
		return StatusActive
	case string(StatusInactive):
		return StatusInactive
	case string(StatusExpired):
		return StatusExpired
	case string(StatusSuspended):
		return StatusSuspended
	default:
		return StatusUnknown
	}
}

func HasFeature(plan, status string, feature Feature, periodEnd *time.Time) bool {
	if !IsSubscriptionActive(status, periodEnd) {
		return false
	}
	normalizedPlan := NormalizePlan(plan)
	features := planFeatures[normalizedPlan]
	_, ok := features[feature]
	return ok
}

func IsSubscriptionActive(status string, periodEnd *time.Time) bool {
	if NormalizeStatus(status) != StatusActive {
		return false
	}
	if periodEnd != nil && periodEnd.Before(time.Now().UTC()) {
		return false
	}
	return true
}
