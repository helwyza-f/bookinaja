// Package audit menyediakan penulis log aktivitas terpusat ke tabel
// tenant_audit_logs. Dipakai lintas modul (reservation, sales, expense, tenant)
// agar feed "Log aktivitas" menampilkan siapa melakukan apa — termasuk aksi
// operasional staff, bukan hanya perubahan area owner.
package audit

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Log menulis satu entri audit. Fire-and-forget: kegagalan audit tidak boleh
// menggagalkan operasi utama, jadi error diabaikan (best-effort). actorUserID
// boleh nil (mis. aksi oleh sistem / token account murni). Nama actor diambil
// saat baca lewat JOIN users, jadi cukup simpan actor_user_id di sini.
func Log(
	ctx context.Context,
	db sqlx.ExecerContext,
	tenantID uuid.UUID,
	actorUserID *uuid.UUID,
	action, resourceType string,
	resourceID *uuid.UUID,
	metadata map[string]any,
) {
	if db == nil {
		return
	}
	payload := []byte("{}")
	if metadata != nil {
		if b, err := json.Marshal(metadata); err == nil {
			payload = b
		}
	}
	_, _ = db.ExecContext(ctx, `
		INSERT INTO tenant_audit_logs
			(id, tenant_id, actor_user_id, action, resource_type, resource_id, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
		uuid.New(), tenantID, actorUserID, action, resourceType, resourceID, payload,
	)
}
