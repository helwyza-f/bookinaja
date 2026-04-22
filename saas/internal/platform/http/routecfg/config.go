package routecfg

import (
	"github.com/helwiza/saas/internal/auth"
	"github.com/helwiza/saas/internal/billing"
	"github.com/helwiza/saas/internal/customer"
	"github.com/helwiza/saas/internal/fnb"
	"github.com/helwiza/saas/internal/platformadmin"
	"github.com/helwiza/saas/internal/reservation"
	"github.com/helwiza/saas/internal/resource"
	"github.com/helwiza/saas/internal/tenant"
)

type Config struct {
	TenantHandler      *tenant.Handler
	ResourceHandler    *resource.Handler
	ReservationHandler *reservation.Handler
	CustomerHandler    *customer.Handler
	AuthHandler        *auth.Handler
	FnbHandler         *fnb.Handler
	BillingHandler     *billing.Handler
	PlatformHandler    *platformadmin.Handler
}
