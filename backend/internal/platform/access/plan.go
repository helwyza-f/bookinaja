package access

import (
	"sort"
	"strings"
	"sync"
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
	FeatureAdvancedReceiptBranding   Feature = "advanced_receipt_branding"
	FeatureStaffAccounts             Feature = "staff_accounts"
	FeatureRolePermissions           Feature = "role_permissions"
	FeaturePosWorkflow               Feature = "pos_workflow"
	FeaturePaymentMethodManagement   Feature = "payment_method_management"
	FeatureManualPaymentVerification Feature = "manual_payment_verification"
	FeatureCustomerImport            Feature = "customer_import"
	FeatureWhatsAppBroadcast         Feature = "whatsapp_blast"
	FeaturePricingRulesFlexible      Feature = "pricing_rules_flexible"
	FeatureCrmBasic                  Feature = "crm_basic"
	FeatureAdvancedAnalytics         Feature = "advanced_analytics"
	FeatureMembershipEnabled         Feature = "membership_enabled"
	FeatureMembershipAutoJoin        Feature = "membership_auto_join_enabled"
	FeatureMembershipRewardRedeem    Feature = "membership_reward_redeem_enabled"
	FeatureMembershipAnalytics       Feature = "membership_analytics_enabled"
	FeatureRetentionAnalytics        Feature = "retention_analytics"
	FeatureGrowthAnalytics           Feature = "growth_analytics"
	FeatureMultiOutletEnabled        Feature = "multi_outlet_enabled"
	FeatureAdvancedAutomation        Feature = "advanced_automation_controls"
	FeatureFranchiseVisibility       Feature = "franchise_visibility"
)

var (
	planFeaturesMu sync.RWMutex
	planFeatures   = defaultPlanFeatures()
)

func defaultPlanFeatures() map[BillingPlan]map[Feature]struct{} {
	return map[BillingPlan]map[Feature]struct{}{
		PlanTrial: {
			// Trial sengaja minim, fokus evaluasi flow inti.
		},
		PlanStarter: {
			// Starter = core booking ops only.
		},
		PlanPro: {
			FeatureAdvancedReceiptBranding:   {},
			FeatureStaffAccounts:             {},
			FeatureRolePermissions:           {},
			FeaturePosWorkflow:               {},
			FeaturePaymentMethodManagement:   {},
			FeatureManualPaymentVerification: {},
			FeatureCustomerImport:            {},
			FeatureWhatsAppBroadcast:         {},
			FeaturePricingRulesFlexible:      {},
			FeatureCrmBasic:                  {},
			FeatureAdvancedAnalytics:         {},
		},
		PlanScale: {
			FeatureAdvancedReceiptBranding:   {},
			FeatureStaffAccounts:             {},
			FeatureRolePermissions:           {},
			FeaturePosWorkflow:               {},
			FeaturePaymentMethodManagement:   {},
			FeatureManualPaymentVerification: {},
			FeatureCustomerImport:            {},
			FeatureWhatsAppBroadcast:         {},
			FeaturePricingRulesFlexible:      {},
			FeatureCrmBasic:                  {},
			FeatureAdvancedAnalytics:         {},
			FeatureMembershipEnabled:         {},
			FeatureMembershipAutoJoin:        {},
			FeatureMembershipRewardRedeem:    {},
			FeatureMembershipAnalytics:       {},
			FeatureRetentionAnalytics:        {},
			FeatureGrowthAnalytics:           {},
			FeatureMultiOutletEnabled:        {},
			FeatureAdvancedAutomation:        {},
			FeatureFranchiseVisibility:       {},
		},
	}
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

	planFeaturesMu.RLock()
	defer planFeaturesMu.RUnlock()

	features := planFeatures[normalizedPlan]
	_, ok := features[feature]
	return ok
}

func IsSubscriptionActive(status string, periodEnd *time.Time) bool {
	normalized := NormalizeStatus(status)
	if normalized != StatusActive && normalized != StatusTrial {
		return false
	}
	if periodEnd != nil && periodEnd.Before(time.Now().UTC()) {
		return false
	}
	return true
}

func GetPlanFeatureMatrix() map[string][]string {
	planFeaturesMu.RLock()
	defer planFeaturesMu.RUnlock()
	return cloneFeatureMatrix(planFeatures)
}

func ResolvePlanFeatures(plan string) []string {
	normalizedPlan := NormalizePlan(plan)

	planFeaturesMu.RLock()
	defer planFeaturesMu.RUnlock()

	raw := planFeatures[normalizedPlan]
	out := make([]string, 0, len(raw))
	for feature := range raw {
		out = append(out, string(feature))
	}
	sort.Strings(out)
	return out
}

func SetPlanFeatureMatrix(input map[string][]string) {
	normalized := map[BillingPlan]map[Feature]struct{}{
		PlanTrial:   {},
		PlanStarter: {},
		PlanPro:     {},
		PlanScale:   {},
	}

	for rawPlan, items := range input {
		plan := NormalizePlan(rawPlan)
		if _, exists := normalized[plan]; !exists {
			normalized[plan] = map[Feature]struct{}{}
		}
		for _, rawFeature := range items {
			feature := strings.TrimSpace(rawFeature)
			if feature == "" {
				continue
			}
			normalized[plan][Feature(feature)] = struct{}{}
		}
	}

	planFeaturesMu.Lock()
	planFeatures = normalized
	planFeaturesMu.Unlock()
}

func cloneFeatureMatrix(src map[BillingPlan]map[Feature]struct{}) map[string][]string {
	out := map[string][]string{}
	for _, plan := range []BillingPlan{PlanTrial, PlanStarter, PlanPro, PlanScale} {
		raw := src[plan]
		list := make([]string, 0, len(raw))
		for feature := range raw {
			list = append(list, string(feature))
		}
		sort.Strings(list)
		out[string(plan)] = list
	}
	return out
}
