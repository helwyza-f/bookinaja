package tenant

import "github.com/lib/pq"

const (
	PermissionBookingsRead    = "bookings.read"
	PermissionBookingsCreate  = "bookings.create"
	PermissionBookingsUpdate  = "bookings.update"
	PermissionBookingsConfirm = "bookings.confirm"
	PermissionBookingsCancel  = "bookings.cancel"

	PermissionSessionsStart    = "sessions.start"
	PermissionSessionsExtend   = "sessions.extend"
	PermissionSessionsComplete = "sessions.complete"

	PermissionPosRead       = "pos.read"
	PermissionPosOrderAdd   = "pos.order.add"
	PermissionPosCheckout   = "pos.checkout"
	PermissionPosCashSettle = "pos.cash.settle"

	PermissionResourcesRead   = "resources.read"
	PermissionResourcesCreate = "resources.create"
	PermissionResourcesUpdate = "resources.update"
	PermissionResourcesDelete = "resources.delete"
	PermissionDevicesRead     = "devices.read"
	PermissionDevicesClaim    = "devices.claim"
	PermissionDevicesAssign   = "devices.assign"
	PermissionDevicesControl  = "devices.control"
	PermissionDevicesManage   = "devices.manage"

	PermissionFnbRead   = "fnb.read"
	PermissionFnbCreate = "fnb.create"
	PermissionFnbUpdate = "fnb.update"
	PermissionFnbDelete = "fnb.delete"

	PermissionCustomersRead = "customers.read"

	PermissionExpensesRead   = "expenses.read"
	PermissionExpensesCreate = "expenses.create"
	PermissionExpensesUpdate = "expenses.update"
	PermissionExpensesDelete = "expenses.delete"

	PermissionAnalyticsRead = "analytics.read"
	PermissionReceiptsSend  = "receipts.send"
	PermissionReceiptsPrint = "receipts.print"

	PermissionLegacyBookingsWrite   = "bookings.write"
	PermissionLegacyPosManage       = "pos.manage"
	PermissionLegacyResourcesManage = "resources.manage"
	PermissionLegacyFnbManage       = "fnb.manage"
	PermissionLegacyExpensesManage  = "expenses.manage"
)

var AllowedPermissionKeys = map[string]struct{}{
	PermissionBookingsRead:    {},
	PermissionBookingsCreate:  {},
	PermissionBookingsUpdate:  {},
	PermissionBookingsConfirm: {},
	PermissionBookingsCancel:  {},

	PermissionSessionsStart:    {},
	PermissionSessionsExtend:   {},
	PermissionSessionsComplete: {},

	PermissionPosRead:       {},
	PermissionPosOrderAdd:   {},
	PermissionPosCheckout:   {},
	PermissionPosCashSettle: {},

	PermissionResourcesRead:   {},
	PermissionResourcesCreate: {},
	PermissionResourcesUpdate: {},
	PermissionResourcesDelete: {},
	PermissionDevicesRead:     {},
	PermissionDevicesClaim:    {},
	PermissionDevicesAssign:   {},
	PermissionDevicesControl:  {},
	PermissionDevicesManage:   {},

	PermissionFnbRead:   {},
	PermissionFnbCreate: {},
	PermissionFnbUpdate: {},
	PermissionFnbDelete: {},

	PermissionCustomersRead: {},

	PermissionExpensesRead:   {},
	PermissionExpensesCreate: {},
	PermissionExpensesUpdate: {},
	PermissionExpensesDelete: {},

	PermissionAnalyticsRead: {},
	PermissionReceiptsSend:  {},
	PermissionReceiptsPrint: {},

	PermissionLegacyBookingsWrite:   {},
	PermissionLegacyPosManage:       {},
	PermissionLegacyResourcesManage: {},
	PermissionLegacyFnbManage:       {},
	PermissionLegacyExpensesManage:  {},
}

var permissionImplications = map[string][]string{
	PermissionLegacyBookingsWrite: {
		PermissionBookingsRead,
		PermissionBookingsCreate,
		PermissionBookingsUpdate,
		PermissionBookingsConfirm,
		PermissionBookingsCancel,
		PermissionSessionsStart,
		PermissionSessionsExtend,
		PermissionSessionsComplete,
		PermissionPosRead,
		PermissionPosCheckout,
		PermissionPosCashSettle,
		PermissionReceiptsSend,
		PermissionReceiptsPrint,
	},
	PermissionLegacyPosManage: {
		PermissionPosRead,
		PermissionPosOrderAdd,
		PermissionPosCheckout,
		PermissionPosCashSettle,
		PermissionSessionsExtend,
		PermissionReceiptsSend,
		PermissionReceiptsPrint,
	},
	PermissionLegacyResourcesManage: {
		PermissionResourcesRead,
		PermissionResourcesCreate,
		PermissionResourcesUpdate,
		PermissionResourcesDelete,
		PermissionDevicesRead,
		PermissionDevicesClaim,
		PermissionDevicesAssign,
		PermissionDevicesControl,
		PermissionDevicesManage,
	},
	PermissionLegacyFnbManage: {
		PermissionFnbRead,
		PermissionFnbCreate,
		PermissionFnbUpdate,
		PermissionFnbDelete,
	},
	PermissionLegacyExpensesManage: {
		PermissionExpensesRead,
		PermissionExpensesCreate,
		PermissionExpensesUpdate,
		PermissionExpensesDelete,
	},
	PermissionBookingsCreate:  {PermissionBookingsRead},
	PermissionBookingsUpdate:  {PermissionBookingsRead},
	PermissionBookingsConfirm: {PermissionBookingsRead, PermissionBookingsUpdate},
	PermissionBookingsCancel:  {PermissionBookingsRead, PermissionBookingsUpdate},
	PermissionSessionsStart:   {PermissionBookingsRead, PermissionBookingsUpdate, PermissionPosRead},
	PermissionSessionsExtend:  {PermissionBookingsRead, PermissionPosRead},
	PermissionSessionsComplete: {
		PermissionBookingsRead,
		PermissionBookingsUpdate,
		PermissionPosRead,
	},
	PermissionPosOrderAdd:     {PermissionPosRead, PermissionBookingsRead},
	PermissionPosCheckout:     {PermissionPosRead, PermissionBookingsRead},
	PermissionPosCashSettle:   {PermissionPosRead, PermissionBookingsRead, PermissionPosCheckout},
	PermissionResourcesCreate: {PermissionResourcesRead},
	PermissionResourcesUpdate: {PermissionResourcesRead},
	PermissionResourcesDelete: {PermissionResourcesRead},
	PermissionDevicesClaim:    {PermissionDevicesRead},
	PermissionDevicesAssign:   {PermissionDevicesRead, PermissionResourcesRead},
	PermissionDevicesControl:  {PermissionDevicesRead},
	PermissionDevicesManage: {
		PermissionDevicesRead,
		PermissionDevicesClaim,
		PermissionDevicesAssign,
		PermissionDevicesControl,
		PermissionResourcesRead,
	},
	PermissionFnbCreate:      {PermissionFnbRead},
	PermissionFnbUpdate:      {PermissionFnbRead},
	PermissionFnbDelete:      {PermissionFnbRead},
	PermissionExpensesCreate: {PermissionExpensesRead},
	PermissionExpensesUpdate: {PermissionExpensesRead},
	PermissionExpensesDelete: {PermissionExpensesRead},
	PermissionReceiptsSend:   {PermissionBookingsRead, PermissionPosRead},
	PermissionReceiptsPrint:  {PermissionBookingsRead, PermissionPosRead},
	PermissionAnalyticsRead: {
		PermissionBookingsRead,
		PermissionResourcesRead,
		PermissionCustomersRead,
		PermissionExpensesRead,
	},
}

func ExpandPermissionKeys(keys []string) []string {
	visited := map[string]struct{}{}
	queue := make([]string, 0, len(keys))

	for _, key := range keys {
		if _, exists := AllowedPermissionKeys[key]; !exists {
			continue
		}
		if _, exists := visited[key]; exists {
			continue
		}
		visited[key] = struct{}{}
		queue = append(queue, key)
	}

	for index := 0; index < len(queue); index++ {
		current := queue[index]
		for _, implied := range permissionImplications[current] {
			if _, exists := AllowedPermissionKeys[implied]; !exists {
				continue
			}
			if _, exists := visited[implied]; exists {
				continue
			}
			visited[implied] = struct{}{}
			queue = append(queue, implied)
		}
	}

	return queue
}

func defaultStaffRoles() []StaffRole {
	return []StaffRole{
		{
			Name:        "Frontdesk",
			Description: "Fokus menerima booking, konfirmasi jadwal, dan melayani customer yang datang di titik layanan.",
			PermissionKeys: pq.StringArray{
				PermissionBookingsRead,
				PermissionBookingsCreate,
				PermissionBookingsConfirm,
				PermissionCustomersRead,
			},
			IsDefault: true,
		},
		{
			Name:        "Kasir / POS",
			Description: "Untuk staff yang memegang POS, menambah order, checkout, pelunasan cash, dan pengiriman nota.",
			PermissionKeys: pq.StringArray{
				PermissionBookingsRead,
				PermissionPosRead,
				PermissionPosOrderAdd,
				PermissionPosCheckout,
				PermissionPosCashSettle,
				PermissionFnbRead,
				PermissionCustomersRead,
				PermissionReceiptsSend,
				PermissionReceiptsPrint,
			},
			IsDefault: false,
		},
		{
			Name:        "Operator Operasional",
			Description: "Menjalankan sesi atau layanan aktif, memantau resource, dan memastikan operasional berjalan rapi.",
			PermissionKeys: pq.StringArray{
				PermissionBookingsRead,
				PermissionSessionsStart,
				PermissionSessionsExtend,
				PermissionSessionsComplete,
				PermissionPosRead,
				PermissionResourcesRead,
				PermissionResourcesUpdate,
				PermissionDevicesRead,
				PermissionFnbRead,
				PermissionCustomersRead,
			},
			IsDefault: false,
		},
		{
			Name:        "Supervisor Operasional",
			Description: "PIC operasional harian yang mengawasi booking, POS, resource, katalog, dan pengeluaran tim.",
			PermissionKeys: pq.StringArray{
				PermissionBookingsRead,
				PermissionBookingsCreate,
				PermissionBookingsConfirm,
				PermissionBookingsCancel,
				PermissionSessionsStart,
				PermissionSessionsExtend,
				PermissionSessionsComplete,
				PermissionPosRead,
				PermissionPosOrderAdd,
				PermissionPosCheckout,
				PermissionPosCashSettle,
				PermissionResourcesRead,
				PermissionResourcesUpdate,
				PermissionDevicesRead,
				PermissionDevicesAssign,
				PermissionDevicesControl,
				PermissionFnbRead,
				PermissionFnbUpdate,
				PermissionCustomersRead,
				PermissionExpensesRead,
				PermissionExpensesCreate,
				PermissionExpensesUpdate,
				PermissionReceiptsSend,
				PermissionReceiptsPrint,
				PermissionAnalyticsRead,
			},
			IsDefault: false,
		},
		{
			Name:        "Admin Operasional",
			Description: "Level delegasi tertinggi untuk pengelola operasional yang perlu akses hampir penuh ke modul bisnis, katalog, dan analytics.",
			PermissionKeys: pq.StringArray{
				PermissionBookingsRead,
				PermissionBookingsCreate,
				PermissionBookingsUpdate,
				PermissionBookingsConfirm,
				PermissionBookingsCancel,
				PermissionSessionsStart,
				PermissionSessionsExtend,
				PermissionSessionsComplete,
				PermissionPosRead,
				PermissionPosOrderAdd,
				PermissionPosCheckout,
				PermissionPosCashSettle,
				PermissionResourcesRead,
				PermissionResourcesCreate,
				PermissionResourcesUpdate,
				PermissionResourcesDelete,
				PermissionDevicesRead,
				PermissionDevicesClaim,
				PermissionDevicesAssign,
				PermissionDevicesControl,
				PermissionDevicesManage,
				PermissionFnbRead,
				PermissionFnbCreate,
				PermissionFnbUpdate,
				PermissionFnbDelete,
				PermissionCustomersRead,
				PermissionExpensesRead,
				PermissionExpensesCreate,
				PermissionExpensesUpdate,
				PermissionExpensesDelete,
				PermissionReceiptsSend,
				PermissionReceiptsPrint,
				PermissionAnalyticsRead,
			},
			IsDefault: false,
		},
	}
}
