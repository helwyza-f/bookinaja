package tenant

import "github.com/lib/pq"

const (
	PermissionBookingsRead    = "bookings.read"
	PermissionBookingsWrite   = "bookings.write"
	PermissionPosManage       = "pos.manage"
	PermissionResourcesRead   = "resources.read"
	PermissionResourcesManage = "resources.manage"
	PermissionFnbRead         = "fnb.read"
	PermissionFnbManage       = "fnb.manage"
	PermissionCustomersRead   = "customers.read"
	PermissionExpensesRead    = "expenses.read"
	PermissionExpensesManage  = "expenses.manage"
)

var AllowedPermissionKeys = map[string]struct{}{
	PermissionBookingsRead:    {},
	PermissionBookingsWrite:   {},
	PermissionPosManage:       {},
	PermissionResourcesRead:   {},
	PermissionResourcesManage: {},
	PermissionFnbRead:         {},
	PermissionFnbManage:       {},
	PermissionCustomersRead:   {},
	PermissionExpensesRead:    {},
	PermissionExpensesManage:  {},
}

func defaultStaffRoles() []StaffRole {
	return []StaffRole{
		{
			Name:        "Frontdesk / Kasir",
			Description: "Role default untuk pegawai yang pegang booking, checkout, dan POS harian di outlet gaming/rental.",
			PermissionKeys: pq.StringArray{
				PermissionBookingsRead,
				PermissionBookingsWrite,
				PermissionPosManage,
				PermissionFnbRead,
				PermissionCustomersRead,
			},
			IsDefault: true,
		},
		{
			Name:        "Operator Shift",
			Description: "Fokus ke operasional lantai: pantau resource, status sesi, dan kebutuhan customer tanpa pegang pengeluaran.",
			PermissionKeys: pq.StringArray{
				PermissionBookingsRead,
				PermissionResourcesRead,
				PermissionResourcesManage,
				PermissionFnbRead,
				PermissionCustomersRead,
			},
			IsDefault: false,
		},
		{
			Name:        "Supervisor",
			Description: "Akses operasional paling lengkap untuk kepala outlet atau PIC shift yang ikut kontrol pengeluaran.",
			PermissionKeys: pq.StringArray{
				PermissionBookingsRead,
				PermissionBookingsWrite,
				PermissionPosManage,
				PermissionResourcesRead,
				PermissionResourcesManage,
				PermissionFnbRead,
				PermissionFnbManage,
				PermissionCustomersRead,
				PermissionExpensesRead,
				PermissionExpensesManage,
			},
			IsDefault: false,
		},
	}
}
