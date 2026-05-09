package resource

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
)

type Repository struct {
	db  *sqlx.DB
	rdb *redis.Client
}

func NewRepository(db *sqlx.DB, rdb *redis.Client) *Repository {
	return &Repository{
		db:  db,
		rdb: rdb,
	}
}

// --- REDIS HELPERS ---

func (r *Repository) getKatalogCacheKey(tenantID uuid.UUID) string {
	return fmt.Sprintf("katalog_resources:%s", tenantID.String())
}

// InvalidateTenantCache menghapus semua cache terkait tenant tersebut
func (r *Repository) InvalidateTenantCache(ctx context.Context, tenantID uuid.UUID) {
	// 1. Hapus Cache Katalog Granular
	r.rdb.Del(ctx, r.getKatalogCacheKey(tenantID))

	// 2. Hapus Cache Landing Full (Legacy/Backup)
	var slug string
	err := r.db.GetContext(ctx, &slug, "SELECT slug FROM tenants WHERE id = $1", tenantID)
	if err == nil {
		landingKey := fmt.Sprintf("landing:full:%s", strings.ToLower(strings.TrimSpace(slug)))
		r.rdb.Del(ctx, landingKey)
	}

	fmt.Printf("[CACHE INVALIDATED] Cleared resource cache for tenant: %s\n", tenantID)
}

// --- CORE REPOSITORY LOGIC ---

// ListByTenant menggunakan Redis Cache-Aside
func (r *Repository) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]Resource, string, string, error) {
	cacheKey := r.getKatalogCacheKey(tenantID)

	// 1. HIT: Cek Redis
	val, err := r.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var cachedResult struct {
			Resources []Resource `json:"resources"`
			Category  string     `json:"category"`
			Type      string     `json:"type"`
		}
		if err := json.Unmarshal([]byte(val), &cachedResult); err == nil {
			fmt.Printf("[CACHE HIT] Serving granular resources for: %s\n", tenantID)
			return cachedResult.Resources, cachedResult.Category, cachedResult.Type, nil
		}
	}

	// 2. MISS: Searching Postgres
	fmt.Printf("[CACHE MISS] Querying DB resources for: %s\n", tenantID)

	var resources []Resource
	var businessCategory string
	var businessType string

	// Ambil info tenant
	err = r.db.QueryRowxContext(ctx,
		`SELECT business_category, business_type FROM tenants WHERE id = $1`,
		tenantID).Scan(&businessCategory, &businessType)
	if err != nil {
		return nil, "", "", err
	}

	// Ambil semua resource
	err = r.db.SelectContext(ctx, &resources,
		`SELECT * FROM resources WHERE tenant_id = $1 AND status != 'deleted' ORDER BY created_at DESC`,
		tenantID)
	if err != nil {
		return nil, "", "", err
	}

	emptyJSON := json.RawMessage("{}")

	// Eager Loading items
	for i := range resources {
		if resources[i].Metadata == nil {
			resources[i].Metadata = &emptyJSON
		}

		var items []ResourceItem
		err := r.db.SelectContext(ctx, &items,
			`SELECT * FROM resource_items WHERE resource_id = $1 ORDER BY item_type ASC, is_default DESC, price ASC`,
			resources[i].ID)

		if err == nil {
			for j := range items {
				if items[j].Metadata == nil {
					items[j].Metadata = &emptyJSON
				}
			}
			resources[i].Items = items
		}
	}

	if len(resources) > 0 {
		deviceMap, err := r.loadDeviceSummaries(ctx, resourceIDs(resources))
		if err == nil {
			for i := range resources {
				resources[i].SmartDeviceSummary = deviceMap[resources[i].ID]
			}
		}
	}

	// 3. WRITE: Simpan ke Redis (TTL 12 Jam)
	// Kita simpan dalam satu object bungkus
	resultToCache := struct {
		Resources []Resource `json:"resources"`
		Category  string     `json:"category"`
		Type      string     `json:"type"`
	}{
		Resources: resources,
		Category:  businessCategory,
		Type:      businessType,
	}

	jsonData, _ := json.Marshal(resultToCache)
	r.rdb.Set(ctx, cacheKey, jsonData, 12*time.Hour)

	return resources, businessCategory, businessType, nil
}

func (r *Repository) ListSummariesByTenant(ctx context.Context, tenantID uuid.UUID) ([]ResourceSummary, error) {
	var items []ResourceSummary
	err := r.db.SelectContext(ctx, &items, `
		SELECT id, name, status, category, operating_mode
		FROM resources
		WHERE tenant_id = $1 AND status != 'deleted'
		ORDER BY created_at DESC
	`, tenantID)
	return items, err
}

func (r *Repository) ListAdminByTenant(ctx context.Context, tenantID uuid.UUID) ([]ResourceListItem, error) {
	var items []ResourceListItem
	err := r.db.SelectContext(ctx, &items, `
		SELECT
			r.id,
			r.name,
			r.category,
			r.status,
			r.operating_mode,
			COALESCE(r.image_url, '') AS image_url,
			COALESCE(r.description, '') AS description,
			COUNT(ri.id) FILTER (WHERE ri.item_type IN ('main_option', 'main', 'console_option')) AS main_option_count,
			COUNT(ri.id) FILTER (WHERE ri.item_type = 'add_on') AS addon_count
		FROM resources r
		LEFT JOIN resource_items ri ON ri.resource_id = r.id
		WHERE r.tenant_id = $1 AND r.status != 'deleted'
		GROUP BY r.id, r.name, r.category, r.status, r.operating_mode, r.image_url, r.description, r.created_at
		ORDER BY r.created_at DESC
	`, tenantID)
	return items, err
}

func (r *Repository) ListPricingCatalogByTenant(ctx context.Context, tenantID uuid.UUID) ([]ResourcePricingCatalogItem, error) {
	type row struct {
		ResourceID    uuid.UUID `db:"resource_id"`
		ResourceName  string    `db:"resource_name"`
		Category      string    `db:"category"`
		Status        string    `db:"status"`
		OperatingMode string    `db:"operating_mode"`
		ItemID        uuid.UUID `db:"item_id"`
		ItemName      string    `db:"item_name"`
		Price         float64   `db:"price"`
		PriceUnit     string    `db:"price_unit"`
		UnitDuration  int       `db:"unit_duration"`
		IsDefault     bool      `db:"is_default"`
	}

	var rows []row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT
			r.id AS resource_id,
			r.name AS resource_name,
			r.category,
			r.status,
			r.operating_mode,
			ri.id AS item_id,
			ri.name AS item_name,
			ri.price,
			ri.price_unit,
			ri.unit_duration,
			ri.is_default
		FROM resources r
		JOIN resource_items ri ON ri.resource_id = r.id
		WHERE r.tenant_id = $1
		  AND r.status != 'deleted'
		  AND ri.item_type IN ('main_option', 'main', 'console_option')
		ORDER BY r.created_at DESC, ri.is_default DESC, ri.price ASC
	`, tenantID)
	if err != nil {
		return nil, err
	}

	items := make([]ResourcePricingCatalogItem, 0)
	indexByResource := make(map[uuid.UUID]int)
	for _, row := range rows {
		idx, exists := indexByResource[row.ResourceID]
		if !exists {
			items = append(items, ResourcePricingCatalogItem{
				ResourceID:    row.ResourceID,
				ResourceName:  row.ResourceName,
				Category:      row.Category,
				Status:        row.Status,
				OperatingMode: row.OperatingMode,
				MainItems:     []ResourcePricingItem{},
			})
			idx = len(items) - 1
			indexByResource[row.ResourceID] = idx
		}
		items[idx].MainItems = append(items[idx].MainItems, ResourcePricingItem{
			ID:           row.ItemID,
			Name:         row.ItemName,
			Price:        row.Price,
			PriceUnit:    row.PriceUnit,
			UnitDuration: row.UnitDuration,
			IsDefault:    row.IsDefault,
		})
	}

	return items, nil
}

func (r *Repository) ListAddonCatalogByTenant(ctx context.Context, tenantID uuid.UUID) ([]ResourceAddonCatalogItem, error) {
	type row struct {
		ResourceID    uuid.UUID        `db:"resource_id"`
		ResourceName  string           `db:"resource_name"`
		Category      string           `db:"category"`
		Status        string           `db:"status"`
		OperatingMode string           `db:"operating_mode"`
		ItemID        uuid.UUID        `db:"item_id"`
		ItemName      string           `db:"item_name"`
		Price         float64          `db:"price"`
		PriceUnit     string           `db:"price_unit"`
		UnitDuration  int              `db:"unit_duration"`
		ItemType      string           `db:"item_type"`
		IsDefault     bool             `db:"is_default"`
		Metadata      *json.RawMessage `db:"metadata"`
	}

	var rows []row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT
			r.id AS resource_id,
			r.name AS resource_name,
			r.category,
			r.status,
			r.operating_mode,
			ri.id AS item_id,
			ri.name AS item_name,
			ri.price,
			ri.price_unit,
			ri.unit_duration,
			ri.item_type,
			ri.is_default,
			ri.metadata
		FROM resources r
		JOIN resource_items ri ON ri.resource_id = r.id
		WHERE r.tenant_id = $1
		  AND r.status != 'deleted'
		  AND ri.item_type = 'add_on'
		ORDER BY r.created_at DESC, ri.price ASC
	`, tenantID)
	if err != nil {
		return nil, err
	}

	emptyJSON := json.RawMessage("{}")
	items := make([]ResourceAddonCatalogItem, 0)
	indexByResource := make(map[uuid.UUID]int)
	for _, row := range rows {
		idx, exists := indexByResource[row.ResourceID]
		if !exists {
			items = append(items, ResourceAddonCatalogItem{
				ResourceID:    row.ResourceID,
				ResourceName:  row.ResourceName,
				Category:      row.Category,
				Status:        row.Status,
				OperatingMode: row.OperatingMode,
				Addons:        []ResourceItem{},
			})
			idx = len(items) - 1
			indexByResource[row.ResourceID] = idx
		}
		metadata := row.Metadata
		if metadata == nil {
			metadata = &emptyJSON
		}
		items[idx].Addons = append(items[idx].Addons, ResourceItem{
			ID:           row.ItemID,
			ResourceID:   row.ResourceID,
			Name:         row.ItemName,
			Price:        row.Price,
			PriceUnit:    row.PriceUnit,
			UnitDuration: row.UnitDuration,
			ItemType:     row.ItemType,
			IsDefault:    row.IsDefault,
			Metadata:     metadata,
		})
	}

	return items, nil
}

func (r *Repository) ListDeviceMapByTenant(ctx context.Context, tenantID uuid.UUID) ([]ResourceDeviceMapItem, error) {
	var items []ResourceDeviceMapItem
	err := r.db.SelectContext(ctx, &items, `
		SELECT
			r.id AS resource_id,
			r.name AS resource_name,
			r.category,
			r.status,
			r.operating_mode,
			sd.id AS device_uuid,
			COALESCE(sd.device_id, '') AS device_id,
			COALESCE(sd.device_name, '') AS device_name,
			COALESCE(sd.pairing_status, '') AS pairing_status,
			COALESCE(sd.connection_status, '') AS connection_status,
			COALESCE(sd.is_enabled, false) AS is_enabled,
			sd.last_seen_at,
			COALESCE(sd.firmware_version, '') AS firmware_version
		FROM resources r
		LEFT JOIN smart_devices sd
			ON sd.resource_id = r.id
		   AND sd.tenant_id = r.tenant_id
		WHERE r.tenant_id = $1 AND r.status != 'deleted'
		ORDER BY r.created_at DESC, sd.updated_at DESC NULLS LAST
	`, tenantID)
	return items, err
}

// Create menyisipkan resource baru
func (r *Repository) Create(ctx context.Context, res Resource) (*Resource, error) {
	query := `
        INSERT INTO resources (
            id, tenant_id, name, category, description, 
            operating_mode, image_url, gallery, status, metadata
        ) 
        VALUES (
            :id, :tenant_id, :name, :category, :description, 
            :operating_mode, :image_url, :gallery, :status, :metadata
        )`
	_, err := r.db.NamedExecContext(ctx, query, res)
	// Cache akan di-invalidate di level Service
	return &res, err
}

// Update memperbarui data utama resource
func (r *Repository) Update(ctx context.Context, res Resource) error {
	query := `
        UPDATE resources 
        SET 
            name = :name, 
            category = :category, 
            description = :description, 
            operating_mode = :operating_mode,
            image_url = :image_url, 
            gallery = :gallery, 
            status = :status, 
            metadata = :metadata 
        WHERE id = :id AND tenant_id = :tenant_id`
	_, err := r.db.NamedExecContext(ctx, query, res)
	return err
}

// CreateItem menyisipkan opsi harga
func (r *Repository) CreateItem(ctx context.Context, item ResourceItem) (*ResourceItem, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if item.IsDefault {
		_, err = tx.ExecContext(ctx, `UPDATE resource_items SET is_default = false WHERE resource_id = $1 AND item_type = $2`, item.ResourceID, item.ItemType)
		if err != nil {
			return nil, err
		}
	}

	queryInsert := `
        INSERT INTO resource_items (
            id, resource_id, name, price, price_unit, 
            unit_duration, item_type, is_default, metadata
        ) 
        VALUES (
            :id, :resource_id, :name, :price, :price_unit, 
            :unit_duration, :item_type, :is_default, :metadata
        )`

	_, err = tx.NamedExecContext(ctx, queryInsert, item)
	if err != nil {
		return nil, err
	}

	return &item, tx.Commit()
}

// UpdateItem memperbarui detail item
func (r *Repository) UpdateItem(ctx context.Context, itemID uuid.UUID, item ResourceItem) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if item.IsDefault {
		_, err = tx.ExecContext(ctx, `UPDATE resource_items SET is_default = false WHERE resource_id = $1 AND item_type = $2`, item.ResourceID, item.ItemType)
		if err != nil {
			return err
		}
	}

	query := `
        UPDATE resource_items 
        SET 
            name = :name, 
            price = :price, 
            price_unit = :price_unit, 
            unit_duration = :unit_duration, 
            is_default = :is_default, 
            metadata = :metadata 
        WHERE id = :id`

	item.ID = itemID
	_, err = tx.NamedExecContext(ctx, query, item)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *Repository) GetItemByID(ctx context.Context, itemID uuid.UUID) (*ResourceItem, error) {
	var item ResourceItem
	err := r.db.GetContext(ctx, &item, `SELECT * FROM resource_items WHERE id = $1 LIMIT 1`, itemID)
	if err != nil {
		return nil, err
	}
	emptyJSON := json.RawMessage("{}")
	if item.Metadata == nil {
		item.Metadata = &emptyJSON
	}
	return &item, nil
}

// GetOneWithItems (Detail Single Resource)
func (r *Repository) GetOneWithItems(ctx context.Context, id uuid.UUID) (*Resource, error) {
	var res Resource
	err := r.db.GetContext(ctx, &res, `SELECT * FROM resources WHERE id = $1`, id)
	if err != nil {
		return nil, err
	}

	emptyJSON := json.RawMessage("{}")
	if res.Metadata == nil {
		res.Metadata = &emptyJSON
	}

	var items []ResourceItem
	err = r.db.SelectContext(ctx, &items, `
        SELECT * FROM resource_items 
        WHERE resource_id = $1 
        ORDER BY item_type ASC, is_default DESC, price ASC`, id)

	if err == nil {
		for i := range items {
			if items[i].Metadata == nil {
				items[i].Metadata = &emptyJSON
			}
		}
		res.Items = items
	}

	deviceMap, err := r.loadDeviceSummaries(ctx, []uuid.UUID{id})
	if err == nil {
		res.SmartDeviceSummary = deviceMap[id]
	}

	return &res, nil
}

func (r *Repository) loadDeviceSummaries(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]*ResourceDeviceState, error) {
	if len(ids) == 0 {
		return map[uuid.UUID]*ResourceDeviceState{}, nil
	}
	query, args, err := sqlx.In(`
		SELECT resource_id, id, device_id, device_name, pairing_status, connection_status, is_enabled, last_seen_at, firmware_version
		FROM smart_devices
		WHERE resource_id IN (?) AND tenant_id IS NOT NULL
		ORDER BY updated_at DESC`, ids)
	if err != nil {
		return nil, err
	}
	query = r.db.Rebind(query)
	type row struct {
		ResourceID uuid.UUID `db:"resource_id"`
		ResourceDeviceState
	}
	var rows []row
	if err := r.db.SelectContext(ctx, &rows, query, args...); err != nil {
		return nil, err
	}
	result := make(map[uuid.UUID]*ResourceDeviceState, len(rows))
	for _, row := range rows {
		if _, exists := result[row.ResourceID]; exists {
			continue
		}
		state := row.ResourceDeviceState
		result[row.ResourceID] = &state
	}
	return result, nil
}

func resourceIDs(resources []Resource) []uuid.UUID {
	ids := make([]uuid.UUID, 0, len(resources))
	for _, item := range resources {
		ids = append(ids, item.ID)
	}
	return ids
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM resources WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *Repository) DeleteItem(ctx context.Context, itemID uuid.UUID) error {
	query := `DELETE FROM resource_items WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, itemID)
	return err
}

func (r *Repository) GetTenantIDByItemID(ctx context.Context, itemID uuid.UUID) (*uuid.UUID, error) {
	var tenantID uuid.UUID
	err := r.db.GetContext(ctx, &tenantID, `
		SELECT r.tenant_id
		FROM resource_items ri
		JOIN resources r ON r.id = ri.resource_id
		WHERE ri.id = $1
		LIMIT 1`, itemID)
	if err != nil {
		return nil, err
	}
	return &tenantID, nil
}

func (r *Repository) ListItemsByResource(ctx context.Context, resourceID uuid.UUID) ([]ResourceItem, error) {
	var items []ResourceItem
	query := `SELECT * FROM resource_items WHERE resource_id = $1 ORDER BY item_type ASC, is_default DESC, price ASC`
	err := r.db.SelectContext(ctx, &items, query, resourceID)
	return items, err
}
