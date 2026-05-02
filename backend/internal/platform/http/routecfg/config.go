package routecfg

import (
	"github.com/helwiza/backend/internal/auth"
	"github.com/helwiza/backend/internal/billing"
	"github.com/helwiza/backend/internal/customer"
	"github.com/helwiza/backend/internal/expense"
	"github.com/helwiza/backend/internal/fnb"
	midtranssvc "github.com/helwiza/backend/internal/platform/midtrans"
	"github.com/helwiza/backend/internal/platformadmin"
	"github.com/helwiza/backend/internal/reservation"
	"github.com/helwiza/backend/internal/resource"
	"github.com/helwiza/backend/internal/smartdevice"
	"github.com/helwiza/backend/internal/tenant"
	"github.com/jmoiron/sqlx"
)

type Config struct {
	DB                 *sqlx.DB
	TenantHandler      *tenant.Handler
	ResourceHandler    *resource.Handler
	ReservationHandler *reservation.Handler
	CustomerHandler    *customer.Handler
	AuthHandler        *auth.Handler
	FnbHandler         *fnb.Handler
	ExpenseHandler     *expense.Handler
	BillingHandler     *billing.Handler
	PlatformHandler    *platformadmin.Handler
	MidtransHandler    *midtranssvc.Handler
	SmartDeviceHandler *smartdevice.Handler
}
