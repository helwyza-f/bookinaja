package tenant

import (
	"context"
	"regexp"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

func TestUpsertDepositSettingsRejectsForeignResource(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New() error = %v", err)
	}
	t.Cleanup(func() {
		_ = db.Close()
	})

	repo := NewRepository(sqlx.NewDb(db, "sqlmock"), nil)
	tenantID := uuid.New()
	resourceID := uuid.New()

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`
		INSERT INTO tenant_deposit_settings (tenant_id, dp_enabled, dp_percentage, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		ON CONFLICT (tenant_id) DO UPDATE
		SET dp_enabled = EXCLUDED.dp_enabled,
			dp_percentage = EXCLUDED.dp_percentage,
			updated_at = NOW()`)).
		WithArgs(tenantID, true, 40.0).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta(`DELETE FROM tenant_resource_deposit_overrides WHERE tenant_id = $1`)).
		WithArgs(tenantID).
		WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectQuery(regexp.QuoteMeta(`
			SELECT EXISTS(
				SELECT 1
				FROM resources
				WHERE id = $1 AND tenant_id = $2
			)`)).
		WithArgs(resourceID, tenantID).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))
	mock.ExpectRollback()

	_, err = repo.UpsertDepositSettings(context.Background(), tenantID, TenantDepositSettingUpdateReq{
		DPEnabled:    true,
		DPPercentage: 40,
		ResourceConfigs: []ResourceDepositOverrideInput{
			{
				ResourceID:   resourceID.String(),
				OverrideDP:   true,
				DPEnabled:    true,
				DPPercentage: 50,
			},
		},
	})
	if err == nil {
		t.Fatal("UpsertDepositSettings() error = nil, want foreign resource validation error")
	}
	if !strings.Contains(err.Error(), "resource override deposit tidak valid") {
		t.Fatalf("error = %q, want foreign resource validation error", err.Error())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("ExpectationsWereMet() error = %v", err)
	}
}
