package tenant

import "testing"

func TestManualMethodUsable(t *testing.T) {
	cases := []struct {
		name string
		m    TenantPaymentMethod
		want bool
	}{
		{
			name: "bank transfer lengkap & aktif",
			m: TenantPaymentMethod{
				Code:     "bank_transfer",
				IsActive: true,
				Metadata: JSONB(`{"bank_name":"BCA","account_name":"Budi","account_number":"123"}`),
			},
			want: true,
		},
		{
			name: "bank transfer aktif tapi rekening kosong",
			m: TenantPaymentMethod{
				Code:     "bank_transfer",
				IsActive: true,
				Metadata: JSONB(`{"bank_name":"BCA"}`),
			},
			want: false,
		},
		{
			name: "bank transfer lengkap tapi nonaktif",
			m: TenantPaymentMethod{
				Code:     "bank_transfer",
				IsActive: false,
				Metadata: JSONB(`{"bank_name":"BCA","account_name":"Budi","account_number":"123"}`),
			},
			want: false,
		},
		{
			name: "qris statis dengan gambar & aktif",
			m: TenantPaymentMethod{
				Code:     "qris_static",
				IsActive: true,
				Metadata: JSONB(`{"qr_image_url":"https://x/y.png"}`),
			},
			want: true,
		},
		{
			name: "qris statis aktif tanpa gambar",
			m: TenantPaymentMethod{
				Code:     "qris_static",
				IsActive: true,
				Metadata: JSONB(`{}`),
			},
			want: false,
		},
		{
			name: "cash tidak dihitung online",
			m:    TenantPaymentMethod{Code: "cash", IsActive: true},
			want: false,
		},
		{
			name: "gateway auto bukan manual",
			m:    TenantPaymentMethod{Code: "midtrans", IsActive: true},
			want: false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := manualMethodUsable(tc.m); got != tc.want {
				t.Fatalf("manualMethodUsable(%s) = %v, want %v", tc.name, got, tc.want)
			}
		})
	}
}
